import { createHash, randomBytes } from 'node:crypto';
import { FieldPath, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';
import type { TrackingLinkStats, TrafficGranularity, TrafficPoint, TrackingTrafficDetail } from '@/lib/analytics/types';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,32}$/;
const DAY_COUNT = 30;
const MONTH_COUNT = 12;

function publicSiteUrl(requestOrigin?: string) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const fallback = new URL(requestOrigin || 'http://localhost:3000');
  if (!configured) return fallback;
  const configuredUrl = new URL(configured);
  if (process.env.NODE_ENV === 'development' && ['localhost', '127.0.0.1'].includes(fallback.hostname)) return fallback;
  return configuredUrl;
}

export function isTrackingToken(token: string) {
  return TOKEN_PATTERN.test(token);
}

export async function createTrackingLink(rawDestination: string, adminUid: string, requestOrigin?: string) {
  const siteUrl = publicSiteUrl(requestOrigin);
  let destination: URL;
  try {
    destination = new URL(rawDestination, siteUrl);
  } catch {
    throw new Error('正しいサイト内URLを入力してください。');
  }
  if (!['http:', 'https:'].includes(destination.protocol) || destination.origin !== siteUrl.origin) {
    throw new Error('このサイト内のURLだけを指定できます。');
  }

  const token = randomBytes(16).toString('base64url');
  const trackingUrl = new URL(`/go/${token}`, siteUrl).toString();
  const { db } = getFirebaseAdminServices();
  await db.collection('trackingLinks').doc(token).create({
    destinationUrl: destination.toString(),
    trackingUrl,
    createdBy: adminUid,
    createdAt: Timestamp.now(),
    messageId: null,
    totalVisitors: 0,
    lastVisitedAt: null,
  });
  return { token, destinationUrl: destination.toString(), trackingUrl };
}

export function extractTrackingTokens(body: string) {
  const matches = body.matchAll(/\/go\/([A-Za-z0-9_-]{20,32})(?=$|[^A-Za-z0-9_-])/g);
  return Array.from(new Set(Array.from(matches, (match) => match[1])));
}

export async function associateTrackingLinks(messageId: string, body: string) {
  const tokens = extractTrackingTokens(body).slice(0, 10);
  if (tokens.length === 0) return;
  const { db } = getFirebaseAdminServices();
  const references = tokens.map((token) => db.collection('trackingLinks').doc(token));
  const snapshots = await db.getAll(...references);
  const batch = db.batch();
  for (const snapshot of snapshots) {
    if (snapshot.exists) batch.update(snapshot.ref, { messageId, updatedAt: Timestamp.now() });
  }
  await batch.commit();
}

function tokyoPeriodKeys(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return { day: `${values.year}-${values.month}-${values.day}`, month: `${values.year}-${values.month}` };
}

export async function recordTrackingVisit(token: string, visitorId: string) {
  if (!isTrackingToken(token)) return null;
  const { db } = getFirebaseAdminServices();
  const linkRef = db.collection('trackingLinks').doc(token);
  const visitorHash = createHash('sha256').update(`${token}:${visitorId}`).digest('hex');
  const { day, month } = tokyoPeriodKeys();
  const totalVisitorRef = linkRef.collection('visitors').doc(visitorHash);
  const dailyVisitorRef = linkRef.collection('dailyUniqueVisitors').doc(`${day}_${visitorHash}`);
  const monthlyVisitorRef = linkRef.collection('monthlyUniqueVisitors').doc(`${month}_${visitorHash}`);
  const dailyRef = linkRef.collection('daily').doc(day);
  const monthlyRef = linkRef.collection('monthly').doc(month);

  return db.runTransaction(async (transaction) => {
    const [link, totalVisitor, dailyVisitor, monthlyVisitor] = await Promise.all([
      transaction.get(linkRef),
      transaction.get(totalVisitorRef),
      transaction.get(dailyVisitorRef),
      transaction.get(monthlyVisitorRef),
    ]);
    if (!link.exists || typeof link.data()?.destinationUrl !== 'string') return null;
    const now = Timestamp.now();
    if (!totalVisitor.exists) {
      transaction.create(totalVisitorRef, { firstVisitedAt: now });
      transaction.update(linkRef, { totalVisitors: FieldValue.increment(1), lastVisitedAt: now });
    }
    if (!dailyVisitor.exists) {
      transaction.create(dailyVisitorRef, { visitedAt: now });
      transaction.set(dailyRef, { visitors: FieldValue.increment(1), period: day }, { merge: true });
    }
    if (!monthlyVisitor.exists) {
      transaction.create(monthlyVisitorRef, { visitedAt: now });
      transaction.set(monthlyRef, { visitors: FieldValue.increment(1), period: month }, { merge: true });
    }
    return link.data()?.destinationUrl as string;
  });
}

