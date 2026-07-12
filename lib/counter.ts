import { siteConfig } from '@/data/siteConfig';

const COUNTER_KEY = 'site:counter:total';
const kvRestUrl = process.env.KV_REST_API_URL;
const kvRestToken = process.env.KV_REST_API_TOKEN;

function getInitialCounterValue() {
  const numeric = Number.parseInt(siteConfig.decorativeCounter, 10);
  return Number.isFinite(numeric) ? numeric : 0;
}

function getRequestHeaders() {
  const headers = new Headers();
  if (kvRestToken) headers.set('Authorization', `Bearer ${kvRestToken}`);
  return headers;
}

async function kvFetch<T>(path: string, init?: RequestInit) {
  if (!kvRestUrl || !kvRestToken) return null;

  const headers = getRequestHeaders();
  const customHeaders = new Headers(init?.headers);
  customHeaders.forEach((value, key) => headers.set(key, value));

  const response = await fetch(`${kvRestUrl}${path}`, {
    cache: 'no-store',
    ...init,
    headers,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`[counter] KV request failed: ${response.status} ${body}`);
  }

  return (await response.json()) as T;
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
  return Boolean(kvRestUrl && kvRestToken);
}

export async function getCounterValue() {
  const fallback = getInitialCounterValue();
  if (!isCounterConfigured()) return fallback;

  const result = await kvFetch<{ result: unknown }>(`/get/${COUNTER_KEY}`);
  const parsed = toCounterNumber(result?.result);

  if (parsed !== null) return parsed;

  await kvFetch(`/set/${COUNTER_KEY}/${fallback}`, { method: 'POST' });
  return fallback;
}

export async function incrementCounterValue() {
  const fallback = getInitialCounterValue();
  if (!isCounterConfigured()) return fallback;

  const current = await kvFetch<{ result: unknown }>(`/get/${COUNTER_KEY}`);
  const parsedCurrent = toCounterNumber(current?.result);

  if (parsedCurrent === null) {
    await kvFetch(`/set/${COUNTER_KEY}/${fallback}`, { method: 'POST' });
  }

  const incremented = await kvFetch<{ result: unknown }>(`/incr/${COUNTER_KEY}`, { method: 'POST' });
  const parsedIncremented = toCounterNumber(incremented?.result);
  return parsedIncremented ?? fallback + 1;
}

export function formatCounterValue(value: number) {
  const minimumDigits = siteConfig.decorativeCounter.length;
  const normalized = Math.max(0, Math.floor(value));
  return String(normalized).padStart(minimumDigits, '0');
}
