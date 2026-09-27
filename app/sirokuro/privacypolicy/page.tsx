import type { Metadata } from 'next';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { SiteFrame } from '@/components/layout/SiteFrame';
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
    <SiteFrame>
      <RetroPanel
        title="シロクロ会計"
        titleAside="プライバシーポリシー"
        contentClassName="single-panel-body detail-body"
      >
        <hr className="content-rule" />
        <p>最終更新日：2026年9月27日</p>
        <p>[運営者名]（以下「当方」）は、スマートフォンアプリ「シロクロ会計」（以下「本アプリ」）における利用者情報の取扱いについて、以下のとおり定めます。</p>

        <section>
          <h3>1. 本アプリについて</h3>
          <p>本アプリは、クリエイター向けの会計・帳簿管理アプリです。</p>
          <p>本アプリには、アカウント登録、ログイン、クラウド同期の機能はありません。</p>
        </section>

        <section>
          <h3>2. 端末内に保存する情報</h3>
          <p>本アプリでは、利用者が入力または選択した次の情報を、利用者の端末内に保存します。</p>
          <ul>
            <li>取引、商品、帳簿、仕訳、設定その他の会計データ</li>
            <li>レシート・請求書などの添付画像・PDF</li>
            <li>添付画像・PDFから読み取った金額や登録番号などの情報</li>
          </ul>
          <p>これらの情報は、本アプリの会計・帳簿管理機能を提供する目的でのみ使用します。</p>
        </section>

        <section>
          <h3>3. 情報の外部送信・第三者提供</h3>
          <p>本アプリは、前項の情報を当方のサーバーその他の外部サーバーへ送信しません。また、利用状況の分析、広告配信、アカウント情報の収集を行いません。</p>
          <p>当方は、本アプリ内の会計データ、添付画像・PDFおよびOCRの読み取り結果を取得、閲覧、第三者提供しません。</p>
        </section>

        <section>
          <h3>4. カメラ、写真およびファイルへのアクセス</h3>
          <p>本アプリは、利用者がレシート・請求書を撮影、選択または共有して取り込む場合に限り、カメラ、写真ライブラリまたはファイルへのアクセスを求めます。</p>
          <p>取得した画像・PDFは、利用者が選択した場合にのみ端末内へ保存し、証憑の保存および自動入力機能に使用します。</p>
        </section>

        <section>
          <h3>5. レシート・請求書の自動入力</h3>
          <p>利用者が自動入力機能を有効にした場合、レシート・請求書の画像・PDFから金額やインボイス登録番号を読み取ります。</p>
          <p>この読み取り処理は端末内で行われ、画像・PDFおよび読み取り結果を外部サーバーへ送信しません。</p>
        </section>

        <section>
          <h3>6. データの管理・削除</h3>
          <p>利用者は、本アプリ内の各機能を通じて、取引、商品、定期取引およびインポートした仕訳などを削除できます。</p>
          <p>本アプリはクラウド上に利用者データを保存しないため、当方は利用者の端末内に保存されたデータを取得または削除できません。端末の変更、初期化、アプリの削除などを行う前に、利用者自身の責任で必要なデータを確認してください。</p>
        </section>

        <section>
          <h3>7. 外部サイトへのリンク</h3>
          <p>本アプリでは、お問い合わせや開発支援のために外部サイトを開くことがあります。外部サイトにおける情報の取扱いについては、各サイトのプライバシーポリシー等をご確認ください。</p>
        </section>

        <section>
          <h3>8. 本ポリシーの変更</h3>
          <p>当方は、法令の変更または本アプリの機能変更などに応じて、本ポリシーを変更することがあります。変更後のポリシーは、本ページへの掲載または本アプリ内での表示により公表します。</p>
        </section>

        <section>
          <h3>9. お問い合わせ</h3>
          <p>本ポリシーに関するお問い合わせは、以下の窓口までご連絡ください。</p>
          <p>
            運営者：合同会社YukimiWorks
            <br />
            お問い合わせ先：
            <a href="https://www.yukimi-works.co.jp/contact/app">https://www.yukimi-works.co.jp/contact/app</a>
          </p>
        </section>
      </RetroPanel>
    </SiteFrame>
  );
}
