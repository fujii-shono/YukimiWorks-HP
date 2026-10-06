import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { Timestamp } from 'firebase-admin/firestore';
import odaiSource from '@/data/odai.json';
import legacyHistorySource from '@/data/odai-history.json';
import { siteConfig } from '@/data/siteConfig';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';
import {
  buildWeeklyOdaiXPost,
  generateOdai,
  normalizeOdaiTopic,
  toOdaiDisplayText,
} from '@/lib/odai/generator';
import { getOdaiWeekWindow, type WeekWindow } from '@/lib/odai/week';
import { getWeeklyOdaiXPostingMode } from '@/lib/odai/x-posting';
import { postTextToX } from '@/lib/x/server';

const WEEKLY_COLLECTION = 'odaiWeeklyTopics';
const DELIVERY_CLAIM_MS = 15 * 60 * 1000;
const MAX_HISTORY = 30;

type TimestampLike = { toDate: () => Date };

export type WeeklyOdai = {
  weekId: string;
  topic: string;
  displayText: string;
  validFrom: string;
  validUntil: string;
};

function timestampDate(value: unknown) {
  if (!value || typeof value !== 'object' || !('toDate' in value)) return null;
  const toDate = (value as TimestampLike).toDate;
  if (typeof toDate !== 'function') return null;
  const date = toDate.call(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseWeeklyOdai(
  documentId: string,
  data: Record<string, unknown>,
  fallbackWindow: WeekWindow,
): WeeklyOdai | null {
  if (typeof data.topic !== 'string') return null;
  const topic = normalizeOdaiTopic(data.topic);
  if (!topic || topic.length > 200) return null;
  const validFrom = timestampDate(data.validFrom) ?? fallbackWindow.validFrom;
  const validUntil = timestampDate(data.validUntil) ?? fallbackWindow.validUntil;
  return {
    weekId: typeof data.weekId === 'string' ? data.weekId : documentId,
    topic,
    displayText: toOdaiDisplayText(topic),
    validFrom: validFrom.toISOString(),
    validUntil: validUntil.toISOString(),
  };
}

export async function getCurrentWeeklyOdai(now = new Date()): Promise<WeeklyOdai | null> {
  noStore();
  const window = getOdaiWeekWindow(now);
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db.collection(WEEKLY_COLLECTION).doc(window.weekId).get();
    return snapshot.exists ? parseWeeklyOdai(snapshot.id, snapshot.data() ?? {}, window) : null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[odai] 今週のお題を取得できませんでした。', error);
    }
    return null;
  }
}

async function getTopicHistory(throughWeekId: string) {
  const { db } = getFirebaseAdminServices();
  const snapshot = await db.collection(WEEKLY_COLLECTION).get();
  const storedHistory = snapshot.docs
    .filter((document) => document.id <= throughWeekId)
    .sort((left, right) => left.id.localeCompare(right.id))
    .flatMap((document) => {
      const topic = document.data().topic;
      return typeof topic === 'string' && normalizeOdaiTopic(topic)
        ? [toOdaiDisplayText(normalizeOdaiTopic(topic))]
        : [];
    });
  const legacyHistory = (legacyHistorySource as unknown[]).filter(
    (value): value is string => typeof value === 'string',
  );
  return [...legacyHistory, ...storedHistory].slice(-MAX_HISTORY);
}

export async function ensureCurrentWeeklyOdai(now = new Date()): Promise<WeeklyOdai> {
  const window = getOdaiWeekWindow(now);
  const { db } = getFirebaseAdminServices();
  const reference = db.collection(WEEKLY_COLLECTION).doc(window.weekId);
  const history = await getTopicHistory(window.weekId);
  const generated = generateOdai(odaiSource, history);

  return db.runTransaction(async (transaction) => {
    const existing = await transaction.get(reference);
    if (existing.exists) {
      const weekly = parseWeeklyOdai(existing.id, existing.data() ?? {}, window);
      if (!weekly) throw new Error(`Firestoreの週次お題 ${window.weekId} の形式が不正です。`);
      return weekly;
    }

    const nowTimestamp = Timestamp.fromDate(now);
    transaction.create(reference, {
      weekId: window.weekId,
      topic: generated.topic,
      displayText: generated.displayText,
      validFrom: Timestamp.fromDate(window.validFrom),
      validUntil: Timestamp.fromDate(window.validUntil),
      discordStatus: 'pending',
      discordAttempts: 0,
      discordMessageId: null,
      discordLastError: null,
      discordAttemptedAt: null,
      discordSentAt: null,
      xPostStatus: 'pending',
      xPostAttempts: 0,
      xPostId: null,
      xPostError: null,
      xPostAttemptedAt: null,
      xPostedAt: null,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    });

    return {
      weekId: window.weekId,
      topic: generated.topic,
      displayText: generated.displayText,
      validFrom: window.validFrom.toISOString(),
      validUntil: window.validUntil.toISOString(),
    };
  });
}

