import { NextResponse } from 'next/server';
import { MAX_MESSAGE_SUPPORT_REPLY_LENGTH } from '@/data/messages';
import { saveBokinSupportReply, updateBokinSupportReply } from '@/lib/bokinMessages';
import { getFirebaseAdminServices, requireFirebaseAdmin } from '@/lib/firebase/admin';

export const runtime = 'nodejs';

type RouteContext = { params: { messageId: string } };

async function parseReplyBody(request: Request) {
  const payload = (await request.json().catch(() => null)) as { body?: unknown } | null;
  if (
    typeof payload?.body !== 'string' ||
    !payload.body.trim() ||
    payload.body.trim().length > MAX_MESSAGE_SUPPORT_REPLY_LENGTH
  ) {
    throw new Error('INVALID_SUPPORT_REPLY');
  }
  return payload.body;
}

function replyErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : 'リプライを保存できませんでした。';
  if (message === 'AUTH_REQUIRED') return NextResponse.json({ error: 'ログインが必要です。' }, { status: 401 });
  if (message === 'ADMIN_REQUIRED') return NextResponse.json({ error: '管理者権限が必要です。' }, { status: 403 });
  if (message === 'SUPPORT_MESSAGE_NOT_FOUND' || message === 'SUPPORT_REPLY_NOT_FOUND') {
    return NextResponse.json({ error: '対象の支援メッセージが見つかりません。' }, { status: 404 });
  }
  if (message === 'SUPPORT_REPLY_EXISTS') {
    return NextResponse.json({ error: 'この支援メッセージにはすでにリプライがあります。' }, { status: 409 });
  }
  if (message === 'SUPPORT_STORAGE_UNAVAILABLE') {
    return NextResponse.json({ error: '支援メッセージの保存先が設定されていません。' }, { status: 503 });
  }
  if (message === 'INVALID_SUPPORT_REPLY') {
    return NextResponse.json(
      { error: `リプライは1〜${MAX_MESSAGE_SUPPORT_REPLY_LENGTH}文字で入力してください。` },
      { status: 400 },
    );
  }
  console.error('[messages/support-replies] request failed.', error);
  return NextResponse.json({ error: 'リプライを保存できませんでした。' }, { status: 500 });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const admin = await requireFirebaseAdmin(request);
    const body = await parseReplyBody(request);

    const { db } = getFirebaseAdminServices();
    const adminProfile = await db.collection('users').doc(admin.uid).get();
    const authorName = adminProfile.data()?.displayName;
    const reply = await saveBokinSupportReply(
      params.messageId,
      body,
      typeof authorName === 'string' ? authorName : '',
    );
    return NextResponse.json({ messageId: params.messageId, reply });
  } catch (error) {
    return replyErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const admin = await requireFirebaseAdmin(request);
    const body = await parseReplyBody(request);
    const { db } = getFirebaseAdminServices();
    const adminProfile = await db.collection('users').doc(admin.uid).get();
    const authorName = adminProfile.data()?.displayName;
    const reply = await updateBokinSupportReply(
      params.messageId,
      body,
      typeof authorName === 'string' ? authorName : '',
    );
    return NextResponse.json({ messageId: params.messageId, reply });
  } catch (error) {
    return replyErrorResponse(error);
  }
}
