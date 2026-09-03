export type PortfolioMediaVariant = 'preview' | 'card' | 'modal';
export type PortfolioCategory = 'illustration' | 'html-art' | 'game';

export type PortfolioHtmlComponentId =
  | 'pixel-window'
  | 'hikage-scene'
  | 'rainy-day-scene'
  | 'saru-demo-scene'
  | 'kokoro-scene'
  | 'maid-scene'
  | 'hanabi-scene';

export type PortfolioImageContent = {
  kind: 'image';
  src: string;
  alt: string;
};

export type PortfolioHtmlContent = {
  kind: 'html';
  componentId: PortfolioHtmlComponentId;
  thumbnail?: string;
  width?: number;
  height?: number;
  fitHeightToContent?: boolean;
};

export type PortfolioContent = PortfolioImageContent | PortfolioHtmlContent;

export type PortfolioItem = {
  id: string;
  title: string;
  href: string;
  category: PortfolioCategory;
  content: PortfolioContent;
  ogImage?: string;
  ogImageWidth?: number;
  ogImageHeight?: number;
  description?: string;
  date?: string;
  year?: number;
  tags?: string[];
  featured?: boolean;
};

export const portfolioCategoryLabels: Record<PortfolioCategory, string> = {
  illustration: 'イラスト',
  'html-art': 'HTMLアート',
  game: 'ゲーム',
};

export const portfolioItems: PortfolioItem[] = [
  {
    id: 'to-applechan',
    title: '🍎',
    href: '/portfolio/to-applechan',
    category: 'illustration',
    content: {
      kind: 'image',  
      src: '/portfolio/skeb/to-applechan.png',
      alt: '70centsApple様ご依頼'
    },
    description: '70centsApple様からのご依頼でした！ありがとうございました。',
    date: '2026-09-03',
    year: 2026,
    tags: ['イラスト'],
    featured: true,
  },
  {
    id: 'to-eda',
    title: '小日向えだ様キービジュアル',
    href: '/portfolio/to-eda',
    category: 'illustration',
    content: {
      kind: 'image',  
      src: '/portfolio/skeb/to-eda.png',
      alt: '小日向えだ様ご依頼'
    },
    description: '小日向えだ様からのご依頼でした！ありがとうございました。',
    date: '2026-08-11',
    year: 2026,
    tags: ['イラスト'],
    featured: true,
  },
  {
    id: 'hanabi',
    title: '花火大会',
    href: '/portfolio/hanabi',
    category: 'html-art',
    content: {
      kind: 'html',
      componentId: 'hanabi-scene',
      width: 681,
      height: 1000,
      thumbnail: '/portfolio/hanabi/thumbnail.png'
    },
    ogImage: '/portfolio/hanabi/base.png',
    ogImageWidth: 681,
    ogImageHeight: 1000,
    description: '開催時刻 毎日19:00〜21:00',
    date: '2026-08-05',
    year: 2026,
    tags: ['HTML', '時間イベント', 'イラスト'],
    featured: true,
  },
  {
    id: 'to-kiririno',
    title: '🐈️🩵',
    href: '/portfolio/to-kiririno',
    category: 'illustration',
    content: {
      kind: 'image',  
      src: '/portfolio/skeb/to-kiririno.png',
      alt: 'きりりの様ご依頼'
    },
    description: 'きりりの様からのご依頼でした！ありがとうございました。',
    date: '2026-08-03',
    year: 2026,
    tags: ['イラスト'],
    featured: true,
  },
  {
    id: 'dame-tensi',
    title: 'だめ天使',
    href: '/portfolio/dame-tensi',
    category: 'illustration',
    content: {
      kind: 'image',  
      src: '/portfolio/illust/dametensi.png',
      alt: 'だめ天使'
    },
    description: '天使なのに圧倒的不安感。なにかしでかしそう...',
    date: '2026-07-28',
    year: 2026,
    tags: ['イラスト'],
    featured: true,
  },
  {
    id: 'maid',
    title: 'そんなに指動かして何してるにゃ？',
    href: '/portfolio/maid',
    category: 'html-art',
    content: {
      kind: 'html',
      componentId: 'maid-scene',
      width: 669,
      height: 1000,
      thumbnail: '/portfolio/maid/thumbnail.png'
    },
    ogImage: '/portfolio/maid/base.png',
    ogImageWidth: 669,
    ogImageHeight: 1000,
    description: '「すっごい気が散るにゃ...」\n（タップに合わせて目線が動くよ）',
    date: '2026-07-24',
    year: 2026,
    tags: ['HTML', 'クリックイベント', 'イラスト'],
    featured: true,
  },
  {
    id: 'to-limy',
    title: '💎✨️',
    href: '/portfolio/to-limy',
    category: 'illustration',
    content: {
      kind: 'image',  
      src: '/portfolio/skeb/to-limy.png',
      alt: 'limy様ご依頼'
    },
    description: 'limy様からのご依頼でした！ありがとうございました。',
    date: '2026-07-21',
    year: 2026,
    tags: ['イラスト'],
    featured: true,
  },
  {
    id: 'kokoro-fanart',
    title: 'すやすや',
    href: '/portfolio/kokoro-fanart',
    category: 'html-art',
    content: {
      kind: 'html',
      componentId: 'kokoro-scene',
      thumbnail: '/portfolio/kokoro/kokoro.png',
      width: 629,
      height: 1000,
    },
    description: '天宮こころ様のファンアートになります。今回は画面タップ/クリックで一部が動きます。',
    date: '2026-07-20',
    year: 2026,
    tags: ['HTML', 'クリックイベント', 'イラスト'],
    featured: true,
  },
  {
    id: 'saru-demo',
    title: '猿でもシェイクスピア',
    href: '/portfolio/saru-demo',
    category: 'game',
    content: {
      kind: 'html',
      componentId: 'saru-demo-scene',
      thumbnail: '/portfolio/saru-demo/saru-og.png',
      width: 900,
      height: 700,
      fitHeightToContent: true,
    },
    ogImage: '/portfolio/saru-demo/saru-og.png',
    ogImageWidth: 1024,
    ogImageHeight: 1024,
    description:
      '猿でもランダムにタイプライターを叩けば、いつかは偶然シェイクスピアの作品を完成させられるという思考実験の地獄を味わえるゲームです。',
    date: '2026-07-18',
    year: 2026,
    tags: ['HTML', 'ゲーム', 'ランダム'],
    featured: true,
  },
  {
    id: 'rainy-day',
    title: '雨の日も悪くない',
    href: '/portfolio/rainy-day',
    category: 'html-art',
    content: {
      kind: 'html',
      componentId: 'rainy-day-scene',
      thumbnail: '/portfolio/rainy-day/rainy-day.png',
      width: 1623,
      height: 1200,
    },
    description: '雨の日のお家のワクワク感を表現してみました。今回は時間経過で何かが変わります。探してみてね。',
    tags: ['HTML', '時間変化', 'イラスト'],
    featured: true,
  },
  {
    id: 'hikage',
    title: 'HTMLアート試作1号',
    href: '/portfolio/hikage',
    category: 'html-art',
    content: {
      kind: 'html',
      componentId: 'hikage-scene',
      thumbnail: '/portfolio/hikage/hikage.png',
      width: 719,
      height: 1200,
    },
    description: '習作です。時間帯による背景の変化とエフェクトを加えてみました。昼 / 夜にまた来てください。背景が変化します。',
    date: '2026-07-14',
    year: 2026,
    tags: ['HTML', '時間変化', 'イラスト'],
    featured: true,
  },
];

export function getPortfolioItemById(id: string) {
  return portfolioItems.find((item) => item.id === id);
}
