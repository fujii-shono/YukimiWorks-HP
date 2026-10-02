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
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
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
          'url' in image &&
          typeof image.url === 'string' &&
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
): Unsubscribe {
  const services = getFirebaseServices();
  if (!services) {
    onMessages([]);
    return () => {};
  }

  const messagesQuery = query(collection(services.db, 'messages'), orderBy('publishedAt', 'desc'));
  return onSnapshot(
    messagesQuery,
    (snapshot) => onMessages(snapshot.docs.map(parseMessage).filter((message): message is FirebaseMessage => message !== null)),
    () => onError?.(),
  );
}

function validateFiles(files: File[], existingCount: number) {
  if (files.length + existingCount > MAX_MESSAGE_IMAGES) throw new Error(`画像は最大${MAX_MESSAGE_IMAGES}枚までです。`);
  for (const file of files) {
    if (!file.type.startsWith('image/')) throw new Error('画像ファイルだけアップロードできます。');
    if (file.size > MAX_MESSAGE_IMAGE_BYTES) throw new Error('画像1枚の上限は10MBです。');
  }
}

async function uploadMessageImages(messageId: string, files: File[]) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');

  return Promise.all(
    files.map(async (file) => {
      const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')).toLowerCase() : '';
      const path = `messages/${messageId}/${crypto.randomUUID()}${extension}`;
      const imageRef = ref(services.storage, path);
      await uploadBytes(imageRef, file, { contentType: file.type });
      return {
        url: await getDownloadURL(imageRef),
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

  const messageRef = id ? doc(services.db, 'messages', id) : doc(collection(services.db, 'messages'));
  const uploadedImages = await uploadMessageImages(messageRef.id, newFiles);

  try {
    await setDoc(
      messageRef,
      {
        body: normalizedBody,
        authorName: normalizedAuthorName,
        images: [...existingImages, ...uploadedImages],
        postToX,
        publishedAt: Timestamp.fromDate(publishedAt),
        updatedAt: serverTimestamp(),
        ...(id
          ? retrySkippedXPost
            ? { xPostStatus: 'pending', xPostError: null, xPostAttemptedAt: null }
            : {}
          : {
              createdAt: serverTimestamp(),
              xPostStatus: postToX ? (skipXPostForLength ? 'skipped_too_long' : 'pending') : 'not_requested',
              xPostId: null,
              xPostError: null,
              xPostAttemptedAt: null,
              xPostedAt: null,
            }),
      },
      { merge: Boolean(id) },
    );
  } catch (error) {
    await Promise.allSettled(uploadedImages.map((image) => deleteObject(ref(services.storage, image.path))));
    throw error;
  }

  return { id: messageRef.id, images: [...existingImages, ...uploadedImages] };
}

export async function deleteFirebaseMessage(message: FirebaseMessage) {
  const services = getFirebaseServices();
  if (!services) throw new Error('Firebase が設定されていません。');
  await deleteDoc(doc(services.db, 'messages', message.id));
  await Promise.allSettled(message.images.map((image) => deleteObject(ref(services.storage, image.path))));
}

export async function deleteMessageImages(images: FirebaseMessageImage[]) {
  const services = getFirebaseServices();
  if (!services) return;
  await Promise.allSettled(images.map((image) => deleteObject(ref(services.storage, image.path))));
}
