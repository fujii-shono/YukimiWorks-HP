'use client';

import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { deleteObject, getBlob, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { getFirebaseServices } from '@/lib/firebase/client';
import type { FirebaseMessage, FirebaseMessageImage, XPostStatus } from '@/lib/firebase/types';

export const MAX_MESSAGE_IMAGES = 4;
export const MAX_MESSAGE_IMAGE_BYTES = 10 * 1024 * 1024;
export const MAX_MESSAGE_BODY_LENGTH = 300;

function parseMessage(snapshot: QueryDocumentSnapshot<DocumentData>): FirebaseMessage | null {
  const data = snapshot.data();
  if (typeof data.body !== 'string' || !(data.publishedAt instanceof Timestamp) || !Array.isArray(data.images)) return null;

  const images = data.images.filter(
    (image: unknown): image is FirebaseMessageImage =>
      Boolean(
        image &&
          typeof image === 'object' &&
          'path' in image &&
          typeof image.path === 'string' &&
          'alt' in image &&
          typeof image.alt === 'string',
      ),
  );
  const validXStatuses: XPostStatus[] = ['not_requested', 'pending', 'posting', 'posted', 'failed', 'skipped_too_long'];
  const xPostStatus = validXStatuses.includes(data.xPostStatus) ? data.xPostStatus : data.postToX === true ? 'pending' : 'not_requested';

  return {
    id: snapshot.id,
    body: data.body,
    authorName: typeof data.authorName === 'string' ? data.authorName : undefined,
    images: images.slice(0, MAX_MESSAGE_IMAGES),
    audience: data.audience === 'back-alley' ? 'back-alley' : 'front',
    postToX: data.postToX === true,
    xPostStatus,
    xPostId: typeof data.xPostId === 'string' ? data.xPostId : undefined,
    xPostError: typeof data.xPostError === 'string' ? data.xPostError : undefined,
    xPostAttemptedAt: data.xPostAttemptedAt instanceof Timestamp ? data.xPostAttemptedAt : undefined,
    xPostedAt: data.xPostedAt instanceof Timestamp ? data.xPostedAt : undefined,
    publishedAt: data.publishedAt,
    createdAt: data.createdAt instanceof Timestamp ? data.createdAt : undefined,
    updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt : undefined,
  };
}

export function subscribeToFirebaseMessages(
  onMessages: (messages: FirebaseMessage[]) => void,
  onError?: () => void,
  includeBackAlley = false,
  includeR18 = false,
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onMessages([]);
    return () => {};
  }

  let front: FirebaseMessage[] = [];
  let back: FirebaseMessage[] = [];
  let r18: FirebaseMessage[] = [];
  const publish = () => onMessages([...front, ...back, ...r18].sort((a, b) => b.publishedAt.toMillis() - a.publishedAt.toMillis()));
  const frontQuery = query(collection(services.db, 'messages'), orderBy('publishedAt', 'desc'));
  const unsubscribes = [onSnapshot(frontQuery, (snapshot) => {
    front = snapshot.docs.map(parseMessage).filter((message): message is FirebaseMessage => message !== null).map((message) => ({ ...message, audience: 'front' }));
    publish();
  }, () => onError?.())];
  if (includeBackAlley) {
    const backQuery = query(collection(services.db, 'backAlleyMessages'), orderBy('publishedAt', 'desc'));
    unsubscribes.push(onSnapshot(backQuery, (snapshot) => {
      back = snapshot.docs.map(parseMessage).filter((message): message is FirebaseMessage => message !== null).map((message) => ({ ...message, audience: 'back-alley' }));
      publish();
    }, () => onError?.()));
  }
  if (includeR18) {
    const r18Query = query(collection(services.db, 'backAlleyR18Messages'), orderBy('publishedAt', 'desc'));
    unsubscribes.push(onSnapshot(r18Query, (snapshot) => {
      r18 = snapshot.docs.map(parseMessage).filter((message): message is FirebaseMessage => message !== null).map((message) => ({ ...message, audience: 'r18' }));
      publish();
    }, () => onError?.()));
  }
  return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
}

function validateFiles(files: File[], existingCount: number) {
  if (files.length + existingCount > MAX_MESSAGE_IMAGES) throw new Error(`画像は最大${MAX_MESSAGE_IMAGES}枚までです。`);
  for (const file of files) {
    if (!file.type.startsWith('image/')) throw new Error('画像ファイルだけアップロードできます。');
    if (file.size > MAX_MESSAGE_IMAGE_BYTES) throw new Error('画像1枚の上限は10MBです。');
  }
}

