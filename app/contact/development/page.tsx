import type { Metadata } from 'next';
import Link from 'next/link';
import { CorporateInquiryForm } from '@/components/corporate/CorporateInquiryForm';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';

export const metadata: Metadata = {
  title: '開発のご相談 | YukimiWorks',
  description: 'システム開発、改修、AI導入、かかりつけ開発室についてご相談いただけます。',
};

export default function DevelopmentInquiryPage() {
  return (
    <CorporateLayout>
      <div className="corporate-page-hero corporate-container">
        <h1>開発のご相談</h1>
      </div>
      <section className="corporate-section corporate-section-soft">
        <div className="corporate-container corporate-contact-form-container">
          <Link href="/contact" className="corporate-back-link">お問い合わせへ戻る</Link>
          <div className="corporate-form-card">
            <CorporateInquiryForm type="development" />
          </div>
        </div>
      </section>
    </CorporateLayout>
  );
}