export async function deliverWeeklyOdaiToDiscord(weekly: WeeklyOdai, now = new Date()) {
  const webhookValue = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhookValue) throw new Error('DISCORD_WEBHOOK_URL が未設定です。');

  let webhookUrl: URL;
  try {
    webhookUrl = new URL(webhookValue);
  } catch {
    throw new Error('DISCORD_WEBHOOK_URL の形式が不正です。');
  }
  if (webhookUrl.protocol !== 'https:') throw new Error('DISCORD_WEBHOOK_URL はHTTPSで指定してください。');
  webhookUrl.searchParams.set('wait', 'true');

  const { db } = getFirebaseAdminServices();
  const reference = db.collection(WEEKLY_COLLECTION).doc(weekly.weekId);
  const claim = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new Error('送信対象の週次お題が見つかりません。');
    const data = snapshot.data() ?? {};
    if (data.discordStatus === 'sent') return 'sent' as const;

    const attemptedAt = timestampDate(data.discordAttemptedAt);
    if (
      data.discordStatus === 'sending' &&
      attemptedAt &&
      now.getTime() - attemptedAt.getTime() < DELIVERY_CLAIM_MS
    ) {
      return 'busy' as const;
    }

    const attempts = typeof data.discordAttempts === 'number' ? data.discordAttempts : 0;
    transaction.set(
      reference,
      {
        discordStatus: 'sending',
        discordAttempts: attempts + 1,
        discordAttemptedAt: Timestamp.fromDate(now),
        discordLastError: null,
        updatedAt: Timestamp.fromDate(now),
      },
      { merge: true },
    );
    return 'claimed' as const;
  });

  if (claim !== 'claimed') return { status: claim };

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: weekly.displayText }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Discord WebhookがHTTP ${response.status}を返しました。`);

    const responseBody = (await response.json().catch(() => null)) as { id?: unknown } | null;
    await reference.set(
      {
        discordStatus: 'sent',
        discordMessageId: typeof responseBody?.id === 'string' ? responseBody.id : null,
        discordLastError: null,
        discordSentAt: Timestamp.fromDate(new Date()),
        updatedAt: Timestamp.fromDate(new Date()),
      },
      { merge: true },
    );
    return { status: 'sent' as const };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'Discord投稿に失敗しました。';
    await reference.set(
      {
        discordStatus: 'failed',
        discordLastError: message,
        updatedAt: Timestamp.fromDate(new Date()),
      },
      { merge: true },
    );
    throw error;
  }
}

export async function deliverWeeklyOdaiToX(weekly: WeeklyOdai, now = new Date()) {
  const mode = getWeeklyOdaiXPostingMode(process.env);
  if (mode !== 'enabled') return { status: mode };

  const { db } = getFirebaseAdminServices();
  const reference = db.collection(WEEKLY_COLLECTION).doc(weekly.weekId);
  const claim = await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(reference);
    if (!snapshot.exists) throw new Error('X送信対象の週次お題が見つかりません。');
    const data = snapshot.data() ?? {};
    if (data.xPostStatus === 'posted' && typeof data.xPostId === 'string') return 'posted' as const;

    const attemptedAt = timestampDate(data.xPostAttemptedAt);
    if (
      data.xPostStatus === 'posting' &&
      attemptedAt &&
      now.getTime() - attemptedAt.getTime() < DELIVERY_CLAIM_MS
    ) {
      return 'busy' as const;
    }

    const attempts = typeof data.xPostAttempts === 'number' ? data.xPostAttempts : 0;
    transaction.set(
      reference,
      {
        xPostStatus: 'posting',
        xPostAttempts: attempts + 1,
        xPostAttemptedAt: Timestamp.fromDate(now),
        xPostError: null,
        updatedAt: Timestamp.fromDate(now),
      },
      { merge: true },
    );
    return 'claimed' as const;
  });

  if (claim !== 'claimed') return { status: claim };

  try {
    const postId = await postTextToX(buildWeeklyOdaiXPost(weekly.topic, siteConfig.siteUrl));
    const completedAt = Timestamp.fromDate(new Date());
    await reference.set(
      {
        xPostStatus: 'posted',
        xPostId: postId,
        xPostError: null,
        xPostedAt: completedAt,
        updatedAt: completedAt,
      },
      { merge: true },
    );
    return { status: 'posted' as const };
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 500) : 'X投稿に失敗しました。';
    await reference.set(
      {
        xPostStatus: 'failed',
        xPostError: message,
        updatedAt: Timestamp.fromDate(new Date()),
      },
      { merge: true },
    );
    throw error;
  }
}
