import { NextResponse } from 'next/server';
import { requireFirebaseAdmin } from '@/lib/firebase/admin';
import { postFirebaseMessageToX } from '@/lib/x/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    await requireFirebaseAdmin(request);
    const payload = (await request.json().catch(() => null)) as { messageId?: unknown } | null;
    if (typeof payload?.messageId !== 'string' || !payload.messageId.trim()) {
      return NextResponse.json({ error: 'メッセージIDが正しくありません。' }, { status: 400 });
    }
    const result = await postFirebaseMessageToX(payload.messageId);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Xへの投稿に失敗しました。';
    if (message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    if (message === 'ADMIN_REQUIRED') return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    return NextResponse.json({ error: message.slice(0, 500) }, { status: 500 });
  }
}
