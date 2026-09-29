import { createHash, randomBytes } from 'node:crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';
import { isXPostTooLong } from '@/lib/x/characters';

const X_API_ORIGIN = 'https://api.x.com';
const X_AUTHORIZE_URL = 'https://x.com/i/oauth2/authorize';
const X_TOKEN_URL = `${X_API_ORIGIN}/2/oauth2/token`;
const X_SCOPES = ['tweet.read', 'tweet.write', 'users.read', 'offline.access', 'media.write'];
const X_IMAGE_LIMIT_BYTES = 5 * 1024 * 1024;
const POSTING_LOCK_MILLISECONDS = 5 * 60 * 1000;

type XConfig = {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
};

type XTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  scope?: string;
  refresh_token?: string;
};

type XConnection = {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Timestamp;
  userId: string;
  username: string;
};

type MessageImage = {
  url: string;
};

type MessageForX = {
  body: string;
  images: MessageImage[];
  postToX: boolean;
  xPostStatus?: string;
  xPostId?: string | null;
  xPostAttemptedAt?: Timestamp | null;
};

function parseResponseError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const candidate = payload as { detail?: unknown; title?: unknown; error_description?: unknown; error?: unknown };
  for (const value of [candidate.detail, candidate.error_description, candidate.title, candidate.error]) {
    if (typeof value === 'string' && value.trim()) return value.trim().slice(0, 500);
  }
  return fallback;
}

async function readJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

export function getXConfig(): XConfig | null {
  const clientId = process.env.X_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET;
  const callbackUrl = process.env.X_OAUTH_CALLBACK_URL;
  if (!clientId || !clientSecret || !callbackUrl) return null;
  return { clientId, clientSecret, callbackUrl };
}

export function createXAuthorization(config: XConfig) {
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(64).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  const url = new URL(X_AUTHORIZE_URL);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.callbackUrl);
  url.searchParams.set('scope', X_SCOPES.join(' '));
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('code_challenge_method', 'S256');
  return { url: url.toString(), state, verifier };
}

function clientAuthorization(config: XConfig) {
  return `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
}

export async function exchangeXAuthorizationCode(config: XConfig, code: string, verifier: string) {
  const response = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: clientAuthorization(config),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.callbackUrl,
      code_verifier: verifier,
    }),
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(parseResponseError(payload, 'Xの認証情報を取得できませんでした。'));
  return payload as XTokenResponse;
}

async function getXUser(accessToken: string) {
  const response = await fetch(`${X_API_ORIGIN}/2/users/me?user.fields=username`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(parseResponseError(payload, 'Xアカウント情報を取得できませんでした。'));
  const data = (payload as { data?: { id?: unknown; username?: unknown } } | null)?.data;
  if (typeof data?.id !== 'string' || typeof data.username !== 'string') {
    throw new Error('Xアカウント情報の形式が正しくありません。');
  }
  return { id: data.id, username: data.username };
}

export async function saveXConnection(tokens: XTokenResponse) {
  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('offline.accessを含むXの認証情報を取得できませんでした。');
  }
  const user = await getXUser(tokens.access_token);
  const { db } = getFirebaseAdminServices();
  await db.collection('integrations').doc('x').set({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Timestamp.fromMillis(Date.now() + tokens.expires_in * 1000),
    userId: user.id,
    username: user.username,
    scope: tokens.scope || X_SCOPES.join(' '),
    updatedAt: Timestamp.now(),
  });
  return user;
}

export async function getXConnectionStatus() {
  const { db } = getFirebaseAdminServices();
  const snapshot = await db.collection('integrations').doc('x').get();
  if (!snapshot.exists) return { connected: false as const };
  const data = snapshot.data();
  if (typeof data?.username !== 'string' || typeof data?.userId !== 'string') return { connected: false as const };
  return { connected: true as const, username: data.username, userId: data.userId };
}

export async function disconnectXAccount() {
  const { db } = getFirebaseAdminServices();
  await db.collection('integrations').doc('x').delete();
}

async function refreshXAccessToken(config: XConfig, refreshToken: string) {
  const response = await fetch(X_TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: clientAuthorization(config),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ refresh_token: refreshToken, grant_type: 'refresh_token' }),
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(parseResponseError(payload, 'Xのアクセストークンを更新できませんでした。'));
  return payload as XTokenResponse;
}

async function getValidXAccessToken() {
  const config = getXConfig();
  if (!config) throw new Error('X APIの環境変数が設定されていません。');

  const { db } = getFirebaseAdminServices();
  const connectionRef = db.collection('integrations').doc('x');
  const snapshot = await connectionRef.get();
  const connection = snapshot.data() as XConnection | undefined;
  if (!connection?.accessToken || !connection.expiresAt) throw new Error('Xアカウントが接続されていません。');
  if (connection.expiresAt.toMillis() > Date.now() + 60_000) return connection.accessToken;
  if (!connection.refreshToken) throw new Error('Xアカウントを再接続してください。');

  const refreshed = await refreshXAccessToken(config, connection.refreshToken);
  if (!refreshed.access_token) throw new Error('Xのアクセストークンを更新できませんでした。');
  await connectionRef.set(
    {
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || connection.refreshToken,
      expiresAt: Timestamp.fromMillis(Date.now() + refreshed.expires_in * 1000),
      scope: refreshed.scope || X_SCOPES.join(' '),
      updatedAt: Timestamp.now(),
    },
    { merge: true },
  );
  return refreshed.access_token;
}

async function uploadImageToX(accessToken: string, url: string) {
  const imageResponse = await fetch(url, { cache: 'no-store' });
  if (!imageResponse.ok) throw new Error('投稿画像をFirebase Storageから取得できませんでした。');
  const contentType = imageResponse.headers.get('content-type')?.split(';')[0].trim() || '';
  if (!contentType.startsWith('image/')) throw new Error('Xへ投稿できない画像形式です。');
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
  if (imageBuffer.byteLength > X_IMAGE_LIMIT_BYTES) throw new Error('Xへ投稿する画像は1枚5MB以下にしてください。');

  const response = await fetch(`${X_API_ORIGIN}/2/media/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ media: imageBuffer.toString('base64'), media_category: 'tweet_image' }),
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(parseResponseError(payload, 'Xへ画像をアップロードできませんでした。'));
  const mediaId = (payload as { data?: { id?: unknown } } | null)?.data?.id;
  if (typeof mediaId !== 'string') throw new Error('Xから画像IDが返されませんでした。');
  return mediaId;
}

