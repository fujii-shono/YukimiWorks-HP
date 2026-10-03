'use client';

import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices } from '@/lib/firebase/client';
import { isSafeLinkHref } from '@/lib/format';
import type {
  FirebaseContentMedia,
  FirebaseContentBodySegment,
  FirebaseDiaryEntry,
  FirebaseNews,
  FirebasePortfolioItem,
  FirebaseWork,
} from '@/lib/firebase/types';

export type ContentKind = 'portfolio' | 'works' | 'diary' | 'news';
export type FirebaseContentByKind = {
  portfolio: FirebasePortfolioItem;
  works: FirebaseWork;
  diary: FirebaseDiaryEntry;
  news: FirebaseNews;
};

export const contentCollectionNames: Record<ContentKind, string> = {
  portfolio: 'portfolioItems',
  works: 'works',
  diary: 'diaryEntries',
  news: 'news',
};

export const MAX_CONTENT_MEDIA = 8;
export const MAX_CONTENT_BODY_SEGMENTS = 50;
export const MAX_CONTENT_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_CONTENT_VIDEO_BYTES = 100 * 1024 * 1024;

function isMedia(value: unknown): value is FirebaseContentMedia {
  if (!value || typeof value !== 'object') return false;
  const media = value as Partial<FirebaseContentMedia>;
  return (
    (media.type === 'image' || media.type === 'video') &&
    typeof media.url === 'string' &&
    typeof media.path === 'string' &&
    typeof media.alt === 'string'
  );
}

function isBodySegment(value: unknown): value is FirebaseContentBodySegment {
  if (!value || typeof value !== 'object' || !('type' in value)) return false;
  const segment = value as Partial<FirebaseContentBodySegment> & { type?: unknown };
  if (segment.type === 'text') return 'value' in segment && typeof segment.value === 'string';
  if (segment.type === 'link') return 'label' in segment && typeof segment.label === 'string' && 'href' in segment && typeof segment.href === 'string' && isSafeLinkHref(segment.href);
  return segment.type === 'media' && 'media' in segment && isMedia(segment.media);
}

function optionalString(data: DocumentData, key: string) {
  return typeof data[key] === 'string' && data[key].trim() ? data[key] : undefined;
}

function common(snapshot: QueryDocumentSnapshot<DocumentData>) {
  const data = snapshot.data();
  if (typeof data.title !== 'string' || !(data.publishedAt instanceof Timestamp)) return null;
  return {
    id: snapshot.id,
    title: data.title,
    publishedAt: data.publishedAt,
    seoTitle: optionalString(data, 'seoTitle'),
    seoDescription: optionalString(data, 'seoDescription'),
    noIndex: data.noIndex === true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
  };
}

function parseContent<K extends ContentKind>(kind: K, snapshot: QueryDocumentSnapshot<DocumentData>): FirebaseContentByKind[K] | null {
  const data = snapshot.data();
  const base = common(snapshot);
  if (!base) return null;

  if (kind === 'portfolio') {
    if (typeof data.description !== 'string' || !Array.isArray(data.tags) || !isMedia(data.image) || data.image.type !== 'image') return null;
    return { ...base, description: data.description, tags: data.tags.filter((tag: unknown) => typeof tag === 'string'), image: data.image, featured: data.featured === true } as FirebaseContentByKind[K];
  }
  if (kind === 'works') {
    if (typeof data.body !== 'string' || !['contents', 'tools', 'apps'].includes(data.category) || !Array.isArray(data.tags) || !Array.isArray(data.media)) return null;
    const bodySegments = Array.isArray(data.bodySegments) ? data.bodySegments.filter(isBodySegment).slice(0, MAX_CONTENT_BODY_SEGMENTS) : [];
    return { ...base, body: data.body, bodySegments, category: data.category, tags: data.tags.filter((tag: unknown) => typeof tag === 'string'), thumbnail: isMedia(data.thumbnail) && data.thumbnail.type === 'image' ? data.thumbnail : undefined, media: data.media.filter(isMedia).slice(0, MAX_CONTENT_MEDIA), url: optionalString(data, 'url'), featured: data.featured === true } as FirebaseContentByKind[K];
  }
  if (kind === 'diary') {
    if (typeof data.body !== 'string' || !['chat', 'report', 'development', 'behind-the-scenes', 'content-creation-tips'].includes(data.category)) return null;
    const bodySegments = Array.isArray(data.bodySegments) ? data.bodySegments.filter(isBodySegment).slice(0, MAX_CONTENT_BODY_SEGMENTS) : [];
    return { ...base, body: data.body, bodySegments, category: data.category, eyecatch: isMedia(data.eyecatch) && data.eyecatch.type === 'image' ? data.eyecatch : undefined } as FirebaseContentByKind[K];
  }
  if (typeof data.body !== 'string' || !['event', 'announcement', 'release', 'other'].includes(data.category) || !Array.isArray(data.media)) return null;
  const bodySegments = Array.isArray(data.bodySegments) ? data.bodySegments.filter(isBodySegment).slice(0, MAX_CONTENT_BODY_SEGMENTS) : [];
  return { ...base, body: data.body, bodySegments, category: data.category, thumbnail: isMedia(data.thumbnail) && data.thumbnail.type === 'image' ? data.thumbnail : undefined, media: data.media.filter(isMedia).slice(0, MAX_CONTENT_MEDIA), featured: data.featured === true } as FirebaseContentByKind[K];
}

