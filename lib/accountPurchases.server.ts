import { FieldValue, type DocumentData, type DocumentReference } from 'firebase-admin/firestore';
import {
  ACCOUNT_PURCHASE_PRODUCTS,
  getStoredTickets,
  isAccountPurchaseProduct,
  type AccountPurchaseProduct,
} from '@/lib/accountPurchaseProducts';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';
import type { UserTicket } from '@/lib/firebase/types';

type StripeCheckoutSession = {
  id?: string;
  client_reference_id?: string | null;
  customer?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
  mode?: string;
  payment_status?: string;
  status?: string | null;
  subscription?: string | { id?: string } | null;
};

type StripeSubscription = {
  id?: string;
  customer?: string | { id?: string } | null;
  metadata?: Record<string, string> | null;
  status?: string;
  current_period_end?: number;
};

type StripeInvoice = {
  id?: string;
  billing_reason?: string | null;
  subscription?: string | { id?: string } | null;
  parent?: {
    subscription_details?: {
      subscription?: string | { id?: string } | null;
    } | null;
  } | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(['active', 'trialing']);

function objectId(value: string | { id?: string } | null | undefined) {
  if (typeof value === 'string') return value;
  return value?.id || null;
}

function productTicket(product: AccountPurchaseProduct) {
  const definition = ACCOUNT_PURCHASE_PRODUCTS[product];
  return 'ticket' in definition ? definition.ticket : null;
}

function rawTickets(data: DocumentData) {
  return Array.isArray(data.tickets)
    ? data.tickets.filter((ticket: unknown): ticket is UserTicket => ticket === 'blue' || ticket === 'night')
    : [];
}

function addTicket(tickets: UserTicket[], ticket: UserTicket) {
  return tickets.includes(ticket) ? tickets : [...tickets, ticket];
}

function removeTicket(tickets: UserTicket[], ticket: UserTicket) {
  return tickets.filter((storedTicket) => storedTicket !== ticket);
}

function eventReference(eventId: string) {
  return getFirebaseAdminServices().db.collection('stripePurchaseEvents').doc(eventId);
}

export async function applyDebugPurchase(uid: string, product: AccountPurchaseProduct) {
  const { db } = getFirebaseAdminServices();
  const userRef = db.collection('users').doc(uid);
  const definition = ACCOUNT_PURCHASE_PRODUCTS[product];

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(userRef);
    const data = snapshot.data();
    if (!snapshot.exists || !data || data.role !== 'user') throw new Error('USER_NOT_FOUND');

    const ticket = productTicket(product);
    if (ticket && getStoredTickets(data).includes(ticket)) throw new Error('ALREADY_OWNED');

    const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (definition.coinAmount > 0) update.coins = FieldValue.increment(definition.coinAmount);
    if (ticket) update.tickets = addTicket(rawTickets(data), ticket);
    transaction.update(userRef, update);
  });
}

async function findSubscriptionOwner(subscriptionId: string) {
  const { db } = getFirebaseAdminServices();
  for (const ticket of ['blue', 'night'] as const) {
    const snapshot = await db
      .collection('users')
      .where(`stripeSubscriptions.${ticket}.subscriptionId`, '==', subscriptionId)
      .limit(1)
      .get();
    const user = snapshot.docs[0];
    if (user) return { userRef: user.ref, ticket };
  }
  return null;
}

async function runIdempotentUserUpdate(
  eventId: string,
  userRef: DocumentReference,
  createUpdate: (data: DocumentData) => Record<string, unknown>,
) {
  const { db } = getFirebaseAdminServices();
  const processedEventRef = eventReference(eventId);

  await db.runTransaction(async (transaction) => {
    const [eventSnapshot, userSnapshot] = await Promise.all([
      transaction.get(processedEventRef),
      transaction.get(userRef),
    ]);
    if (eventSnapshot.exists) return;
    const data = userSnapshot.data();
    if (!userSnapshot.exists || !data) throw new Error('USER_NOT_FOUND');

    transaction.update(userRef, createUpdate(data));
    transaction.create(processedEventRef, {
      userId: userRef.id,
      processedAt: FieldValue.serverTimestamp(),
    });
  });
}

export async function handleAccountCheckoutCompleted(eventId: string, session: StripeCheckoutSession) {
  if (session.metadata?.kind !== 'account_purchase') return;
  if (!isAccountPurchaseProduct(session.metadata.product)) return;
  if (session.status !== 'complete') return;
  if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return;

  const uid = session.client_reference_id || session.metadata.uid;
  if (!uid) return;
  const product = session.metadata.product;
  const definition = ACCOUNT_PURCHASE_PRODUCTS[product];
  const ticket = productTicket(product);
  const customerId = objectId(session.customer);
  const subscriptionId = objectId(session.subscription);
  const { db } = getFirebaseAdminServices();

  await runIdempotentUserUpdate(eventId, db.collection('users').doc(uid), (data) => {
    const update: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (customerId) update.stripeCustomerId = customerId;
    if (definition.coinAmount > 0) update.coins = FieldValue.increment(definition.coinAmount);
    if (ticket) {
      update.tickets = addTicket(rawTickets(data), ticket);
      update[`stripeSubscriptions.${ticket}`] = {
        subscriptionId,
        customerId,
        status: 'active',
        updatedAt: FieldValue.serverTimestamp(),
      };
    }
    return update;
  });
}

export async function handleAccountSubscriptionChanged(eventId: string, subscription: StripeSubscription) {
  if (!subscription.id || subscription.metadata?.kind !== 'account_purchase') return;
  if (!isAccountPurchaseProduct(subscription.metadata.product)) return;
  const ticket = productTicket(subscription.metadata.product);
  const uid = subscription.metadata.uid;
  if (!ticket || !uid) return;

  const customerId = objectId(subscription.customer);
  const active = ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status || '');
  const { db } = getFirebaseAdminServices();
  await runIdempotentUserUpdate(eventId, db.collection('users').doc(uid), (data) => ({
    tickets: active ? addTicket(rawTickets(data), ticket) : removeTicket(rawTickets(data), ticket),
    [`stripeSubscriptions.${ticket}`]: {
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status || 'unknown',
      currentPeriodEnd: subscription.current_period_end || null,
      updatedAt: FieldValue.serverTimestamp(),
    },
    updatedAt: FieldValue.serverTimestamp(),
  }));
}

function invoiceSubscriptionId(invoice: StripeInvoice) {
  return objectId(invoice.subscription) || objectId(invoice.parent?.subscription_details?.subscription);
}

export async function handleAccountInvoice(eventId: string, invoice: StripeInvoice, paid: boolean) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  const owner = await findSubscriptionOwner(subscriptionId);
  if (!owner) return;

  await runIdempotentUserUpdate(eventId, owner.userRef, (data) => {
    const storedSubscription = data.stripeSubscriptions?.[owner.ticket] || {};
    const update: Record<string, unknown> = {
      tickets: paid ? addTicket(rawTickets(data), owner.ticket) : removeTicket(rawTickets(data), owner.ticket),
      [`stripeSubscriptions.${owner.ticket}`]: {
        ...storedSubscription,
        subscriptionId,
        status: paid ? 'active' : 'past_due',
        updatedAt: FieldValue.serverTimestamp(),
      },
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (paid && owner.ticket === 'blue' && invoice.billing_reason === 'subscription_cycle') {
      update.coins = FieldValue.increment(30);
    }
    return update;
  });
}

export type { StripeCheckoutSession, StripeInvoice, StripeSubscription };
