import { createHmac, timingSafeEqual } from 'crypto';
import { NextResponse } from 'next/server';
import { saveBokinSupportMessage } from '@/lib/bokinMessages';

export const runtime = 'nodejs';

const SIGNATURE_TOLERANCE_SECONDS = 60 * 5;

type StripeWebhookEvent = {
  id?: string;
  type?: string;
  data?: {
    object?: unknown;
  };
};

type StripeCheckoutSession = {
  id?: string;
  amount_total?: number | null;
  metadata?: {
    kind?: string;
    displayName?: string;
  } | null;
  payment_status?: string;
  status?: string | null;
  created?: number;
};

function parseStripeSignature(signatureHeader: string) {
  const values = signatureHeader.split(',').reduce(
    (result, item) => {
      const [key, value] = item.split('=');
      if (key === 't' && value) result.timestamp = value;
      if (key === 'v1' && value) result.signatures.push(value);
      return result;
    },
    { timestamp: '', signatures: [] as string[] },
  );

  return values;
}

function isFreshTimestamp(timestamp: string) {
  const timestampSeconds = Number(timestamp);
  if (!Number.isFinite(timestampSeconds)) return false;
  return Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds) <= SIGNATURE_TOLERANCE_SECONDS;
}

function isValidStripeSignature(payload: string, signatureHeader: string, webhookSecret: string) {
  const { timestamp, signatures } = parseStripeSignature(signatureHeader);
  if (!timestamp || signatures.length === 0 || !isFreshTimestamp(timestamp)) return false;

  const expectedSignature = createHmac('sha256', webhookSecret).update(`${timestamp}.${payload}`).digest('hex');
  const expected = Buffer.from(expectedSignature, 'hex');

  return signatures.some((signature) => {
    try {
      const received = Buffer.from(signature, 'hex');
      return received.length === expected.length && timingSafeEqual(received, expected);
    } catch {
      return false;
    }
  });
}

function isCheckoutSession(value: unknown): value is StripeCheckoutSession {
  return Boolean(value && typeof value === 'object');
}

async function handleCheckoutSessionCompleted(session: StripeCheckoutSession) {
  if (!session.id) return;
  if (session.metadata?.kind !== 'bokin') return;
  if (session.payment_status !== 'paid') return;
  if (session.status !== 'complete') return;

  await saveBokinSupportMessage({
    sessionId: session.id,
    amount: session.amount_total ?? 0,
    displayName: session.metadata?.displayName,
    createdAt: session.created,
  });
}

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[bokin/webhook] STRIPE_WEBHOOK_SECRET が設定されていません。');
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 500 });
  }

  const signatureHeader = req.headers.get('stripe-signature');
  if (!signatureHeader) {
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  const payload = await req.text();
  if (!isValidStripeSignature(payload, signatureHeader, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(payload) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data?.object;
    if (!isCheckoutSession(session)) {
      return NextResponse.json({ error: 'Invalid Checkout Session payload.' }, { status: 400 });
    }

    await handleCheckoutSessionCompleted(session);
  }

  return NextResponse.json({ received: true });
}
