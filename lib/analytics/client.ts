'use client';

import type { User } from 'firebase/auth';
import type { TrackingLinkStats, TrackingTrafficDetail, TrafficGranularity } from '@/lib/analytics/types';

async function analyticsRequest(user: User, path: string, init?: RequestInit) {
  const idToken = await user.getIdToken();
  const response = await fetch(path, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${idToken}` },
  });
  const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
  if (!response.ok) {
    throw new Error(typeof payload?.error === 'string' ? payload.error : 'アクセス分析の処理に失敗しました。');
  }
  return payload;
}

export async function generateTrackingLink(user: User, destinationUrl: string) {
  return analyticsRequest(user, '/api/analytics/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ destinationUrl }),
  }) as Promise<{ token: string; destinationUrl: string; trackingUrl: string }>;
}

export async function getXTrafficStats(user: User) {
  const payload = (await analyticsRequest(user, '/api/analytics/x-traffic')) as { links: TrackingLinkStats[] };
  return payload.links;
}

export async function getXTrafficDetail(user: User, token: string, granularity: TrafficGranularity, anchor: string) {
  const params = new URLSearchParams({ token, granularity, anchor });
  const payload = (await analyticsRequest(user, `/api/analytics/x-traffic?${params}`)) as { detail: TrackingTrafficDetail };
  return payload.detail;
}
