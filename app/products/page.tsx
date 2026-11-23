import type { Metadata } from 'next';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';
import { CorporateProductList } from '@/components/corporate/CorporateProductList';

export const metadata: Metadata = {
  title: '自社プロダクト | YukimiWorks',
  description: 'YukimiWorksが企画・開発するプロダクトを紹介します。',
};

export default function ProductsPage() {
  return (
    <CorporateLayout>
      <div className="corporate-page-hero corporate-container">
        <h1>自社プロダクト</h1>
        <span>YukimiWorksが企画・開発するプロダクトです。</span>
      </div>
      <section className="corporate-section corporate-section-soft">
        <div className="corporate-container">
          <CorporateProductList layout="stacked" />
        </div>
      </section>
    </CorporateLayout>
  );
}
