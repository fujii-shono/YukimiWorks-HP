import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { diaryEntries, getDiaryId, getDiaryPublishedTime, isDiaryPublished, type DiaryBodySegment, type DiaryEntry } from '@/data/diary';
import { buildNewsItems, manualNews, type News, type NewsBodySegment } from '@/data/news';
import { portfolioItems, type PortfolioItem } from '@/data/portfolio';
import { works, type Work, type WorkBodySegment } from '@/data/works';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';
import { isSafeLinkHref } from '@/lib/format';

type AdminTimestamp = { toDate: () => Date };
type FirebaseDocument = { id: string; data: () => Record<string, unknown> };
type StoredMedia = { type: 'image' | 'video'; url: string; path: string; alt: string };
type StoredBodySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'media'; media: StoredMedia };

function timestampDate(value: unknown): Date | null {
  if (!value || typeof value !== 'object' || !('toDate' in value) || typeof (value as AdminTimestamp).toDate !== 'function') return null;
  const date = (value as AdminTimestamp).toDate();
  return Number.isNaN(date.getTime()) ? null : date;
}

function isMedia(value: unknown): value is StoredMedia {
  if (!value || typeof value !== 'object') return false;
  const media = value as Partial<StoredMedia>;
  return (media.type === 'image' || media.type === 'video') && typeof media.url === 'string' && typeof media.path === 'string' && typeof media.alt === 'string';
}

function isBodySegment(value: unknown): value is StoredBodySegment {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  const segment = value as Record<string, unknown>;
  if (segment.type === 'text') return typeof segment.value === 'string';
  if (segment.type === 'link') return typeof segment.label === 'string' && typeof segment.href === 'string' && isSafeLinkHref(segment.href);
  return segment.type === 'media' && isMedia(segment.media);
}

