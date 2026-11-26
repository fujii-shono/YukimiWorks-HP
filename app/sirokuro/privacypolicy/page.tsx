import type { Metadata } from 'next';
import Link from 'next/link';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';
import { siteConfig } from '@/data/siteConfig';

const title = 'シロクロ会計 プライバシーポリシー | YukimiWorks';
const description = 'スマートフォンアプリ「シロクロ会計」のプライバシーポリシーです。';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${siteConfig.siteUrl}/sirokuro/privacypolicy`,
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

export default function SirokuroPrivacyPolicyPage() {
  return (
    <CorporateLayout>
      <div className="corporate-page-hero corporate-container">
        <h1>シロクロ会計 プライバシーポリシー</h1>
      </div>
      <section className="corporate-section">
        <article className="corporate-container corporate-legal-content">
          <p className="corporate-legal-date">最終更新日：2026年9月27日</p>
          <p>YukimiWorks（以下「当方」）は、スマートフォンアプリ「シロクロ会計」（以下「本アプリ」）における利用者情報の取扱いについて、以下のとおり定めます。</p>

        <section>
          <h2>1. 本アプリについて</h2>
          <p>本アプリは、クリエイター向けの会計・帳簿管理アプリです。</p>
          <p>本アプリには、アカウント登録、ログイン、クラウド同期の機能はありません。</p>
        </section>

        <section>
          <h2>2. 端末内に保存する情報</h2>
          <p>本アプリでは、利用者が入力または選択した次の情報を、利用者の端末内に保存します。</p>
          <ul>
            <li>取引、商品、帳簿、仕訳、設定その他の会計データ</li>
            <li>レシート・請求書などの添付画像・PDF</li>
            <li>添付画像・PDFから読み取った金額や登録番号などの情報</li>
          </ul>
          <p>これらの情報は、本アプリの会計・帳簿管理機能を提供する目的でのみ使用します。</p>
        </section>

        <section>
          <h2>3. 情報の外部送信・第三者提供</h2>
          <p>本アプリは、前項の情報を当方のサーバーその他の外部サーバーへ送信しません。また、利用状況の分析、広告配信、アカウント情報の収集を行いません。</p>
          <p>当方は、本アプリ内の会計データ、添付画像・PDFおよびOCRの読み取り結果を取得、閲覧、第三者提供しません。</p>
        </section>

        <section>
          <h2>4. カメラ、写真およびファイルへのアクセス</h2>
          <p>本アプリは、利用者がレシート・請求書を撮影、選択または共有して取り込む場合に限り、カメラ、写真ライブラリまたはファイルへのアクセスを求めます。</p>
          <p>取得した画像・PDFは、利用者が選択した場合にのみ端末内へ保存し、証憑の保存および自動入力機能に使用します。</p>
        </section>

        <section>
          <h2>5. レシート・請求書の自動入力</h2>
          <p>利用者が自動入力機能を有効にした場合、レシート・請求書の画像・PDFから金額やインボイス登録番号を読み取ります。</p>
          <p>この読み取り処理は端末内で行われ、画像・PDFおよび読み取り結果を外部サーバーへ送信しません。</p>
        </section>

        <section>
          <h2>6. データの管理・削除</h2>
          <p>利用者は、本アプリ内の各機能を通じて、取引、商品、定期取引およびインポートした仕訳などを削除できます。</p>
          <p>本アプリはクラウド上に利用者データを保存しないため、当方は利用者の端末内に保存されたデータを取得または削除できません。端末の変更、初期化、アプリの削除などを行う前に、利用者自身の責任で必要なデータを確認してください。</p>
        </section>

        <section>
          <h2>7. 外部サイトへのリンク</h2>
          <p>本アプリでは、お問い合わせや開発支援のために外部サイトを開くことがあります。外部サイトにおける情報の取扱いについては、各サイトのプライバシーポリシー等をご確認ください。</p>
        </section>

        <section>
          <h2>8. 本ポリシーの変更</h2>
          <p>当方は、法令の変更または本アプリの機能変更などに応じて、本ポリシーを変更することがあります。変更後のポリシーは、本ページへの掲載または本アプリ内での表示により公表します。</p>
        </section>

        <section>
          <h2>9. お問い合わせ</h2>
          <p>本ポリシーに関するお問い合わせは、以下の窓口までご連絡ください。</p>
          <p>
            運営者：合同会社YukimiWorks
            <br />
            お問い合わせ先：
            <Link href="/contact/app">https://www.yukimi-works.co.jp/contact/app</Link>
          </p>
        </section>
        </article>
      </section>
    </CorporateLayout>
  );
}
