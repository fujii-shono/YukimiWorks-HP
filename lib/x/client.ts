import type { User } from 'firebase/auth';

async function xApiRequest(user: User, path: string, init?: RequestInit) {
  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${idToken}` },
  });
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (!response.ok) {
    const error = typeof payload?.error === 'string' ? payload.error : 'X連携の処理に失敗しました。';
    throw new Error(error);
  }
  return payload;
}

export async function getXStatus(user: User) {
  return xApiRequest(user, '/api/x/status') as Promise<{
    configured: boolean;
    connected: boolean;
    username?: string;
    dryRun?: boolean;
  }>;
}

export async function startXConnection(user: User) {
  const payload = (await xApiRequest(user, '/api/x/connect')) as { url?: unknown };
  if (typeof payload.url !== 'string') throw new Error('Xの認証URLを取得できませんでした。');
  window.location.assign(payload.url);
}

export async function disconnectX(user: User) {
  await xApiRequest(user, '/api/x/status', { method: 'DELETE' });
}

export async function postSavedMessageToX(user: User, messageId: string) {
  return xApiRequest(user, '/api/x/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messageId }),
  }) as Promise<{ postId: string; alreadyPosted: boolean; dryRun?: boolean }>;
}
