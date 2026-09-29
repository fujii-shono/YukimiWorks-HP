import { NextResponse } from 'next/server';
import { requireFirebaseAdmin } from '@/lib/firebase/admin';
import { disconnectXAccount, getXConfig, getXConnectionStatus } from '@/lib/x/server';

export const runtime = 'nodejs';

function authError(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  if (message === 'ADMIN_REQUIRED') return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
  return null;
}

export async function GET(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    if (!getXConfig()) return NextResponse.json({ configured: false, connected: false });
    const status = await getXConnectionStatus();
    return NextResponse.json({ configured: true, ...status });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: 'X接続状態を確認できませんでした。' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    await disconnectXAccount();
    return NextResponse.json({ disconnected: true });
  } catch (error) {
    return authError(error) || NextResponse.json({ error: 'Xアカウントの接続を解除できませんでした。' }, { status: 500 });
  }
}
