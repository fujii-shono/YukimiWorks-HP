import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { RichBody } from '@/components/ui/RichBody';
import { AcrylicKeychainTool } from '@/components/works/AcrylicKeychainTool';
import { OdaiMaker } from '@/components/works/OdaiMaker';
import { siteConfig } from '@/data/siteConfig';
import { getWorkDescription, works } from '@/data/works';
import { getAllWorks } from '@/lib/firebase/content.server';
import { getCurrentWeeklyOdai } from '@/lib/odai/weekly.server';

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return works.map((work) => ({ id: work.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const work = (await getAllWorks()).find((item) => item.id === params.id);
  if (!work) return {};

  const title = work.seoTitle ?? `${work.title} | YukimiWorks`;
  const description = work.seoDescription ?? getWorkDescription(work);
  const ogImage = work.thumbnail.trim()
    ? (work.thumbnail.startsWith('http') ? work.thumbnail : `${siteConfig.siteUrl}${work.thumbnail}`)
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.siteUrl}/works/${work.id}`,
    },
    ...(work.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}/works/${work.id}`,
      type: 'article',
      ...(ogImage
        ? {
            images: [
              {
                url: ogImage,
                alt: `${work.title} のサムネイル`,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(ogImage ? { images: [ogImage] } : {}),
    },
  };
}

export default async function WorkDetailPage({ params }: { params: { id: string } }) {
  const work = (await getAllWorks()).find((item) => item.id === params.id);
  if (!work) notFound();
  const weeklyOdai = work.id === 'odai-maker' ? await getCurrentWeeklyOdai() : null;
  const thumbnail = work.thumbnail.trim();
  const additionalMedia = work.media?.filter((media) => media.src !== thumbnail);

  return (
    <SiteFrame>
      <section className="window-panel single-panel-body detail-panel">
        <Link href="/works" className="back-link">
          &larr; 制作実績一覧へ戻る
        </Link>
        <div className="page-intro">
          <h2>{work.title}</h2>
          <hr />
        </div>
        <div className="detail-media-stack">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={`${work.title}のサムネイル`}
              width={800}
              height={450}
              className="detail-media"
            />
          ) : null}
          {additionalMedia?.map((media, index) =>
            media.type === 'image' ? (
              <Image
                key={`${media.src}-${index}`}
                src={media.src}
                alt={media.alt ?? `${work.title}の画像`}
                width={800}
                height={600}
                className="detail-media"
              />
            ) : (
              <video key={`${media.src}-${index}`} src={media.src} controls className="detail-media" />
            ),
          )}
        </div>
        {work.body ? <RichBody body={work.body} className="detail-body-center" /> : null}
        <div className="tag-list tag-list-center">
          {work.tags.map((tag) => (
            <span key={tag} className="tag-badge">
              {tag}
            </span>
          ))}
        </div>
        {work.url ? (
          <p className="detail-body detail-body-center">
            <Link href={work.url} target="_blank" rel="noopener noreferrer" className="pixel-button">
              サービスを見る
            </Link>
          </p>
        ) : null}
        {work.id === 'acrylic-keychain-tool' ? <AcrylicKeychainTool /> : null}
        {work.id === 'odai-maker' ? <OdaiMaker weeklyOdai={weeklyOdai} /> : null}
      </section>
    </SiteFrame>
  );
}
