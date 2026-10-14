import 'server-only';

import { unstable_noStore as noStore } from 'next/cache';
import { getFirebaseAdminServices } from '@/lib/firebase/admin';

const BACK_ALLEY_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,78}[a-z0-9])?$/;

type BackAlleyOgpDataBase = {
  id: string;
  title: string;
  description: string;
};

export type BackAlleyOgpData =
  | (BackAlleyOgpDataBase & { kind: 'regular'; imagePath: string; imageAlt: string })
  | (BackAlleyOgpDataBase & { kind: 'r18' });

function isPublished(value: unknown) {
  if (!value || typeof value !== 'object' || !('toMillis' in value) || typeof value.toMillis !== 'function') return false;
  return value.toMillis() <= Date.now();
}

function text(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export async function getBackAlleyOgpData(id: string): Promise<BackAlleyOgpData | null> {
  noStore();
  if (!BACK_ALLEY_ID_PATTERN.test(id)) return null;

  try {
    const { db } = getFirebaseAdminServices();
    const [regularSnapshot, r18Snapshot] = await Promise.all([
      db.collection('backAlleyPortfolioItems').doc(id).get(),
      db.collection('backAlleyR18Index').doc(id).get(),
    ]);

    // 万一同一IDが両コレクションに存在しても、R18画像の非公開を優先する。
    if (r18Snapshot.exists) {
      const data = r18Snapshot.data();
      if (data && typeof data.title === 'string' && isPublished(data.publishedAt)) {
        return {
          kind: 'r18',
          id,
          title: data.title,
          description: text(data.description),
        };
      }
    }

    if (regularSnapshot.exists) {
      const data = regularSnapshot.data();
      const image = data?.image;
      const expectedPrefix = `protected/back-alley/portfolio/${id}/`;
      if (
        data
        && typeof data.title === 'string'
        && isPublished(data.publishedAt)
        && image
        && typeof image === 'object'
        && image.type === 'image'
        && typeof image.path === 'string'
        && image.path.startsWith(expectedPrefix)
      ) {
        return {
          kind: 'regular',
          id,
          title: data.title,
          description: text(data.description),
          imagePath: image.path,
          imageAlt: text(image.alt) || `${data.title}のサムネイル`,
        };
      }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') console.warn('[back-alley-ogp] metadata could not be loaded', error);
  }

  return null;
}
