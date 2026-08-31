import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { AcrylicKeychainTool } from '@/components/works/AcrylicKeychainTool';
import { siteConfig } from '@/data/siteConfig';
import { works } from '@/data/works';

export function generateStaticParams() {
  return works.map((work) => ({ id: work.id }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const work = works.find((item) => item.id === params.id);
  if (!work) return {};

  const title = `${work.title} | YukimiWorks`;
  const description = work.description;
  const ogImage = work.thumbnail.trim()
    ? (work.thumbnail.startsWith('http') ? work.thumbnail : `${siteConfig.siteUrl}${work.thumbnail}`)
    : undefined;

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.siteUrl}/works/${work.id}`,
    },
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

export default function WorkDetailPage({ params }: { params: { id: string } }) {
  const work = works.find((item) => item.id === params.id);
  if (!work) notFound();

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
          {work.media?.map((media, index) =>
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
        <div className="detail-body detail-body-center">
          {typeof work.body === 'string' || !work.body ? (
            <p>{work.body ?? work.description}</p>
          ) : (
            work.body.map((segment, index) => {
              if (segment.type === 'text') return <p key={index}>{segment.value}</p>;
              if (segment.type === 'strikethrough') return <p key={index} className="detail-body-strikethrough">{segment.value}</p>;
              return (
                <p key={index}>
                  <Link href={segment.href} target="_blank" rel="noopener noreferrer">
                    {segment.label}
                  </Link>
                </p>
              );
            })
          )}
        </div>
        <div className="tag-list tag-list-center">
          {work.tags.map((tag) => (
            <span key={tag} className="tag-badge">
              {tag}
            </span>
          ))}
        </div>
        {work.id === 'acrylic-keychain-tool' ? <AcrylicKeychainTool /> : null}
      </section>
    </SiteFrame>
  );
}
