import { Redis } from '@upstash/redis';
import { siteConfig } from '@/data/siteConfig';
import { createRedisClient, getRedisKey, isRedisConfigured } from '@/lib/redis';

const COUNTER_KEY = 'site:counter:total';
const COUNTER_MILESTONE_KEY = 'site:counter:last-milestone';

export type CounterMilestone = {
  count: number;
  message: string;
  effect?: 'cracker';
};

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
  return isRedisConfigured();
}

function isSeededCounterValue(value: number | null, minimum: number): value is number {
  return value !== null && value >= minimum;
}

async function seedCounterValue(redis: Redis, fallback: number) {
  await redis.set(getRedisKey(COUNTER_KEY), fallback);
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

  const result = await redis.get<unknown>(getRedisKey(COUNTER_KEY));
  const parsed = toCounterNumber(result);

  if (isSeededCounterValue(parsed, fallback)) return parsed;

  return seedCounterValue(redis, fallback);
}

export async function incrementCounterValue() {
  const fallback = getInitialCounterValue();
  const redis = createRedisClient();
  if (!redis) return fallback;

  const incremented = await redis.incr(getRedisKey(COUNTER_KEY));
  const parsedIncremented = toCounterNumber(incremented);

  if (isSeededCounterValue(parsedIncremented, fallback)) {
    return parsedIncremented;
  }

  await seedCounterValue(redis, fallback);

  const retried = await redis.incr(getRedisKey(COUNTER_KEY));
  const parsedRetried = toCounterNumber(retried);
  return isSeededCounterValue(parsedRetried, fallback) ? parsedRetried : fallback + 1;
}

export async function getCounterMilestoneForVisitor(value: number) {
  const redis = createRedisClient();
  if (!redis) return null;

  const milestone = createCounterMilestone(value);
  if (!milestone) return null;

  const milestoneKey = getRedisKey(COUNTER_MILESTONE_KEY);
  const lastShown = toCounterNumber(await redis.get<unknown>(milestoneKey));
  if (lastShown !== null && lastShown >= milestone.count) return null;

  await redis.set(milestoneKey, milestone.count);
  return milestone;
}

export function formatCounterValue(value: number) {
  const minimumDigits = siteConfig.decorativeCounter.length;
  const normalized = Math.max(0, Math.floor(value));
  return String(normalized).padStart(minimumDigits, '0');
}