async function uploadMessageImages(messageId: string, files: File[], audience: 'front' | 'back-alley' | 'r18') {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');

  return Promise.all(
    files.map(async (file) => {
      const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
      const path = audience === 'r18'
        ? `protected/back-alley/r18/messages/${messageId}/${crypto.randomUUID()}${extension}`
        : audience === 'back-alley'
          ? `protected/back-alley/messages/${messageId}/${crypto.randomUUID()}${extension}`
          : `messages/${messageId}/${crypto.randomUUID()}${extension}`;
      const imageRef = ref(services.storage, path);
      await uploadBytes(imageRef, file, { contentType: file.type });
      return {
        ...(audience === 'front' ? { url: await getDownloadURL(imageRef) } : {}),
        path,
        alt: 'メッセージ添付画像',
      } satisfies FirebaseMessageImage;
    }),
  );
}

export async function saveFirebaseMessage({
  id,
  body,
  authorName,
  publishedAt,
  existingImages,
  newFiles,
  postToX,
  audience = 'front',
  previousAudience,
  skipXPostForLength = false,
  retrySkippedXPost = false,
}: {
  id?: string;
  body: string;
  authorName: string;
  publishedAt: Date;
  existingImages: FirebaseMessageImage[];
  newFiles: File[];
  postToX: boolean;
  audience?: 'front' | 'back-alley' | 'r18';
  previousAudience?: 'front' | 'back-alley' | 'r18';
  skipXPostForLength?: boolean;
  retrySkippedXPost?: boolean;
}) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');

  const normalizedBody = body.trim();
  const normalizedAuthorName = authorName.trim().slice(0, 30) || '管理者';
  if (!normalizedBody || normalizedBody.length > MAX_MESSAGE_BODY_LENGTH) {
    throw new Error(`本文は1〜${MAX_MESSAGE_BODY_LENGTH}文字で入力してください。`);
  }
  if (Number.isNaN(publishedAt.getTime())) throw new Error('公開日時を入力してください。');
  validateFiles(newFiles, existingImages.length);

  if (id && previousAudience && previousAudience !== audience && existingImages.length) {
    throw new Error('公開先を変更する場合は、既存画像を削除して再アップロードしてください。');
  }
  const collectionName = audience === 'r18' ? 'backAlleyR18Messages' : audience === 'back-alley' ? 'backAlleyMessages' : 'messages';
  const messageRef = id ? doc(services.db, collectionName, id) : doc(collection(services.db, collectionName));
  const movingBetweenAudiences = Boolean(id && previousAudience && previousAudience !== audience);
  const uploadedImages = await uploadMessageImages(messageRef.id, newFiles, audience);

  try {
    await setDoc(
      messageRef,
      {
        body: normalizedBody,
        authorName: normalizedAuthorName,
        images: [...existingImages, ...uploadedImages],
        audience,
        postToX,
        publishedAt: Timestamp.fromDate(publishedAt),
        updatedAt: serverTimestamp(),
        ...(!id || movingBetweenAudiences ? { createdAt: serverTimestamp() } : {}),
        ...(id
          ? retrySkippedXPost
            ? { xPostStatus: 'pending', xPostError: null, xPostAttemptedAt: null }
            : {}
          : {
              xPostStatus: postToX ? (skipXPostForLength ? 'skipped_too_long' : 'pending') : 'not_requested',
              xPostId: null,
              xPostError: null,
              xPostAttemptedAt: null,
              xPostedAt: null,
            }),
      },
      { merge: Boolean(id) && !movingBetweenAudiences },
    );
    if (id && previousAudience && previousAudience !== audience) {
      const previousCollection = previousAudience === 'r18' ? 'backAlleyR18Messages' : previousAudience === 'back-alley' ? 'backAlleyMessages' : 'messages';
      await deleteDoc(doc(services.db, previousCollection, id));
    }
  } catch (error) {
    await Promise.allSettled(uploadedImages.map((image) => deleteObject(ref(services.storage, image.path))));
    throw error;
  }

  return { id: messageRef.id, images: [...existingImages, ...uploadedImages] };
}

export async function getProtectedMediaUrl(path: string) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  const blob = await getBlob(ref(services.storage, path));
  return URL.createObjectURL(blob);
}

export async function deleteFirebaseMessage(message: FirebaseMessage) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  const collectionName = message.audience === 'r18' ? 'backAlleyR18Messages' : message.audience === 'back-alley' ? 'backAlleyMessages' : 'messages';
  await deleteDoc(doc(services.db, collectionName, message.id));
  await Promise.allSettled(message.images.map((image) => deleteObject(ref(services.storage, image.path))));
}

export async function deleteMessageImages(images: FirebaseMessageImage[]) {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.allSettled(images.map((image) => deleteObject(ref(services.storage, image.path))));
}