export function subscribeToFirebaseContent<K extends ContentKind>(kind: K, onItems: (items: FirebaseContentByKind[K][]) => void, onError?: () => void): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onItems([]);
    return () => {};
  }
  const contentQuery = query(collection(services.db, contentCollectionNames[kind]), orderBy('publishedAt', 'desc'));
  return onSnapshot(contentQuery, (snapshot) => onItems(snapshot.docs.map((item) => parseContent(kind, item)).filter((item): item is FirebaseContentByKind[K] => item !== null)), () => onError?.());
}

export function validateContentFiles(files: File[], existingCount: number, imageOnly = false) {
  if (files.length + existingCount > MAX_CONTENT_MEDIA) throw new Error(`メディアは最大${MAX_CONTENT_MEDIA}件までです。`);
  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    if (!isImage && (!isVideo || imageOnly)) throw new Error(imageOnly ? '画像ファイルだけアップロードできます。' : '画像または動画だけアップロードできます。');
    if (isImage && file.size > MAX_CONTENT_IMAGE_BYTES) throw new Error('画像1枚の上限は10MBです。');
    if (isVideo && file.size > MAX_CONTENT_VIDEO_BYTES) throw new Error('動画1本の上限は100MBです。');
  }
}

export async function uploadContentFiles(kind: ContentKind, recordId: string, files: File[], imageOnly = false) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  validateContentFiles(files, 0, imageOnly);
  const uploaded: FirebaseContentMedia[] = [];
  try {
    for (const file of files) {
      const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
      const path = `content/${kind}/${recordId}/${crypto.randomUUID()}${extension}`;
      const fileRef = ref(services.storage, path);
      await uploadBytes(fileRef, file, { contentType: file.type });
      uploaded.push({ type: file.type.startsWith('video/') ? 'video' : 'image', url: await getDownloadURL(fileRef), path, alt: '' });
    }
    return uploaded;
  } catch (error) {
    await Promise.allSettled(uploaded.map((item) => deleteObject(ref(services.storage, item.path))));
    throw error;
  }
}

export async function saveFirebaseContent(kind: ContentKind, id: string | undefined, value: Record<string, unknown> & { title: string; publishedAt: Date }, creating = !id, previousId = id) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  if (!value.title.trim() || Number.isNaN(value.publishedAt.getTime())) throw new Error('タイトルと公開日時を入力してください。');
  const recordRef = id ? doc(services.db, contentCollectionNames[kind], id) : doc(collection(services.db, contentCollectionNames[kind]));
  const storedValue = { ...value, title: value.title.trim(), publishedAt: Timestamp.fromDate(value.publishedAt), updatedAt: serverTimestamp(), ...(creating ? { createdAt: serverTimestamp() } : {}) };
  if (creating) {
    await runTransaction(services.db, async (transaction) => {
      if ((await transaction.get(recordRef)).exists()) {
        throw new Error(`URL ID「${recordRef.id}」はすでに登録されています。別のIDを入力してください。`);
      }
      transaction.set(recordRef, storedValue);
    });
  } else if (previousId && previousId !== recordRef.id) {
    const previousRef = doc(services.db, contentCollectionNames[kind], previousId);
    await runTransaction(services.db, async (transaction) => {
      const [previousSnapshot, targetSnapshot] = await Promise.all([transaction.get(previousRef), transaction.get(recordRef)]);
      if (!previousSnapshot.exists()) throw new Error('URL IDの変更元データが見つかりません。画面を再読み込みして、もう一度お試しください。');
      if (targetSnapshot.exists()) throw new Error(`URL ID「${recordRef.id}」はすでに登録されています。別のIDを入力してください。`);
      const migratedValue: Record<string, unknown> = { ...previousSnapshot.data(), ...storedValue };
      if (kind === 'news') delete migratedValue.summary;
      if (kind === 'works') delete migratedValue.description;
      transaction.set(recordRef, migratedValue);
      transaction.delete(previousRef);
    });
  } else {
    await setDoc(recordRef, { ...storedValue, ...(kind === 'news' ? { summary: deleteField() } : {}), ...(kind === 'works' ? { description: deleteField() } : {}) }, { merge: true });
  }
  return recordRef.id;
}

export async function deleteFirebaseContent(kind: ContentKind, item: FirebaseContentByKind[ContentKind]) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  await deleteDoc(doc(services.db, contentCollectionNames[kind], item.id));
  await deleteContentMedia(getContentMedia(kind, item));
}

export function getContentMedia(kind: ContentKind, item: FirebaseContentByKind[ContentKind]): FirebaseContentMedia[] {
  if (kind === 'portfolio') return [(item as FirebasePortfolioItem).image];
  if (kind === 'diary') {
    const diary = item as FirebaseDiaryEntry;
    const bodyMedia = diary.bodySegments.flatMap((segment) => segment.type === 'media' ? [segment.media] : []);
    return [...(diary.eyecatch ? [diary.eyecatch] : []), ...bodyMedia].filter((media, index, all) => all.findIndex((candidate) => candidate.path === media.path) === index);
  }
  const rich = item as FirebaseWork | FirebaseNews;
  const bodyMedia = rich.bodySegments.flatMap((segment) => segment.type === 'media' ? [segment.media] : []);
  return [...(rich.thumbnail ? [rich.thumbnail] : []), ...rich.media, ...bodyMedia].filter((media, index, all) => all.findIndex((candidate) => candidate.path === media.path) === index);
}

export async function deleteContentMedia(media: FirebaseContentMedia[]) {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.allSettled(media.map((item) => deleteObject(ref(services.storage, item.path))));
}
