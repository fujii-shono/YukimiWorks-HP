import type { Metadata } from 'next';
import Link from 'next/link';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';
import { siteConfig } from '@/data/siteConfig';

const title = 'Cocoa プライバシーポリシー | YukimiWorks';
const description = 'アプリ「Cocoa」のプライバシーポリシーです。';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${siteConfig.siteUrl}/cocoa/privacy-policy`,
  },
  openGraph: {
    title,
    description,
  },
  twitter: {
    card: 'summary',
    title,
    description,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <CorporateLayout>
      <div className="corporate-page-hero corporate-container">
        <h1>Cocoa プライバシーポリシー</h1>
      </div>
      <section className="corporate-section">
        <article className="corporate-container corporate-legal-content">
          <p>本アプリは、ユーザーの個人情報を収集しません。</p>
          <p>本アプリは完全オフラインで動作し、入力されたデータは端末内にのみ保存されます。</p>
          <p>開発者は、ユーザーが入力した情報、画像、ファイル、利用履歴等を取得・送信・共有しません。</p>
          <p>本アプリでは、広告、アクセス解析、外部SDK、第三者へのデータ提供は行いません。</p>
          <p>ただし、アプリストア、OS、端末メーカー等が独自に取得する情報については、本アプリの管理対象外です。</p>
          <p>
            お問い合わせ：
            <Link href="/contact/app">アプリ・サービスに関するお問い合わせ</Link>
          </p>
          <p className="corporate-legal-date">制定日：2026年5月18日</p>
        </article>
      </section>
    </CorporateLayout>
  );
}
