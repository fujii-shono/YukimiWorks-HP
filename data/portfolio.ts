export type PortfolioMediaVariant = 'preview' | 'card' | 'modal';

export type PortfolioHtmlComponentId = 'pixel-window' | 'hikage-scene' | 'rainy-day-scene' | 'saru-demo-scene';

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
  content: PortfolioContent;
  description?: string;
  date?: string;
  year?: number;
  tags?: string[];
  featured?: boolean;
};

export const portfolioItems: PortfolioItem[] = [
  {
    id: 'saru-demo',
    title: '猿でもシェイクスピア',
    href: '/portfolio/saru-demo',
    content: {
      kind: 'html',
      componentId: 'saru-demo-scene',
      thumbnail: '/portfolio/saru-demo/saru.png',
      width: 900,
      height: 700,
      fitHeightToContent: true,
    },
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
