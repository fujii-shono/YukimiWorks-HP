import { NextResponse } from 'next/server';
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
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return jsonError('Stripeの設定が完了していません。', 503);

    const { db } = getFirebaseAdminServices();
    const userSnapshot = await db.collection('users').doc(decodedToken.uid).get();
    const customerId = userSnapshot.data()?.stripeCustomerId;
    if (typeof customerId !== 'string' || !customerId) {
      return jsonError('管理できるStripe契約がありません。', 404);
    }

    const params = new URLSearchParams({
      customer: customerId,
      return_url: `${getRequestOrigin(request)}/?purchase=portal-return`,
    });
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
      cache: 'no-store',
    });
    const portal = (await response.json()) as { url?: string; error?: { message?: string } };
    if (!response.ok || !portal.url) {
      console.error('[account/portal] Billing Portal Session の作成に失敗しました。', portal.error?.message || response.status);
      return jsonError('契約管理画面を開けませんでした。', 502);
    }
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'AUTH_REQUIRED') return jsonError('ログインが必要です。', 401);
    console.error('[account/portal] 契約管理画面の作成に失敗しました。', error);
    return jsonError('契約管理画面を開けませんでした。', 500);
  }
}
