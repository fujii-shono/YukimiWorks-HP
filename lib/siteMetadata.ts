import type { Metadata } from 'next';
import { siteConfig } from '@/data/siteConfig';

export const circleMetadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  icons: {
    icon: '/logo/yukimi_works_favicon.png',
  },
  openGraph: {
    title: '同人サークル 溶けたアイス',
    description: 'サークル「溶けたアイス」のイベント参加、グッズ、ゲーム制作情報をまとめたサイトです。',
    images: [
      {
        url: '/logo/toketa-ice-og.webp',
        width: 1200,
        height: 630,
        alt: '同人サークル 溶けたアイス',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '同人サークル 溶けたアイス',
    description: 'サークル「溶けたアイス」のイベント参加、グッズ、ゲーム制作情報をまとめたサイトです。',
    images: ['/logo/toketa-ice-og.webp'],
  },
};
