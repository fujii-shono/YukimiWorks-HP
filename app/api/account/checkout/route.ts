import { NextResponse } from 'next/server';
import {
  ACCOUNT_PURCHASE_PRODUCTS,
  getStoredTickets,
  isAccountPurchaseProduct,
} from '@/lib/accountPurchaseProducts';
import { applyDebugPurchase } from '@/lib/accountPurchases.server';
import { getFirebaseAdminServices, requireFirebaseUser } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

function getRequestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') ?? url.protocol.replace(':', '');
  if (host) return `${protocol}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || url.origin;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: Request) {
  try {
    const decodedToken = await requireFirebaseUser(request);
    const body = (await request.json()) as { product?: unknown };
    if (!isAccountPurchaseProduct(body.product)) return jsonError('商品が正しくありません。', 400);

    const product = body.product;
    const definition = ACCOUNT_PURCHASE_PRODUCTS[product];
    const { db } = getFirebaseAdminServices();
    const userRef = db.collection('users').doc(decodedToken.uid);
    const userSnapshot = await userRef.get();
    const userData = userSnapshot.data();
    if (!userSnapshot.exists || !userData || userData.role !== 'user') return jsonError('購入できるユーザー情報がありません。', 403);

    const ticket = 'ticket' in definition ? definition.ticket : null;
    if (ticket && getStoredTickets(userData).includes(ticket)) return jsonError('このチケットは購入済みです。', 409);

    if (process.env.NEXT_PUBLIC_STRIPE_PURCHASE_DEBUG === 'true') {
      await applyDebugPurchase(decodedToken.uid, product);
      return NextResponse.json({ debug: true });
    }

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env[definition.priceEnvironmentKey];
    if (!secretKey || !priceId) {
      console.error(`[account/checkout] ${!secretKey ? 'STRIPE_SECRET_KEY' : definition.priceEnvironmentKey} が設定されていません。`);
      return jsonError('Stripeの購入設定が完了していません。', 503);
    }

    const origin = getRequestOrigin(request);
    const params = new URLSearchParams({
      mode: definition.mode,
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/?purchase=canceled`,
      client_reference_id: decodedToken.uid,
      'payment_method_types[0]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'metadata[kind]': 'account_purchase',
      'metadata[uid]': decodedToken.uid,
      'metadata[product]': product,
    });

    if (typeof userData.stripeCustomerId === 'string' && userData.stripeCustomerId) {
      params.set('customer', userData.stripeCustomerId);
    } else if (definition.mode === 'payment') {
      params.set('customer_creation', 'always');
      if (decodedToken.email) params.set('customer_email', decodedToken.email);
    } else if (decodedToken.email) {
      params.set('customer_email', decodedToken.email);
    }

    if (definition.mode === 'subscription') {
      params.set('subscription_data[metadata][kind]', 'account_purchase');
      params.set('subscription_data[metadata][uid]', decodedToken.uid);
      params.set('subscription_data[metadata][product]', product);
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      cache: 'no-store',
    });
    const session = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok || !session.url) {
      console.error('[account/checkout] Checkout Session の作成に失敗しました。', session.error?.message || response.status);
      return jsonError('Stripeの購入画面を開けませんでした。', 502);
    }

    return NextResponse.json({ url: session.url, debug: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'AUTH_REQUIRED') return jsonError('ログインが必要です。', 401);
    if (message === 'ALREADY_OWNED') return jsonError('このチケットは購入済みです。', 409);
    console.error('[account/checkout] 購入処理に失敗しました。', error);
    return jsonError('購入処理に失敗しました。', 500);
  }
}
