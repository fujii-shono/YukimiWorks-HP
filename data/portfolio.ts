export type PortfolioMediaVariant = 'preview' | 'card' | 'modal';

export type PortfolioHtmlComponentId = 'pixel-window' | 'hikage-scene';

export type PortfolioImageContent = {
  kind: 'image';
  src: string;
  alt: string;
};

export type PortfolioHtmlContent = {
  kind: 'html';
  componentId: PortfolioHtmlComponentId;
  thumbnail?: string;
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
    id: 'hikage',
    title: 'HTMLアート試作1号',
    href: '/portfolio',
    content: {
      kind: 'html',
      componentId: 'hikage-scene',
      thumbnail: '/portfolio/hikage.png',
    },
    description: '習作です。時間帯による背景の変化とエフェクトを加えてみました。昼 / 夜にまた来てください。背景が変化します。',
    date: '2026-07-14',
    year: 2026,
    tags: ['HTML', '時間変化', 'イラスト'],
    featured: true,
  },
];
