import { NextResponse } from 'next/server';
import {
  handleAccountCheckoutCompleted,
  handleAccountInvoice,
  handleAccountSubscriptionChanged,
  type StripeCheckoutSession,
  type StripeInvoice,
  type StripeSubscription,
} from '@/lib/accountPurchases.server';
import { isValidStripeSignature } from '@/lib/stripeWebhook';

export const runtime = 'nodejs';

type StripeWebhookEvent = {
  id?: string;
  type?: string;
  data?: { object?: unknown };
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_PURCHASE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[account/webhook] STRIPE_PURCHASE_WEBHOOK_SECRET が設定されていません。');
    return jsonError('Webhook is not configured.', 500);
  }

  const signatureHeader = request.headers.get('stripe-signature');
  if (!signatureHeader) return jsonError('Missing Stripe signature.', 400);
  const payload = await request.text();
  if (!isValidStripeSignature(payload, signatureHeader, webhookSecret)) {
    return jsonError('Invalid Stripe signature.', 400);
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return jsonError('Invalid JSON payload.', 400);
  }
  if (!event.id || !event.type || !event.data?.object || typeof event.data.object !== 'object') {
    return jsonError('Invalid Stripe event.', 400);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      await handleAccountCheckoutCompleted(event.id, event.data.object as StripeCheckoutSession);
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      await handleAccountSubscriptionChanged(event.id, event.data.object as StripeSubscription);
    } else if (event.type === 'invoice.paid') {
      await handleAccountInvoice(event.id, event.data.object as StripeInvoice, true);
    } else if (event.type === 'invoice.payment_failed') {
      await handleAccountInvoice(event.id, event.data.object as StripeInvoice, false);
    }
  } catch (error) {
    console.error(`[account/webhook] ${event.type} の反映に失敗しました。`, error);
    return jsonError('Webhook processing failed.', 500);
  }

  return NextResponse.json({ received: true });
}
