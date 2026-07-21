import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { formatJapaneseDate } from '@/lib/format';
import { manualNews, newsCategoryLabels } from '@/data/news';
import { siteConfig } from '@/data/siteConfig';

export function generateStaticParams() {
  return manualNews.map((article) => ({ id: article.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const article = manualNews.find((entry) => entry.id === params.id);
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

export default function NewsDetailPage({ params }: { params: { id: string } }) {
  const article = manualNews.find((entry) => entry.id === params.id);
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
        <div className="detail-body">
          {typeof article.body === 'string' || !article.body ? (
            <p>{article.body ?? article.summary}</p>
          ) : (
            article.body.map((segment, index) => {
              if (segment.type === 'text') return <p key={index}>{segment.value}</p>;
              if (segment.type === 'strikethrough') return <p key={index} className="detail-body-strikethrough">{segment.value}</p>;
              if (segment.type === 'link') {
                return (
                  <p key={index}>
                    <Link href={segment.href} target="_blank" rel="noopener noreferrer">
                      {segment.label}
                    </Link>
                  </p>
                );
              }
              return segment.mediaType === 'image' ? (
                <Image key={index} src={segment.src} alt={segment.alt ?? ''} width={800} height={450} className="detail-media" />
              ) : (
                <video key={index} src={segment.src} controls className="detail-media" />
              );
            })
          )}
        </div>
      </section>
    </SiteFrame>
  );
}
