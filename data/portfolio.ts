export type PortfolioMediaVariant = 'preview' | 'card' | 'modal';

export type PortfolioHtmlComponentId = 'pixel-window';

export type PortfolioImageContent = {
  kind: 'image';
  src: string;
  alt: string;
};

export type PortfolioHtmlContent = {
  kind: 'html';
  componentId: PortfolioHtmlComponentId;
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
  // {
  //   id: 'sample-illustration-01',
  //   title: 'サンプルイラスト',
  //   href: '/works/pixel-guide-collection',
  //   content: {
  //     kind: 'image',
  //     src: '/portfolio/placeholder.svg',
  //     alt: 'サンプルイラスト',
  //   },
  //   description: '後から実際の作品へ差し替えます。',
  //   date: '2026-07-01',
  //   year: 2026,
  //   tags: ['イラスト'],
  // },
  // {
  //   id: 'sample-html-01',
  //   title: 'HTML展示サンプル',
  //   href: '/works/cocoa-app',
  //   content: {
  //     kind: 'html',
  //     componentId: 'pixel-window',
  //   },
  //   description: '専用コンポーネントで描画する展示用ポートフォリオです。',
  //   date: '2025-12-01',
  //   year: 2025,
  //   tags: ['HTML', '展示'],
  // },
];
