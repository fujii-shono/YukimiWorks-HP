import { NextResponse } from 'next/server';

const MIN_DONATION_AMOUNT = 50;
const MAX_DONATION_AMOUNT = 99_999_999;

function getRequestOrigin(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  const protocol = req.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');

  if (host) return `${protocol}://${host}`;

  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  return url.origin;
}

function parseAmount(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || value.trim() === '') return MIN_DONATION_AMOUNT;

  const amount = Number(value);
  if (!Number.isInteger(amount)) return null;
  if (amount < MIN_DONATION_AMOUNT || amount > MAX_DONATION_AMOUNT) return null;
  return amount;
}

export async function POST(req: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const origin = getRequestOrigin(req);

  if (!secretKey) {
    console.error('[bokin/checkout] STRIPE_SECRET_KEY が設定されていません。');
    return NextResponse.redirect(`${origin}/bokin?error=stripe-config`, { status: 303 });
  }

  const formData = await req.formData();
  const amount = parseAmount(formData.get('amount'));
  if (amount === null) return NextResponse.redirect(`${origin}/bokin?error=amount`, { status: 303 });

  const params = new URLSearchParams({
    mode: 'payment',
    success_url: `${origin}/bokin/thanks?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/bokin?canceled=1`,
    'payment_method_types[0]': 'card',
    'metadata[kind]': 'bokin',
    'line_items[0][quantity]': '1',
    'line_items[0][price_data][currency]': 'jpy',
    'line_items[0][price_data][unit_amount]': String(amount),
    'line_items[0][price_data][product_data][name]': 'YukimiWorks 支援',
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    console.error('[bokin/checkout] Checkout Session の作成に失敗しました。', detail);
    return NextResponse.redirect(`${origin}/bokin?error=checkout`, { status: 303 });
  }

  const session = (await response.json()) as { url?: string };
  if (!session.url) {
    console.error('[bokin/checkout] Checkout Session URL が返却されませんでした。');
    return NextResponse.redirect(`${origin}/bokin?error=checkout`, { status: 303 });
  }

  return NextResponse.redirect(session.url, { status: 303 });
}
