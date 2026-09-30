import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { RichBody } from '@/components/ui/RichBody';
import { formatJapaneseDate } from '@/lib/format';
import { manualNews, newsCategoryLabels } from '@/data/news';
import { siteConfig } from '@/data/siteConfig';
import { getAllManualNews } from '@/lib/firebase/content.server';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return manualNews.map((article) => ({ id: article.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const article = (await getAllManualNews()).find((entry) => entry.id === params.id);
  if (!article) return {};

  const title = article.seoTitle ?? `${article.title} | YukimiWorks`;
  const description = article.seoDescription ?? article.summary.slice(0, 160);
  const ogImage = article.ogImage
    ?? (article.thumbnail.trim()
      ? (article.thumbnail.startsWith('http') ? article.thumbnail : `${siteConfig.siteUrl}${article.thumbnail}`)
      : undefined);

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.siteUrl}/news/${article.id}`,
    },
    ...(article.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}/news/${article.id}`,
      type: 'article',
      publishedTime: article.date,
      ...(ogImage ? { images: [{ url: ogImage }] } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function NewsDetailPage({ params }: { params: { id: string } }) {
  const article = (await getAllManualNews()).find((entry) => entry.id === params.id);
  if (!article) notFound();

  const ogImage = article.ogImage
    ?? (article.thumbnail.trim()
      ? (article.thumbnail.startsWith('http') ? article.thumbnail : `${siteConfig.siteUrl}${article.thumbnail}`)
      : undefined);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.seoDescription ?? article.summary,
    datePublished: article.date,
    ...(ogImage ? { image: ogImage } : {}),
    publisher: {
      '@type': 'Organization',
      name: 'YukimiWorks',
      url: siteConfig.siteUrl,
    },
  };

  return (
    <SiteFrame>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="window-panel single-panel-body detail-panel">
        <Link href="/news" className="back-link">
          &larr; お知らせ一覧へ戻る
        </Link>
        <div className="page-intro">
          <h2>{article.title}</h2>
          <p>
            {formatJapaneseDate(article.date)} / {newsCategoryLabels[article.category]}
          </p>
          <hr />
        </div>
        {article.thumbnail.trim() ? (
          <SleepWarningImage src={article.thumbnail} alt={`${article.title}のサムネイル`} width={800} height={450} className="detail-media" />
        ) : null}
        <RichBody body={article.body ?? article.summary} />
      </section>
    </SiteFrame>
  );
}
