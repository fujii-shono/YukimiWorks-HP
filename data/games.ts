import type { PortfolioItem } from '@/data/portfolio';

export type GameItem = PortfolioItem;

export const gamesItems: GameItem[] = [
  {
    id: 'saru-demo',
    title: '猿でもシェイクスピア',
    href: '/games/saru-demo',
    content: {
      kind: 'html',
      componentId: 'saru-demo-scene',
      thumbnail: '/portfolio/saru-demo/saru.png',
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
];

export function getGameItemById(id: string) {
  return gamesItems.find((item) => item.id === id);
}
