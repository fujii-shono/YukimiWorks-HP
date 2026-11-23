import type { Metadata } from 'next';
import Link from 'next/link';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';

export const metadata: Metadata = {
  title: 'お問い合わせ | YukimiWorks',
  description: '開発のご相談、サービス・アプリ、その他のお問い合わせ窓口です。',
};

const contactOptions = [
  {
    title: '開発のご相談',
    description: 'システム開発、改修、AI導入、かかりつけ開発室のご相談',
    href: '/contact/development',
  },
  {
    title: 'サービス・アプリのお問い合わせ',
    description: 'YukimiWorksのサービスやアプリに関するご質問・ご要望',
    href: '/contact/app',
  },
  {
    title: 'その他のお問い合わせ',
    description: '上記以外のお問い合わせ',
    href: '/contact/inquiry',
  },
] as const;

export default function ContactHubPage() {
  return (
    <CorporateLayout>
      <div className="corporate-page-hero corporate-container">
        <h1>お問い合わせ</h1>
      </div>
      <section className="corporate-section corporate-section-soft">
        <div className="corporate-container corporate-contact-option-list">
          {contactOptions.map((option) => (
            <Link key={option.href} href={option.href} className="corporate-contact-option">
              <div>
                <h2>{option.title}</h2>
                <p>{option.description}</p>
              </div>
              <span aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </CorporateLayout>
  );
}
