export type WorkMedia = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
};

export type WorkBodySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

export type WorkCategory = 'contents' | 'tools' | 'apps';

export type Work = {
  id: string;
  title: string;
  description: string;
  body?: WorkBodySegment[] | string;
  category: WorkCategory;
  tags: string[];
  thumbnail: string;
  media?: WorkMedia[];
  date?: string;
  url?: string;
  featured?: boolean;
};

export const workCategoryLabels: Record<WorkCategory, string> = {
  contents: 'コンテンツ',
  tools: 'ツール開発',
  apps: 'アプリサービス',
};

export const works: Work[] = [
  // {
  //   id: 'pixel-guide-collection',
  //   title: 'ピクセルガイド集',
  //   description: 'ドット絵とレトロUIを題材にした記事・企画コンテンツです。',
  //   body: [
  //     {
  //       type: 'text',
  //       value:
  //         'レトロWeb、ピクセル表現、懐かしいUIをテーマにした読み物シリーズです。\n\n企画、執筆、構成、公開までを一貫して担当し、小さな発見がある読み心地を目指しました。',
  //     },
  //     {
  //       type: 'link',
  //       label: '紹介ページを見る',
  //       href: 'https://example.com/pixel-guide',
  //     },
  //   ],
  //   category: 'contents',
  //   tags: ['記事', '企画', 'レトロ'],
  //   thumbnail: '/works/placeholder.svg',
  //   media: [{ type: 'image', src: '/works/placeholder.svg', alt: 'ピクセルガイド集のダミー画像' }],
  //   featured: true,
  // },
  // {
  //   id: 'mini-ops-tool',
  //   title: 'Mini Ops Tool',
  //   description: '日常業務の小さな手間を減らすための社内向け支援ツールです。',
  //   body:
  //     'フォーム入力、一覧確認、定型処理を一つにまとめた軽量ツールです。\n\n操作を迷わせないこと、導入コストを低く抑えることを重視しました。',
  //   category: 'tools',
  //   tags: ['ツール', '業務効率化'],
  //   thumbnail: '/works/placeholder.svg',
  //   media: [{ type: 'image', src: '/works/placeholder.svg', alt: 'Mini Ops Tool のダミー画像' }],
  // },
  {
    id: 'tarif-web',
    title: 'Tarif -オンライン料金表-',
    description: 'オンラインで料金表を作れるサービスです。',
    body: [
      {
        type: 'text',
        value:
          'Tarif(タリフ)はオンライン上で料金表を作りURLで共有できるサービスです。\n\n共有した料金表からそのまま見積書を作成できます。',
      },
      {
        type: 'link',
        label: 'サービスリンク',
        href: 'https://tarif.jp',
      },
    ],
    category: 'apps',
    tags: ['webサービス'],
    thumbnail: '/tarif/hero.png',
    media: [{ type: 'image', src: '/tarif/hero.png', alt: 'サービス紹介' }],
    date: '2026-07-14',
    featured: true,
  },
  {
    id: 'cocoa-app',
    title: 'Cocoa',
    description: 'まるでSNSのように使える、オフラインの写真管理アプリです。',
    body: [
      {
        type: 'text',
        value:
          'Cocoa は撮った写真をSNSのように管理し楽しめるアプリです。\n\n昔の写真が定期的にリポップし、過去の思い出に浸ることができます。',
      },
      {
        type: 'link',
        label: 'アプリ紹介',
        href: 'https://yukimi-works.co.jp/cocoa',
      },
      {
        type: 'link',
        label: 'プライバシーポリシー',
        href: 'https://yukimi-works.co.jp/cocoa/privacy-policy',
      },
    ],
    category: 'apps',
    tags: ['スマホアプリ', 'iOS'],
    thumbnail: '/cocoa/hero.png',
    media: [{ type: 'image', src: '/cocoa/hero.png', alt: 'アプリ紹介' }],
    featured: true,
  },
];
