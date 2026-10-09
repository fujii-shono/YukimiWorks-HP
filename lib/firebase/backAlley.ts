'use client';

import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, Timestamp, where, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import { deleteObject, getBlob, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices } from '@/lib/firebase/client';
import type { FirebaseBackAlleyPortfolioItem } from '@/lib/firebase/types';

export const BACK_ALLEY_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

function parseItem(snapshot: QueryDocumentSnapshot<DocumentData>, r18: boolean): FirebaseBackAlleyPortfolioItem | null {
  const data = snapshot.data();
  if (typeof data.title !== 'string' || typeof data.description !== 'string' || !Array.isArray(data.tags) || !(data.publishedAt instanceof Timestamp)) return null;
  if (!data.image || data.image.type !== 'image' || typeof data.image.path !== 'string' || typeof data.image.alt !== 'string') return null;
  const interaction = data.interaction?.type === 'two-choice'
    && typeof data.interaction.prompt === 'string'
    && typeof data.interaction.top?.label === 'string'
    && typeof data.interaction.bottom?.label === 'string'
    && data.interaction.top?.image?.type === 'image'
    && typeof data.interaction.top.image.path === 'string'
    && typeof data.interaction.top.image.alt === 'string'
    && data.interaction.bottom?.image?.type === 'image'
    && typeof data.interaction.bottom.image.path === 'string'
    && typeof data.interaction.bottom.image.alt === 'string'
    ? {
        type: 'two-choice' as const,
        prompt: data.interaction.prompt,
        top: { label: data.interaction.top.label, image: data.interaction.top.image },
        bottom: { label: data.interaction.bottom.label, image: data.interaction.bottom.image },
      }
    : undefined;
  return {
    id: snapshot.id,
    title: data.title,
    description: data.description,
    tags: data.tags.filter((tag: unknown): tag is string => typeof tag === 'string'),
    image: data.image,
    interaction,
    r18,
    publishedAt: data.publishedAt,
    featured: data.featured === true,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
  };
}

function parseLockedItem(snapshot: QueryDocumentSnapshot<DocumentData>): FirebaseBackAlleyPortfolioItem | null {
  const data = snapshot.data();
  if (!(data.publishedAt instanceof Timestamp)) return null;
  return { id: snapshot.id, title: typeof data.title === 'string' ? data.title : 'R18作品', description: typeof data.description === 'string' ? data.description : '', tags: [], publishedAt: data.publishedAt, featured: data.featured === true, r18: true, locked: true };
}

export function subscribeToBackAlleyPortfolio(
  onItems: (items: FirebaseBackAlleyPortfolioItem[]) => void,
  onError?: () => void,
  options: { includeScheduled?: boolean; includeR18?: boolean; lockedR18?: boolean } = {},
) {
  const services = getFirebaseServices();
  if (!services) { onItems([]); return () => {}; }
  let regular: FirebaseBackAlleyPortfolioItem[] = [];
  let restricted: FirebaseBackAlleyPortfolioItem[] = [];
  const publish = () => onItems([...regular, ...restricted].sort((a, b) => b.publishedAt.toMillis() - a.publishedAt.toMillis()));
  const makeQuery = (name: string) => options.includeScheduled
    ? query(collection(services.db, name), orderBy('publishedAt', 'desc'))
    : query(collection(services.db, name), where('publishedAt', '<=', Timestamp.now()), orderBy('publishedAt', 'desc'));
  const unsubscribes = [onSnapshot(makeQuery('backAlleyPortfolioItems'), (snapshot) => {
    regular = snapshot.docs.map((item) => parseItem(item, false)).filter((item): item is FirebaseBackAlleyPortfolioItem => item !== null);
    publish();
  }, () => onError?.())];
  if (options.includeR18) {
    unsubscribes.push(onSnapshot(makeQuery('backAlleyR18PortfolioItems'), (snapshot) => {
      restricted = snapshot.docs.map((item) => parseItem(item, true)).filter((item): item is FirebaseBackAlleyPortfolioItem => item !== null);
      publish();
    }, () => onError?.()));
  } else if (options.lockedR18) {
    unsubscribes.push(onSnapshot(makeQuery('backAlleyR18Index'), (snapshot) => {
      restricted = snapshot.docs.map(parseLockedItem).filter((item): item is FirebaseBackAlleyPortfolioItem => item !== null);
      publish();
    }, () => onError?.()));
  }
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

export async function loadProtectedBlobUrl(path: string) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  return URL.createObjectURL(await getBlob(ref(services.storage, path)));
}

