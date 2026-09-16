import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { DiaryBody } from '@/components/ui/DiaryBody';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import {
  defaultDiaryEyecatch,
  diaryCategoryLabels,
  diaryEntries,
  getDiaryDate,
  getDiaryId,
  getDiaryPublishedTime,
  getDiaryTime,
  isDiaryPublished,
} from '@/data/diary';
import { siteConfig } from '@/data/siteConfig';
import { formatJapaneseDate } from '@/lib/format';

function getDiaryEyecatch(entry: (typeof diaryEntries)[number]) {
  return entry.eyecatch?.trim() || defaultDiaryEyecatch;
}

function toAbsoluteUrl(path: string) {
  return path.startsWith('http') ? path : `${siteConfig.siteUrl}${path}`;
}

export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return diaryEntries.filter((entry) => isDiaryPublished(entry)).map((entry) => ({ id: getDiaryId(entry) }));
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const entry = diaryEntries.find((item) => getDiaryId(item) === params.id);
  if (!entry || !isDiaryPublished(entry)) return {};

  const title = entry.seoTitle ?? `${entry.title} | YukimiWorks`;
  const description = entry.seoDescription ?? entry.body.replaceAll('\n', ' ').slice(0, 160);
  const ogImage = toAbsoluteUrl(entry.ogImage ?? getDiaryEyecatch(entry));

  return {
    title,
    description,
    alternates: {
      canonical: `${siteConfig.siteUrl}/diary/${getDiaryId(entry)}`,
    },
    ...(entry.noIndex ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title,
      description,
      url: `${siteConfig.siteUrl}/diary/${getDiaryId(entry)}`,
      type: 'article',
      publishedTime: getDiaryPublishedTime(entry),
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function DiaryDetailPage({ params }: { params: { id: string } }) {
  const entry = diaryEntries.find((item) => getDiaryId(item) === params.id);
  if (!entry || !isDiaryPublished(entry)) notFound();

  const eyecatch = getDiaryEyecatch(entry);

  return (
    <SiteFrame>
      <section className="window-panel single-panel-body detail-panel">
        <Link href="/diary" className="back-link">
          &larr; 日記一覧へ戻る
        </Link>
        <div className="page-intro">
          <h2>{entry.title}</h2>
          <p>
            {formatJapaneseDate(getDiaryDate(entry))} {getDiaryTime(entry)}
          </p>
          <hr />
        </div>
        <div className="tag-list tag-list-center">
          <span className="tag-badge">{diaryCategoryLabels[entry.category]}</span>
        </div>
        <SleepWarningImage
          src={eyecatch}
          alt={entry.eyecatchAlt ?? `${entry.title}のアイキャッチ`}
          width={800}
          height={450}
          className="detail-media"
        />
        <DiaryBody body={entry.body} />
      </section>
    </SiteFrame>
  );
}