export async function getTrackingDestination(token: string) {
  if (!isTrackingToken(token)) return null;
  const { db } = getFirebaseAdminServices();
  const snapshot = await db.collection('trackingLinks').doc(token).get();
  const destination = snapshot.data()?.destinationUrl;
  return typeof destination === 'string' ? destination : null;
}

function dayKeysEndingAt(anchor: string) {
  const end = new Date(`${anchor}T00:00:00Z`);
  return Array.from({ length: DAY_COUNT }, (_, index) => {
    const date = new Date(end);
    date.setUTCDate(end.getUTCDate() - (DAY_COUNT - 1 - index));
    return date.toISOString().slice(0, 10);
  });
}

function monthKeysEndingAt(anchor: string) {
  const [year, monthNumber] = anchor.split('-').map(Number);
  return Array.from({ length: MONTH_COUNT }, (_, index) => {
    const date = new Date(Date.UTC(year, monthNumber - MONTH_COUNT + index, 1));
    return date.toISOString().slice(0, 7);
  });
}

function fillSeries(keys: string[], values: Map<string, number>): TrafficPoint[] {
  return keys.map((period) => ({ period, visitors: values.get(period) || 0 }));
}

function isValidAnchor(value: string, granularity: TrafficGranularity) {
  const pattern = granularity === 'daily' ? /^\d{4}-\d{2}-\d{2}$/ : /^\d{4}-\d{2}$/;
  if (!pattern.test(value)) return false;
  const date = new Date(`${value}${granularity === 'daily' ? 'T00:00:00Z' : '-01T00:00:00Z'}`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

export async function getTrackingTrafficDetail(
  token: string,
  granularity: TrafficGranularity,
  anchor: string,
): Promise<TrackingTrafficDetail> {
  if (!isTrackingToken(token)) throw new Error('識別リンクが正しくありません。');
  if (!isValidAnchor(anchor, granularity)) throw new Error('日付または月が正しくありません。');
  const current = tokyoPeriodKeys();
  const currentAnchor = granularity === 'daily' ? current.day : current.month;
  if (anchor > currentAnchor) throw new Error('未来の期間は表示できません。');

  const keys = granularity === 'daily' ? dayKeysEndingAt(anchor) : monthKeysEndingAt(anchor);
  const { db } = getFirebaseAdminServices();
  const linkRef = db.collection('trackingLinks').doc(token);
  const [linkSnapshot, periodsSnapshot] = await Promise.all([
    linkRef.get(),
    linkRef
      .collection(granularity === 'daily' ? 'daily' : 'monthly')
      .orderBy(FieldPath.documentId())
      .startAt(keys[0])
      .endAt(keys.at(-1)!)
      .get(),
  ]);
  if (!linkSnapshot.exists) throw new Error('計測リンクが見つかりません。');
  const values = new Map(periodsSnapshot.docs.map((doc) => [doc.id, Number(doc.data().visitors) || 0]));
  return {
    token,
    granularity,
    anchor,
    rangeStart: keys[0],
    rangeEnd: keys.at(-1)!,
    points: fillSeries(keys, values),
  };
}

export async function getTrackingStats(): Promise<TrackingLinkStats[]> {
  const { db } = getFirebaseAdminServices();
  const linksSnapshot = await db.collection('trackingLinks').get();
  const messageIds = Array.from(
    new Set(linksSnapshot.docs.map((doc) => doc.data().messageId).filter((id): id is string => typeof id === 'string')),
  );
  const messageBodies = new Map<string, string>();
  await Promise.all(
    messageIds.map(async (messageId) => {
      const snapshot = await db.collection('messages').doc(messageId).get();
      if (typeof snapshot.data()?.body === 'string') messageBodies.set(messageId, snapshot.data()!.body);
    }),
  );

  const stats = await Promise.all(
    linksSnapshot.docs.map(async (link) => {
      const data = link.data();
      const messageId = typeof data.messageId === 'string' ? data.messageId : undefined;
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : new Date(0).toISOString();
      return {
        token: link.id,
        destinationUrl: typeof data.destinationUrl === 'string' ? data.destinationUrl : '',
        trackingUrl: typeof data.trackingUrl === 'string' ? data.trackingUrl : '',
        messageId,
        messageBody: messageId ? messageBodies.get(messageId) : undefined,
        totalVisitors: Number(data.totalVisitors) || 0,
        createdAt,
      } satisfies TrackingLinkStats;
    }),
  );
  return stats.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
