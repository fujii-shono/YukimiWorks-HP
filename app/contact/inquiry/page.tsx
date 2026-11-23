import type { Metadata } from 'next';
import Link from 'next/link';
import { CorporateInquiryForm } from '@/components/corporate/CorporateInquiryForm';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';

export const metadata: Metadata = {
  title: 'その他のお問い合わせ | YukimiWorks',
  description: 'YukimiWorksへのその他のお問い合わせ窓口です。',
};

export default function InquiryPage() {
  return (
    <CorporateLayout>
      <div className="corporate-page-hero corporate-container">
        <h1>その他のお問い合わせ</h1>
      </div>
      <section className="corporate-section corporate-section-soft">
        <div className="corporate-container corporate-contact-form-container">
          <Link href="/contact" className="corporate-back-link">お問い合わせへ戻る</Link>
          <div className="corporate-form-card">
            <CorporateInquiryForm type="general" />
          </div>
        </div>
      </section>
    </CorporateLayout>
  );
}
