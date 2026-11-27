import type { Metadata } from 'next';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { OdaiMaker } from '@/components/works/OdaiMaker';
import { siteConfig } from '@/data/siteConfig';
import { getCurrentWeeklyOdai } from '@/lib/odai/weekly.server';

const title = 'お題メーカー | 溶けたアイス';
const description = 'イラスト制作のきっかけになるお題をランダムに抽選できます。';
const canonicalUrl = `${siteConfig.siteUrl}/circle/odai-maker`;

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: canonicalUrl },
  openGraph: {
    title,
    description,
    url: canonicalUrl,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default async function OdaiMakerPage() {
  const weeklyOdai = await getCurrentWeeklyOdai();

  return (
    <SiteFrame>
      <section className="window-panel single-panel-body detail-panel">
        <div className="page-intro">
          <h2>お題メーカー</h2>
          <p>イラスト制作のきっかけになるお題をランダムに抽選できます。</p>
          <hr />
        </div>
        <OdaiMaker weeklyOdai={weeklyOdai} />
      </section>
    </SiteFrame>
  );
}
