import { Redis } from '@upstash/redis';
import { siteConfig } from '@/data/siteConfig';

const COUNTER_KEY = 'site:counter:total';
const redisRestUrl = pickEnv(
  process.env.UPSTASH_REDIS_REST_URL,
  process.env.UPSTASH_REDIS_REST_REDIS_URL,
  process.env.UPSTASH_REDIS_REST_KV_REST_API_URL,
  process.env.KV_REST_API_URL,
);
const redisRestToken = pickEnv(
  process.env.UPSTASH_REDIS_REST_TOKEN,
  process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN,
  process.env.KV_REST_API_TOKEN,
);

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
  return Boolean(redisRestUrl && redisRestToken);
}

function pickEnv(...values: Array<string | undefined>) {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function createRedisClient() {
  if (!redisRestUrl || !redisRestToken) return null;
  return new Redis({
    url: redisRestUrl,
    token: redisRestToken,
  });
}

function isSeededCounterValue(value: number | null, minimum: number) {
  return value !== null && value >= minimum;
}

async function seedCounterValue(redis: Redis, fallback: number) {
  await redis.set(COUNTER_KEY, fallback);
  return fallback;
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

export function formatCounterValue(value: number) {
  const minimumDigits = siteConfig.decorativeCounter.length;
  const normalized = Math.max(0, Math.floor(value));
  return String(normalized).padStart(minimumDigits, '0');
}
