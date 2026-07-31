import { Redis } from '@upstash/redis';

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

export function getRedisKey(baseKey: string) {
  const prefix = process.env.REDIS_KEY_PREFIX?.trim();
  if (!prefix || prefix === 'prod') return baseKey;
  return `${prefix}:${baseKey}`;
}

export function isRedisConfigured() {
  return Boolean(redisConnection);
}

export function createRedisClient() {
  if (!redisConnection) return null;
  return new Redis({
    url: redisConnection.url,
    token: redisConnection.token,
  });
}
