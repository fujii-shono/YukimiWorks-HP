import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PortfolioMedia } from '@/components/portfolio/PortfolioMedia';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { getGameItemById, gamesItems } from '@/data/games';
import { siteConfig } from '@/data/siteConfig';
import { formatJapaneseDate } from '@/lib/format';

export function generateStaticParams() {
  return gamesItems.map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const item = getGameItemById(params.id);
  if (!item) return {};

  const title = `${item.title} | YukimiWorks`;
  const description = item.description ?? `${item.title} のゲーム詳細ページです。`;
  const thumbnail = item.content.kind === 'image' ? item.content.src : item.content.thumbnail;
  const ogImage = item.ogImage ?? thumbnail;
  const ogImageWidth = item.ogImageWidth;
  const ogImageHeight = item.ogImageHeight;
  const resolvedOgImage = ogImage
    ? (ogImage.startsWith('http') ? ogImage : `${siteConfig.siteUrl}${ogImage}`)
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.siteUrl}/games/${item.id}`,
    },
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}/games/${item.id}`,
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

export default function GameDetailPage({ params }: { params: { id: string } }) {
  const item = getGameItemById(params.id);
  if (!item) notFound();

  return (
    <SiteFrame>
      <section className="window-panel single-panel-body detail-panel portfolio-detail-panel">
        <Link href="/games" className="back-link">
          &larr; ゲーム一覧へ戻る
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
          {item.description ? <p>{item.description}</p> : null}
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
