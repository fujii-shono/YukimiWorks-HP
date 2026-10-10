import { NextResponse } from 'next/server';
import { createTrackingLink } from '@/lib/analytics/tracking';
import { requireFirebaseAdmin } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const admin = await requireFirebaseAdmin(request);
    const payload = (await request.json().catch(() => null)) as {
      destinationUrl?: unknown;
      kind?: unknown;
      label?: unknown;
    } | null;
    if (typeof payload?.destinationUrl !== 'string' || !payload.destinationUrl.trim()) {
      return NextResponse.json({ error: 'リンク先URLを入力してください。' }, { status: 400 });
    }
    const kind = payload.kind === 'standalone' ? 'standalone' : 'message';
    if (payload.label !== undefined && typeof payload.label !== 'string') {
      return NextResponse.json({ error: '表示名が正しくありません。' }, { status: 400 });
    }
    const result = await createTrackingLink(payload.destinationUrl.trim(), admin.uid, new URL(request.url).origin, {
      kind,
      label: payload.label,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : '識別付きリンクを生成できませんでした。';
    if (message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
    if (message === 'ADMIN_REQUIRED') return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
