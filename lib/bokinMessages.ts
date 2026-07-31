import type { MessagePost, MessageTone } from '@/data/messages';
import { createRedisClient, getRedisKey } from '@/lib/redis';

const BOKIN_MESSAGES_KEY = 'bokin:messages';
const BOKIN_PROCESSED_SESSION_KEY_PREFIX = 'bokin:processed-session';
const MAX_BOKIN_MESSAGES = 20;
const DEFAULT_DISPLAY_NAME = '匿名希望';

type StoredBokinMessage = MessagePost & {
  id: string;
};

type StoredBokinMessageRaw = Omit<StoredBokinMessage, 'tone'> & {
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

export async function getBokinSupportMessages(): Promise<MessagePost[]> {
  const redis = createRedisClient();
  if (!redis) return [];

  const values = await redis.lrange<unknown>(getRedisKey(BOKIN_MESSAGES_KEY), 0, MAX_BOKIN_MESSAGES - 1);
  return values.map(parseStoredMessage).filter((message): message is StoredBokinMessage => message !== null);
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
