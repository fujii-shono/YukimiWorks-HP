import { NextResponse } from 'next/server';
import { requireFirebaseAdmin } from '@/lib/firebase/admin';
import { createXAuthorization, getXConfig } from '@/lib/x/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const config = getXConfig();
    if (!config) return NextResponse.json({ error: 'X APIの環境変数が設定されていません。' }, { status: 503 });

    const authorization = createXAuthorization(config);
    const response = NextResponse.json({ url: authorization.url });
    const secure = config.callbackUrl.startsWith('https://');
    const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure, maxAge: 600, path: '/api/x' };
    response.cookies.set('x_oauth_state', authorization.state, cookieOptions);
    response.cookies.set('x_oauth_verifier', authorization.verifier, cookieOptions);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    if (message === 'ADMIN_REQUIRED') return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    return NextResponse.json({ error: 'X接続を開始できませんでした。' }, { status: 500 });
  }
}
