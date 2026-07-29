import { Redis } from '@upstash/redis';
import { siteConfig } from '@/data/siteConfig';

const COUNTER_KEY = 'site:counter:total';
const COUNTER_MILESTONE_KEY = 'site:counter:last-milestone';
const redisConnection = normalizeRedisConnection(
  [
    process.env.UPSTASH_REDIS_REST_URL,
    process.env.UPSTASH_REDIS_REST_REDIS_URL,
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
    process.env.KV_REST_API_URL,
  ],
  [
    process.env.UPSTASH_REDIS_REST_TOKEN,
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
    process.env.KV_REST_API_TOKEN,
  ],
);

export type CounterMilestone = {
  count: number;
  message: string;
  effect?: 'cracker';
};

function pickEnv(...values: Array<string | undefined>) {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function normalizeRedisConnection(
  urlCandidates: Array<string | undefined>,
  tokenCandidates: Array<string | undefined>,
): { url: string; token: string } | null {
  const rawUrl = pickEnv(...urlCandidates);
  const rawToken = pickEnv(...tokenCandidates);
  if (!rawUrl) return null;

  if (rawUrl.startsWith('https://')) {
    if (!rawToken) return null;
    return { url: rawUrl, token: rawToken };
  }

  if (rawUrl.startsWith('rediss://') || rawUrl.startsWith('redis://')) {
    try {
      const parsed = new URL(rawUrl);
      const token = rawToken ?? parsed.password;
      if (!token) return null;
      return {
        url: `https://${parsed.hostname}`,
        token,
      };
    } catch {
      return null;
    }
  }

  return null;
}

function getInitialCounterValue() {
  const numeric = Number.parseInt(siteConfig.decorativeCounter, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toCounterNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number.parseInt(value, 10);
    if (Number.isFinite(numeric)) return numeric;
  }
  return null;
}

export function isCounterConfigured() {
  return Boolean(redisConnection);
}

function createRedisClient() {
  if (!redisConnection) return null;
  return new Redis({
    url: redisConnection.url,
    token: redisConnection.token,
  });
}

function isSeededCounterValue(value: number | null, minimum: number): value is number {
  return value !== null && value >= minimum;
}

async function seedCounterValue(redis: Redis, fallback: number) {
  await redis.set(COUNTER_KEY, fallback);
  return fallback;
}

function isRepdigit(value: number) {
  const normalized = String(Math.max(0, Math.floor(value)));
  return normalized.length >= 2 && normalized.split('').every((digit) => digit === normalized[0]);
}

function createCounterMilestone(value: number): CounterMilestone | null {
  const normalized = Math.max(0, Math.floor(value));

  if (normalized > 0 && normalized % 10_000 === 0) {
    return {
      count: normalized,
      message: `記念すべき${normalized}番目！めっちゃめでたい！`,
      effect: 'cracker',
    };
  }

  if (normalized > 0 && normalized % 1_000 === 0) {
    return {
      count: normalized,
      message: `あなたは${normalized}番目の訪問者です！おめでとう！`,
    };
  }

  if (isRepdigit(normalized)) {
    return {
      count: normalized,
      message: 'なんとゾロ目！すごいね！',
    };
  }

  return null;
}

export async function getCounterValue() {
  const fallback = getInitialCounterValue();
  const redis = createRedisClient();
  if (!redis) return fallback;

  const result = await redis.get<unknown>(COUNTER_KEY);
  const parsed = toCounterNumber(result);

  if (isSeededCounterValue(parsed, fallback)) return parsed;

  return seedCounterValue(redis, fallback);
}

export async function incrementCounterValue() {
  const fallback = getInitialCounterValue();
  const redis = createRedisClient();
  if (!redis) return fallback;

  const incremented = await redis.incr(COUNTER_KEY);
  const parsedIncremented = toCounterNumber(incremented);

  if (isSeededCounterValue(parsedIncremented, fallback)) {
    return parsedIncremented;
  }

  await seedCounterValue(redis, fallback);

  const retried = await redis.incr(COUNTER_KEY);
  const parsedRetried = toCounterNumber(retried);
  return isSeededCounterValue(parsedRetried, fallback) ? parsedRetried : fallback + 1;
}

export async function getCounterMilestoneForVisitor(value: number) {
  const redis = createRedisClient();
  if (!redis) return null;

  const milestone = createCounterMilestone(value);
  if (!milestone) return null;

  const lastShown = toCounterNumber(await redis.get<unknown>(COUNTER_MILESTONE_KEY));
  if (lastShown !== null && lastShown >= milestone.count) return null;

  await redis.set(COUNTER_MILESTONE_KEY, milestone.count);
  return milestone;
}

export function formatCounterValue(value: number) {
  const minimumDigits = siteConfig.decorativeCounter.length;
  const normalized = Math.max(0, Math.floor(value));
  return String(normalized).padStart(minimumDigits, '0');
}
