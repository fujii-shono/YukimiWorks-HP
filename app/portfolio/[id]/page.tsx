import type { Metadata } from 'next';
import { Fragment } from 'react';
import { notFound } from 'next/navigation';
import { PortfolioMedia } from '@/components/portfolio/PortfolioMedia';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { portfolioItems } from '@/data/portfolio';
import { siteConfig } from '@/data/siteConfig';
import { formatJapaneseDate } from '@/lib/format';
import { getAllPortfolioItems } from '@/lib/firebase/content.server';

export const dynamic = 'force-dynamic';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const TRAILING_URL_PUNCTUATION = /[.,!?;:。、」』】］｝）》〉]+$/u;

function PortfolioDescription({ value }: { value: string }) {
  const nodes = [];
  let cursor = 0;

  for (const match of value.matchAll(URL_PATTERN)) {
    const matchedUrl = match[0];
    const start = match.index ?? cursor;
    const trailing = matchedUrl.match(TRAILING_URL_PUNCTUATION)?.[0] ?? '';
    const url = trailing ? matchedUrl.slice(0, -trailing.length) : matchedUrl;
    if (start > cursor) nodes.push(value.slice(cursor, start));
    nodes.push(<a key={`${start}-${url}`} className="message-inline-link" href={url} target="_blank" rel="noopener noreferrer">{url}</a>);
    if (trailing) nodes.push(trailing);
    cursor = start + matchedUrl.length;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return <p>{nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>)}</p>;
}

export function generateStaticParams() {
  return portfolioItems.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = (await getAllPortfolioItems()).find((entry) => entry.id === params.id);
  if (!item) return {};

  const title = item.seoTitle ?? `${item.title} | YukimiWorks`;
  const description = item.seoDescription ?? item.description ?? `${item.title} のポートフォリオ詳細ページです。`;
  const thumbnail = item.content.kind === 'image' ? item.content.src : item.content.thumbnail;
  const ogImage = item.content.kind === 'html' ? item.content.thumbnail : (item.ogImage ?? thumbnail);
  const ogImageWidth = item.ogImageWidth;
  const ogImageHeight = item.ogImageHeight;
  const resolvedOgImage = ogImage
    ? (ogImage.startsWith('http') ? ogImage : `${siteConfig.siteUrl}${ogImage}`)
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.siteUrl}/portfolio/${item.id}`,
    },
    ...(item.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}/portfolio/${item.id}`,
      type: 'article',
      ...(resolvedOgImage
        ? {
            images: [
              {
                url: resolvedOgImage,
                alt: `${item.title} のサムネイル`,
                ...(ogImageWidth ? { width: ogImageWidth } : {}),
                ...(ogImageHeight ? { height: ogImageHeight } : {}),
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(resolvedOgImage ? { images: [resolvedOgImage] } : {}),
    },
  };
}

export default async function PortfolioDetailPage({ params }: { params: { id: string } }) {
  const item = (await getAllPortfolioItems()).find((entry) => entry.id === params.id);
  if (!item) notFound();

  return (
    <SiteFrame>
      <section className="window-panel single-panel-body detail-panel portfolio-detail-panel">
        <Link href="/portfolio" className="back-link">
          &larr; ポートフォリオ一覧へ戻る
        </Link>
        <div className="page-intro portfolio-detail-intro">
          <h2>{item.title}</h2>
          <hr />
        </div>
        <div className="portfolio-detail-media">
          <PortfolioMedia
            item={item}
            variant="modal"
            className={item.content.kind === 'image' ? 'portfolio-detail-image' : 'portfolio-detail-html'}
          />
        </div>
        <div className="detail-body portfolio-detail-body">
          {item.description ? <PortfolioDescription value={item.description} /> : null}
          {item.date || item.year ? (
            <p className="card-meta portfolio-modal-date">{item.date ? formatJapaneseDate(item.date) : String(item.year)}</p>
          ) : null}
        </div>
        {item.tags?.length ? (
          <div className="tag-list portfolio-detail-tags">
            {item.tags.map((tag) => (
              <span key={tag} className="tag-badge">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </section>
    </SiteFrame>
  );
}
