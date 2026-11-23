import type { Metadata } from 'next';
import Link from 'next/link';
import { CorporateBanner } from '@/components/corporate/CorporateBanner';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';
import { CorporateProductList } from '@/components/corporate/CorporateProductList';

export const metadata: Metadata = {
  title: 'YukimiWorks | 自社プロダクト・開発支援',
  description:
    'YukimiWorksは、課題解決のためにクリエイターが集まってできた会社です。自社プロダクトの開発と企業向けの開発支援を行っています。',
};

export default function HomePage() {
  return (
    <CorporateLayout>
      <CorporateBanner priority />

      <section className="corporate-intro corporate-container" aria-labelledby="corporate-intro-title">
        <h1 id="corporate-intro-title">
          YukimiWorksは
          <br />
          どんな小さな課題も見逃しません
        </h1>
        <p>
          YukimiWorksは課題解決のためにクリエイターが集まってできた会社です。
        </p>
        <p>アイデアを形にしたい思いが、自社プロダクトの開発と開発支援を後押しします。</p>
      </section>

      <section className="corporate-section corporate-section-soft" aria-labelledby="corporate-products-title">
        <div className="corporate-container">
          <div className="corporate-section-heading">
            <h2 id="corporate-products-title">プロダクト一覧</h2>
          </div>
          <CorporateProductList />
        </div>
      </section>

      <section className="corporate-section corporate-home-service" aria-labelledby="corporate-service-title">
        <div className="corporate-container corporate-home-service-inner">
          <div>
            <h2 id="corporate-service-title">開発のご支援</h2>
            <p>新規サービスの立ち上げから既存システムの改修・保守まで、<br />企業に寄り添いながら月額制で継続的に開発を支援します。</p>
          </div>
          <Link href="/kakaritsuke" className="corporate-button">開発相談へ</Link>
        </div>
      </section>
    </CorporateLayout>
  );
}

export const dynamic = 'force-dynamic';
