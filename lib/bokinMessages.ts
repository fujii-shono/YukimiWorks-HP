import {
  MAX_MESSAGE_SUPPORT_REPLY_LENGTH,
  type MessagePost,
  type MessageSupportReply,
  type MessageTone,
} from '@/data/messages';
import { createRedisClient, getRedisKey } from '@/lib/redis';

const BOKIN_MESSAGES_KEY = 'bokin:messages';
const BOKIN_PROCESSED_SESSION_KEY_PREFIX = 'bokin:processed-session';
const BOKIN_REPLY_KEY_PREFIX = 'bokin:reply';
const MAX_BOKIN_MESSAGES = 20;
const DEFAULT_DISPLAY_NAME = '匿名希望';

type StoredBokinMessage = MessagePost & {
  id: string;
};

type StoredBokinMessageRaw = Omit<StoredBokinMessage, 'tone' | 'reply'> & {
  tone?: MessageTone | 'yellow';
};

type DonationMessageInput = {
  sessionId: string;
  amount: number;
  displayName?: string | null;
  createdAt?: number | null;
};

function normalizeDisplayName(value: string | null | undefined) {
  const displayName = value?.trim();
  return displayName ? displayName.slice(0, 8) : DEFAULT_DISPLAY_NAME;
}

function resolveTone(amount: number): MessageTone {
  if (amount >= 10_000) return 'rainbow';
  if (amount >= 3_000) return 'red';
  if (amount >= 500) return 'purple';
  return 'blue';
}

function formatTokyoMinute(timestampSeconds: number) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestampSeconds * 1000));
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function isStoredBokinMessage(value: unknown): value is StoredBokinMessageRaw {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<StoredBokinMessageRaw>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.publishedAt === 'string' &&
    typeof candidate.body === 'string' &&
    (candidate.tone === undefined ||
      candidate.tone === 'blue' ||
      candidate.tone === 'purple' ||
      candidate.tone === 'yellow' ||
      candidate.tone === 'red' ||
      candidate.tone === 'rainbow')
  );
}

function normalizeStoredMessage(message: StoredBokinMessageRaw): StoredBokinMessage {
  return {
    ...message,
    tone: message.tone === 'yellow' ? 'purple' : message.tone,
  };
}

function parseStoredMessage(value: unknown): StoredBokinMessage | null {
  if (isStoredBokinMessage(value)) {
    return normalizeStoredMessage(value);
  }
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isStoredBokinMessage(parsed)) return null;
    return normalizeStoredMessage(parsed);
  } catch {
    return null;
  }
}

function isStoredReply(value: unknown): value is MessageSupportReply {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MessageSupportReply>;
  return (
    typeof candidate.publishedAt === 'string' &&
    typeof candidate.body === 'string' &&
    (candidate.authorName === undefined || typeof candidate.authorName === 'string')
  );
}

