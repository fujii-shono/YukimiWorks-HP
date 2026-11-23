import type { Metadata } from 'next';
import Link from 'next/link';
import { CorporateAppInquiryForm } from '@/components/corporate/CorporateAppInquiryForm';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';
import { appServices } from '@/data/appServices';

export const metadata: Metadata = {
  title: 'サービス・アプリのお問い合わせ | YukimiWorks',
  description: 'YukimiWorksのサービスやアプリに関するお問い合わせ窓口です。',
};

export default function AppInquiryPage() {
  return (
    <CorporateLayout>
      <div className="corporate-page-hero corporate-container">
        <h1>サービス・アプリのお問い合わせ</h1>
      </div>
      <section className="corporate-section corporate-section-soft">
        <div className="corporate-container corporate-contact-form-container">
          <Link href="/contact" className="corporate-back-link">お問い合わせへ戻る</Link>
          <div className="corporate-form-card">
            <CorporateAppInquiryForm services={appServices} />
          </div>
        </div>
      </section>
    </CorporateLayout>
  );
}
