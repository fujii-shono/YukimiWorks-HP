import type { Metadata } from 'next';
import { siteConfig } from '@/data/siteConfig';
import { getBackAlleyOgpData } from '@/lib/firebase/backAlley.server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = await getBackAlleyOgpData(params.id);
  if (!item) return { robots: { index: false, follow: false, nocache: true } };

  const title = `${item.title} | YukimiWorks`;
  const description = item.description || `${item.title} の裏ポートフォリオ詳細ページです。`;
  const pageUrl = `${siteConfig.siteUrl}/back-alley/portfolio/${encodeURIComponent(item.id)}`;
  const imageUrl = `${siteConfig.siteUrl}/api/og/back-alley/portfolio/${encodeURIComponent(item.id)}`;
  const imageAlt = item.kind === 'r18' ? 'R18作品' : item.imageAlt;

  return {
    title,
    description,
    robots: { index: false, follow: false, nocache: true },
    alternates: { canonical: pageUrl },
    openGraph: {
      title,
      description,
      url: pageUrl,
      type: 'article',
      images: [{
        url: imageUrl,
        alt: imageAlt,
        ...(item.kind === 'r18' ? { width: 1200, height: 630 } : {}),
      }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default function BackAlleyPortfolioDetailLayout({ children }: { children: React.ReactNode }) {
  return children;
}