export async function syncBackAlleyR18Index(item: FirebaseBackAlleyPortfolioItem) {
  if (!item.r18) return;
  const services = getFirebaseServices();
  if (!services) return;
  const indexRef = doc(services.db, 'backAlleyR18Index', item.id);
  const existing = await getDoc(indexRef);
  const data = existing.data();
  if (data?.title === item.title && data.description === item.description && data.featured === item.featured && data.publishedAt instanceof Timestamp && data.publishedAt.isEqual(item.publishedAt)) return;
  await setDoc(indexRef, { title: item.title, description: item.description, publishedAt: item.publishedAt, featured: item.featured, updatedAt: serverTimestamp() });
}

export async function saveBackAlleyPortfolio(input: {
  id: string;
  previous?: FirebaseBackAlleyPortfolioItem;
  title: string;
  description: string;
  tags: string[];
  publishedAt: Date;
  featured: boolean;
  r18: boolean;
  imageFile?: File;
}) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  if (!BACK_ALLEY_ID_PATTERN.test(input.id)) throw new Error('URL IDは半角小文字の英数字とハイフンで入力してください。');
  if (!input.title.trim() || Number.isNaN(input.publishedAt.getTime())) throw new Error('タイトルと公開日時を入力してください。');
  if ((!input.previous || input.previous.r18 !== input.r18) && !input.imageFile) throw new Error('公開区分を新規設定・変更する場合は作品画像を選択してください。');
  if (input.imageFile && (!input.imageFile.type.startsWith('image/') || input.imageFile.size > 10 * 1024 * 1024)) throw new Error('画像は10MB以下の画像ファイルを選択してください。');
  if (input.previous && input.previous.id !== input.id) throw new Error('編集中はURL IDを変更できません。');

  let uploadedPath: string | null = null;
  const movingBetweenAudiences = Boolean(input.previous && input.previous.r18 !== input.r18);
  try {
    if (input.imageFile) {
      const extension = input.imageFile.name.includes('.') ? input.imageFile.name.slice(input.imageFile.name.lastIndexOf('.')).toLowerCase() : '';
      uploadedPath = input.r18
        ? `protected/back-alley/r18/portfolio/${input.id}/${crypto.randomUUID()}${extension}`
        : `protected/back-alley/portfolio/${input.id}/${crypto.randomUUID()}${extension}`;
      await uploadBytes(ref(services.storage, uploadedPath), input.imageFile, { contentType: input.imageFile.type });
    }
    const collectionName = input.r18 ? 'backAlleyR18PortfolioItems' : 'backAlleyPortfolioItems';
    const previousCollectionName = input.previous?.r18 ? 'backAlleyR18PortfolioItems' : 'backAlleyPortfolioItems';
    const recordRef = doc(services.db, collectionName, input.id);
    const otherRef = doc(services.db, input.r18 ? 'backAlleyPortfolioItems' : 'backAlleyR18PortfolioItems', input.id);
    const indexRef = doc(services.db, 'backAlleyR18Index', input.id);
    await runTransaction(services.db, async (transaction) => {
      const [snapshot, otherSnapshot] = await Promise.all([transaction.get(recordRef), transaction.get(otherRef)]);
      if (!input.previous && (snapshot.exists() || otherSnapshot.exists())) throw new Error(`URL ID「${input.id}」はすでに使用されています。`);
      transaction.set(recordRef, {
        title: input.title.trim(),
        description: input.description.trim(),
        tags: input.tags,
        image: { type: 'image', path: uploadedPath ?? input.previous?.image?.path, alt: `${input.title.trim()}の画像` },
        ...(input.r18 ? { r18: true } : {}),
        publishedAt: Timestamp.fromDate(input.publishedAt),
        featured: input.featured,
        updatedAt: serverTimestamp(),
        ...(!input.previous || movingBetweenAudiences ? { createdAt: serverTimestamp() } : {}),
      }, { merge: Boolean(input.previous) && !movingBetweenAudiences });
      if (input.r18) transaction.set(indexRef, {
        title: input.title.trim(),
        description: input.description.trim(),
        publishedAt: Timestamp.fromDate(input.publishedAt),
        featured: input.featured,
        updatedAt: serverTimestamp(),
      });
      else transaction.delete(indexRef);
      if (input.previous && input.previous.r18 !== input.r18) transaction.delete(doc(services.db, previousCollectionName, input.id));
    });
    if (uploadedPath && input.previous?.image) await deleteObject(ref(services.storage, input.previous.image.path)).catch(() => undefined);
  } catch (error) {
    if (uploadedPath) await deleteObject(ref(services.storage, uploadedPath)).catch(() => undefined);
    throw error;
  }
}

export async function deleteBackAlleyPortfolio(item: FirebaseBackAlleyPortfolioItem) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  await Promise.all([
    deleteDoc(doc(services.db, item.r18 ? 'backAlleyR18PortfolioItems' : 'backAlleyPortfolioItems', item.id)),
    ...(item.r18 ? [deleteDoc(doc(services.db, 'backAlleyR18Index', item.id))] : []),
  ]);
  if (item.image) await deleteObject(ref(services.storage, item.image.path)).catch(() => undefined);
}
