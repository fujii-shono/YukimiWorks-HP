import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { RichBody, type RichBodySegment } from '@/components/ui/RichBody';
import { siteConfig } from '@/data/siteConfig';
import { getAllGoods } from '@/lib/firebase/content.server';

export const dynamic = 'force-dynamic';

function getDescription(body: RichBodySegment[] | string, title: string) {
  const text = typeof body === 'string'
    ? body
    : body.flatMap((segment) => segment.type === 'text' || segment.type === 'strikethrough' ? [segment.value] : []).join(' ');
  return text.replace(/\s+/g, ' ').trim().slice(0, 160) || title;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = (await getAllGoods()).find((candidate) => candidate.id === id);
  if (!item) return {};

  const title = item.seoTitle ?? `${item.title} | 溶けたアイス`;
  const description = item.seoDescription ?? getDescription(item.body, item.title);
  const image = item.thumbnail
    ? (item.thumbnail.startsWith('http') ? item.thumbnail : `${siteConfig.siteUrl}${item.thumbnail}`)
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `${siteConfig.siteUrl}/goods/${item.id}` },
    ...(item.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}/goods/${item.id}`,
      type: 'article',
      ...(image ? { images: [{ url: image, alt: `${item.title}のサムネイル` }] } : {}),
    },
  };
}

export default async function GoodsDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = (await getAllGoods()).find((candidate) => candidate.id === id);
  if (!item) notFound();

  return (
    <SiteFrame>
      <section className="window-panel single-panel-body detail-panel">
        <Link href="/goods" className="back-link">&larr; グッズ一覧へ戻る</Link>
        <div className="page-intro"><h2>{item.title}</h2><hr /></div>
        {item.thumbnail ? (
          <Image src={item.thumbnail} alt={`${item.title}のサムネイル`} width={800} height={450} className="detail-media" unoptimized />
        ) : null}
        {item.body ? <RichBody body={item.body} className="detail-body-center" /> : null}
      </section>
    </SiteFrame>
  );
}
