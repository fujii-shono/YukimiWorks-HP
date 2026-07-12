export type PortfolioItem = {
  id: string;
  title: string;
  image: string;
  alt: string;
  description?: string;
  year?: number;
  tags?: string[];
  featured?: boolean;
};

export const portfolioItems: PortfolioItem[] = [
  {
    id: 'sample-illustration-01',
    title: 'サンプルイラスト',
    image: '/portfolio/placeholder.svg',
    alt: 'サンプルイラスト',
    description: '後から実際の作品へ差し替えます。',
    year: 2026,
    tags: ['イラスト'],
  },
  {
    id: 'sample-illustration-02',
    title: '雪のドットポスター',
    image: '/portfolio/placeholder.svg',
    alt: '雪のドットポスター',
    description: 'ドット表現を基調にしたポスター作品です。',
    year: 2025,
    tags: ['ドット絵', 'ポスター'],
  },
];