function parseStoredReply(value: unknown): MessageSupportReply | null {
  if (isStoredReply(value)) return value;
  if (typeof value !== 'string') return null;

  try {
    const parsed = JSON.parse(value) as unknown;
    return isStoredReply(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function getStoredBokinMessages() {
  const redis = createRedisClient();
  if (!redis) return [];

  const values = await redis.lrange<unknown>(getRedisKey(BOKIN_MESSAGES_KEY), 0, MAX_BOKIN_MESSAGES - 1);
  return values.map(parseStoredMessage).filter((message): message is StoredBokinMessage => message !== null);
}

export async function getBokinSupportMessages(): Promise<MessagePost[]> {
  const redis = createRedisClient();
  if (!redis) return [];

  const messages = await getStoredBokinMessages();
  if (messages.length === 0) return [];

  const replyValues = await redis.mget<unknown[]>(
    ...messages.map((message) => getRedisKey(`${BOKIN_REPLY_KEY_PREFIX}:${message.id}`)),
  );
  return messages.map((message, index) => {
    const reply = parseStoredReply(replyValues[index]);
    return reply ? { ...message, reply } : message;
  });
}

export async function saveBokinSupportReply(messageId: string, body: string, authorName: string) {
  const redis = createRedisClient();
  if (!redis) throw new Error('SUPPORT_STORAGE_UNAVAILABLE');

  const normalizedId = messageId.trim();
  const normalizedBody = body.trim();
  const normalizedAuthorName = authorName.trim().slice(0, 30) || '管理者';
  if (!normalizedId) throw new Error('SUPPORT_MESSAGE_NOT_FOUND');
  if (!normalizedBody || normalizedBody.length > MAX_MESSAGE_SUPPORT_REPLY_LENGTH) throw new Error('INVALID_SUPPORT_REPLY');

  const messages = await getStoredBokinMessages();
  if (!messages.some((message) => message.id === normalizedId)) throw new Error('SUPPORT_MESSAGE_NOT_FOUND');

  const replyKey = getRedisKey(`${BOKIN_REPLY_KEY_PREFIX}:${normalizedId}`);
  if (parseStoredReply(await redis.get<unknown>(replyKey))) throw new Error('SUPPORT_REPLY_EXISTS');

  const reply: MessageSupportReply = {
    publishedAt: formatTokyoMinute(Math.floor(Date.now() / 1000)),
    body: normalizedBody,
    authorName: normalizedAuthorName,
  };
  const saved = await redis.set(replyKey, JSON.stringify(reply), { nx: true });
  if (saved !== 'OK') throw new Error('SUPPORT_REPLY_EXISTS');

  const savedReply = parseStoredReply(await redis.get<unknown>(replyKey));
  if (!savedReply) throw new Error('SUPPORT_REPLY_SAVE_FAILED');
  return savedReply;
}

export async function updateBokinSupportReply(messageId: string, body: string, authorName: string) {
  const redis = createRedisClient();
  if (!redis) throw new Error('SUPPORT_STORAGE_UNAVAILABLE');

  const normalizedId = messageId.trim();
  const normalizedBody = body.trim();
  const normalizedAuthorName = authorName.trim().slice(0, 30) || '管理者';
  if (!normalizedId) throw new Error('SUPPORT_MESSAGE_NOT_FOUND');
  if (!normalizedBody || normalizedBody.length > MAX_MESSAGE_SUPPORT_REPLY_LENGTH) throw new Error('INVALID_SUPPORT_REPLY');

  const messages = await getStoredBokinMessages();
  if (!messages.some((message) => message.id === normalizedId)) throw new Error('SUPPORT_MESSAGE_NOT_FOUND');

  const replyKey = getRedisKey(`${BOKIN_REPLY_KEY_PREFIX}:${normalizedId}`);
  const existingReply = parseStoredReply(await redis.get<unknown>(replyKey));
  if (!existingReply) throw new Error('SUPPORT_REPLY_NOT_FOUND');

  const reply = { ...existingReply, body: normalizedBody, authorName: normalizedAuthorName };
  await redis.set(replyKey, JSON.stringify(reply));
  return reply;
}

export async function saveBokinSupportMessage({ sessionId, amount, displayName, createdAt }: DonationMessageInput) {
  const redis = createRedisClient();
  if (!redis) return;

  const normalizedAmount = Math.max(0, Math.floor(amount));
  if (!sessionId || normalizedAmount < 50) return;

  const processedKey = getRedisKey(`${BOKIN_PROCESSED_SESSION_KEY_PREFIX}:${sessionId}`);
  const marked = await redis.set(processedKey, '1', { nx: true, ex: 60 * 60 * 24 * 366 });
  if (marked !== 'OK') return;

  const name = normalizeDisplayName(displayName);
  const message: StoredBokinMessage = {
    id: sessionId,
    publishedAt: formatTokyoMinute(createdAt ?? Math.floor(Date.now() / 1000)),
    body: `${name}さんから ${normalizedAmount.toLocaleString('ja-JP')}円 のご支援をいただきました！`,
    tone: resolveTone(normalizedAmount),
  };

  const key = getRedisKey(BOKIN_MESSAGES_KEY);
  await redis.lpush(key, JSON.stringify(message));
  await redis.ltrim(key, 0, MAX_BOKIN_MESSAGES - 1);
}
