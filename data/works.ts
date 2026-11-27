export type WorkMedia = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
};

export type WorkBodySegment =
  | { type: 'text'; value: string }
  | { type: 'strikethrough'; value: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'media'; src: string; mediaType: 'image' | 'video'; alt?: string };

export type WorkCategory = 'games' | 'cg' | 'other';

export type Work = {
  id: string;
  title: string;
  body?: WorkBodySegment[] | string;
  category: WorkCategory;
  tags: string[];
  thumbnail: string;
  media?: WorkMedia[];
  date?: string;
  url?: string;
  featured?: boolean;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  noIndex?: boolean;
};

export const workCategoryLabels: Record<WorkCategory, string> = {
  games: 'ゲーム',
  cg: 'CG集',
  other: 'その他',
};

export function getWorkPlainText(work: Pick<Work, 'title' | 'body'>) {
  if (typeof work.body === 'string') return work.body.trim() || work.title;
  if (Array.isArray(work.body)) {
    const text = work.body
      .flatMap((segment) => segment.type === 'text' || segment.type === 'strikethrough' ? [segment.value] : [])
      .join('\n\n')
      .trim();
    return text || work.title;
  }
  return work.title;
}

export function getWorkDescription(work: Pick<Work, 'title' | 'body'>) {
  return getWorkPlainText(work).replace(/\s+/g, ' ').slice(0, 160);
}

export const works: Work[] = [
  /*
  {
    id: 'sample-game',
    title: 'サンプル作品',
    body:
      'ゲームやCG集など、サークル「溶けたアイス」の作品をここで紹介します。\n\nこの項目は表示確認用のサンプルです。',
    category: 'games',
    tags: ['サンプル'],
    thumbnail: '/works/placeholder.svg',
    media: [{ type: 'image', src: '/works/placeholder.svg', alt: 'サンプル作品の画像' }],
    featured: true,
  },
  */
];
