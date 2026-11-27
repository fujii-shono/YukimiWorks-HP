'use client';

import { collection, deleteDoc, doc, onSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, type DocumentData, type QueryDocumentSnapshot, type Unsubscribe } from 'firebase/firestore';
import { getFirebaseServices } from '@/lib/firebase/client';
import { deleteContentMedia, uploadContentFiles } from '@/lib/firebase/content';
import type { FirebaseContentMedia, FirebaseSiteLink } from '@/lib/firebase/types';
import { isSafeLinkHref } from '@/lib/format';

function isImage(value: unknown): value is FirebaseContentMedia {
  if (!value || typeof value !== 'object') return false;
  const image = value as Partial<FirebaseContentMedia>;
  return image.type === 'image' && typeof image.url === 'string' && typeof image.path === 'string' && typeof image.alt === 'string';
}

function parseLink(snapshot: QueryDocumentSnapshot<DocumentData>): FirebaseSiteLink | null {
  const data = snapshot.data();
  if (typeof data.label !== 'string' || typeof data.url !== 'string' || !isSafeLinkHref(data.url)) return null;
  return {
    id: snapshot.id,
    label: data.label,
    url: data.url,
    banner: isImage(data.banner) ? data.banner : undefined,
    order: typeof data.order === 'number' && Number.isFinite(data.order) ? data.order : 0,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

export function subscribeToSiteLinks(onItems: (items: FirebaseSiteLink[]) => void, onError?: () => void): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onItems([]);
    return () => {};
  }
  return onSnapshot(
    query(collection(services.db, 'links'), orderBy('order', 'asc')),
    (snapshot) => onItems(snapshot.docs.map(parseLink).filter((item): item is FirebaseSiteLink => item !== null)),
    () => onError?.(),
  );
}

export async function uploadSiteLinkBanner(id: string, file: File) {
  const [banner] = await uploadContentFiles('links', id, [file], true);
  if (!banner) throw new Error('バナー画像をアップロードできませんでした。');
  return banner;
}

export async function saveSiteLink(value: { id: string; label: string; url: string; order: number; banner?: FirebaseContentMedia }, creating: boolean) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  const label = value.label.trim();
  const url = value.url.trim();
  if (!label || label.length > 120) throw new Error('リンク名を120文字以内で入力してください。');
  if (!isSafeLinkHref(url)) throw new Error('リンク先はhttp(s) URLまたは「/」から始まるサイト内パスを入力してください。');
  if (!Number.isInteger(value.order) || value.order < -9999 || value.order > 9999) throw new Error('表示順は-9999から9999までの整数で入力してください。');

  const linkRef = doc(services.db, 'links', value.id);
  const stored = { label, url, order: value.order, banner: value.banner ?? null, updatedAt: serverTimestamp(), ...(creating ? { createdAt: serverTimestamp() } : {}) };
  if (creating) {
    await runTransaction(services.db, async (transaction) => {
      if ((await transaction.get(linkRef)).exists()) throw new Error('同じIDのリンクがすでに存在します。もう一度お試しください。');
      transaction.set(linkRef, stored);
    });
  } else {
    await setDoc(linkRef, stored, { merge: true });
  }
}

export async function deleteSiteLink(item: FirebaseSiteLink) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  await deleteDoc(doc(services.db, 'links', item.id));
  if (item.banner) await deleteContentMedia([item.banner]);
}