async function createXPost(accessToken: string, body: string, images: MessageImage[]) {
  const mediaIds = await Promise.all(images.slice(0, 4).map((image) => uploadImageToX(accessToken, image.url)));
  const response = await fetch(`${X_API_ORIGIN}/2/tweets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: body, ...(mediaIds.length > 0 ? { media: { media_ids: mediaIds } } : {}) }),
    cache: 'no-store',
  });
  const payload = await readJson(response);
  if (!response.ok) throw new Error(parseResponseError(payload, 'Xへの投稿に失敗しました。'));
  const postId = (payload as { data?: { id?: unknown } } | null)?.data?.id;
  if (typeof postId !== 'string') throw new Error('Xから投稿IDが返されませんでした。');
  return postId;
}

export async function postFirebaseMessageToX(messageId: string) {
  const { db } = getFirebaseAdminServices();
  const messageRef = db.collection('messages').doc(messageId);

  const claimed = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(messageRef);
    if (!snapshot.exists) throw new Error('メッセージが見つかりません。');
    const message = snapshot.data() as MessageForX;
    if (!message.postToX) throw new Error('X投稿が選択されていません。');
    if (message.xPostStatus === 'posted' && message.xPostId) return null;
    if (
      message.xPostStatus === 'posting' &&
      message.xPostAttemptedAt instanceof Timestamp &&
      message.xPostAttemptedAt.toMillis() > Date.now() - POSTING_LOCK_MILLISECONDS
    ) {
      throw new Error('このメッセージはXへ投稿処理中です。');
    }
    if (typeof message.body !== 'string' || !Array.isArray(message.images)) throw new Error('メッセージ形式が正しくありません。');
    if (isXPostTooLong(message.body)) {
      transaction.update(messageRef, {
        xPostStatus: 'skipped_too_long',
        xPostError: null,
        xPostAttemptedAt: Timestamp.now(),
      });
      return 'skipped_too_long' as const;
    }
    const images = message.images.filter(
      (image): image is MessageImage => Boolean(image && typeof image === 'object' && typeof image.url === 'string'),
    );
    transaction.update(messageRef, {
      xPostStatus: 'posting',
      xPostError: null,
      xPostAttemptedAt: Timestamp.now(),
    });
    return { body: message.body, images };
  });

  if (!claimed) {
    const snapshot = await messageRef.get();
    return { alreadyPosted: true, postId: snapshot.data()?.xPostId as string };
  }

  if (claimed === 'skipped_too_long') return { alreadyPosted: false, skippedTooLong: true };

  try {
    const accessToken = await getValidXAccessToken();
    const postId = await createXPost(accessToken, claimed.body, claimed.images);
    await messageRef.update({
      xPostStatus: 'posted',
      xPostId: postId,
      xPostError: null,
      xPostedAt: Timestamp.now(),
    });
    return { alreadyPosted: false, postId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Xへの投稿に失敗しました。';
    await messageRef.update({ xPostStatus: 'failed', xPostError: message.slice(0, 500) });
    throw error;
  }
}