function toPublicBodySegment(segment: StoredBodySegment): WorkBodySegment | DiaryBodySegment {
  if (segment.type === 'media') return { type: 'media', src: segment.media.url, mediaType: segment.media.type, alt: segment.media.alt || undefined };
  return segment;
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function tokyoDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

function tokyoDateTime(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

async function getDocuments(collectionName: string, includeScheduled = false): Promise<FirebaseDocument[]> {
  noStore();
  try {
    const { db } = getFirebaseAdminServices();
    const snapshot = await db.collection(collectionName).orderBy('publishedAt', 'desc').get();
    const now = Date.now();
    return snapshot.docs.filter((document) => {
      if (includeScheduled) return true;
      const publishedAt = timestampDate(document.data().publishedAt);
      return publishedAt !== null && publishedAt.getTime() <= now;
    });
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.warn(`[firebase-content] ${collectionName} could not be loaded`, error);
    return [];
  }
}

function mergeById<T extends { id: string }>(staticItems: T[], firebaseItems: T[], getDate: (item: T) => string) {
  const existingIds = new Set(staticItems.map((item) => item.id));
  return [...staticItems, ...firebaseItems.filter((item) => !existingIds.has(item.id))].sort((a, b) => getDate(b).localeCompare(getDate(a)));
}

export async function getAllWorks(): Promise<Work[]> {
  const documents = await getDocuments('works');
  const firebaseItems = documents.flatMap((document): Work[] => {
    const data = document.data();
    const publishedAt = timestampDate(data.publishedAt);
    if (!publishedAt || typeof data.title !== 'string' || typeof data.description !== 'string' || typeof data.body !== 'string' || !['contents', 'tools', 'apps'].includes(String(data.category))) return [];
    const thumbnail = isMedia(data.thumbnail) && data.thumbnail.type === 'image' ? data.thumbnail.url : '';
    const media = Array.isArray(data.media) ? data.media.filter(isMedia).map((item) => ({ type: item.type, src: item.url, alt: item.alt || undefined })) : [];
    const storedSegments = Array.isArray(data.bodySegments) ? data.bodySegments.filter(isBodySegment).slice(0, 50) : [];
    const body = storedSegments.length ? storedSegments.map(toPublicBodySegment) : data.body;
    return [{ id: document.id, title: data.title, description: data.description, body, category: data.category as Work['category'], tags: strings(data.tags), thumbnail, ...(storedSegments.length ? {} : { media }), date: tokyoDate(publishedAt), publishedAt: publishedAt.toISOString(), url: optionalString(data.url), featured: data.featured === true, seoTitle: optionalString(data.seoTitle), seoDescription: optionalString(data.seoDescription), noIndex: data.noIndex === true }];
  });
  return mergeById(works, firebaseItems, (item) => item.publishedAt ?? item.date ?? '');
}

export async function getAllPortfolioItems(): Promise<PortfolioItem[]> {
  const documents = await getDocuments('portfolioItems');
  const firebaseItems = documents.flatMap((document): PortfolioItem[] => {
    const data = document.data();
    const publishedAt = timestampDate(data.publishedAt);
    if (!publishedAt || typeof data.title !== 'string' || typeof data.description !== 'string' || !isMedia(data.image) || data.image.type !== 'image') return [];
    return [{ id: document.id, title: data.title, href: `/portfolio/${document.id}`, category: 'illustration', content: { kind: 'image', src: data.image.url, alt: data.image.alt || data.title }, description: data.description, date: tokyoDate(publishedAt), publishedAt: publishedAt.toISOString(), year: Number(tokyoDate(publishedAt).slice(0, 4)), tags: strings(data.tags), featured: data.featured === true, seoTitle: optionalString(data.seoTitle), seoDescription: optionalString(data.seoDescription), noIndex: data.noIndex === true }];
  });
  return mergeById(portfolioItems, firebaseItems, (item) => item.publishedAt ?? item.date ?? String(item.year ?? ''));
}

export async function getAllDiaryEntries(): Promise<DiaryEntry[]> {
  const documents = await getDocuments('diaryEntries');
  const firebaseItems = documents.flatMap((document): DiaryEntry[] => {
    const data = document.data();
    const publishedAt = timestampDate(data.publishedAt);
    if (!publishedAt || typeof data.title !== 'string' || typeof data.body !== 'string' || !['chat', 'report', 'development', 'behind-the-scenes', 'content-creation-tips'].includes(String(data.category))) return [];
    const eyecatch = isMedia(data.eyecatch) && data.eyecatch.type === 'image' ? data.eyecatch : undefined;
    const storedSegments = Array.isArray(data.bodySegments) ? data.bodySegments.filter(isBodySegment).slice(0, 50) : [];
    const body = storedSegments.length ? storedSegments.map(toPublicBodySegment) as DiaryBodySegment[] : data.body;
    return [{ id: document.id, title: data.title, body, category: data.category as DiaryEntry['category'], publishedAt: tokyoDateTime(publishedAt), eyecatch: eyecatch?.url, eyecatchAlt: eyecatch?.alt || undefined, seoTitle: optionalString(data.seoTitle), seoDescription: optionalString(data.seoDescription), noIndex: data.noIndex === true }];
  });
  const existingIds = new Set(diaryEntries.map(getDiaryId));
  return [...diaryEntries.filter((entry) => isDiaryPublished(entry)), ...firebaseItems.filter((entry) => !existingIds.has(entry.id ?? ''))].sort((a, b) => getDiaryPublishedTime(b).localeCompare(getDiaryPublishedTime(a)));
}

export async function getAllManualNews(): Promise<News[]> {
  const documents = await getDocuments('news');
  const firebaseItems = documents.flatMap((document): News[] => {
    const data = document.data();
    const publishedAt = timestampDate(data.publishedAt);
    if (!publishedAt || typeof data.title !== 'string' || typeof data.body !== 'string' || !['event', 'announcement', 'release', 'other'].includes(String(data.category))) return [];
    const storedSegments = Array.isArray(data.bodySegments) ? data.bodySegments.filter(isBodySegment).slice(0, 50) : [];
    const mediaSegments: NewsBodySegment[] = Array.isArray(data.media) ? data.media.filter(isMedia).map((item) => ({ type: 'media', src: item.url, mediaType: item.type, alt: item.alt || undefined })) : [];
    const body: NewsBodySegment[] | string = storedSegments.length
      ? storedSegments.map(toPublicBodySegment)
      : mediaSegments.length ? [{ type: 'text', value: data.body }, ...mediaSegments] : data.body;
    const thumbnail = isMedia(data.thumbnail) && data.thumbnail.type === 'image' ? data.thumbnail.url : '';
    return [{ id: document.id, title: data.title, body, category: data.category as News['category'], thumbnail, date: tokyoDate(publishedAt), publishedAt: publishedAt.toISOString(), featured: data.featured === true, seoTitle: optionalString(data.seoTitle), seoDescription: optionalString(data.seoDescription), ogImage: thumbnail || undefined, noIndex: data.noIndex === true, source: 'manual' }];
  });
  return mergeById(manualNews, firebaseItems, (item) => item.publishedAt ?? item.date);
}

export async function getAllNewsItems() {
  const [manualItems, workItems, portfolio] = await Promise.all([getAllManualNews(), getAllWorks(), getAllPortfolioItems()]);
  return buildNewsItems(manualItems, workItems, portfolio);
}
