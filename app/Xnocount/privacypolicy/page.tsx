import type { Metadata } from 'next';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { siteConfig } from '@/data/siteConfig';

const title = '「Xのいいね数を消すやつ」プライバシーポリシー | YukimiWorks';
const description = 'ブラウザ拡張機能「Xのいいね数を消すやつ」のプライバシーポリシーです。';

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: `${siteConfig.siteUrl}/Xnocount/privacypolicy`,
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

export default function XNoCountPrivacyPolicyPage() {
  return (
    <SiteFrame>
      <RetroPanel
        title="「Xのいいね数を消すやつ」"
        titleAside="プライバシーポリシー"
        contentClassName="single-panel-body detail-body"
      >
        <hr className="content-rule" />
        <p>
          合同会社YukimiWorks（以下「当社」）は、当社が提供するブラウザ拡張機能「Xのいいね数を消すやつ」（以下「本サービス」）における利用者情報の取扱いについて、以下のとおり定めます。
        </p>

        <section>
          <h3>1. 本サービスの概要</h3>
          <p>本サービスは、XおよびTwitterのWebページ上に表示される「いいね数」などのカウント表示を、利用者が指定した設定に従って非表示または変更するブラウザ拡張機能です。</p>
          <p>本サービスは、Xのアカウント情報や投稿内容を変更・送信するものではありません。</p>
        </section>

        <section>
          <h3>2. 取得する情報</h3>
          <p>本サービスは、以下の情報を当社のサーバーへ送信または収集しません。</p>
          <ul>
            <li>Xのユーザー名、表示名、プロフィール情報</li>
            <li>投稿内容、画像、動画、メッセージ</li>
            <li>閲覧履歴、検索履歴</li>
            <li>Cookie、認証情報、アクセストークン</li>
            <li>IPアドレス</li>
            <li>広告識別子</li>
            <li>本サービスの利用状況に関する情報</li>
          </ul>
          <p>本サービスの設定および動作に必要な情報は、利用者の端末またはブラウザ内にのみ保存されます。</p>
        </section>

        <section>
          <h3>3. 保存する情報</h3>
          <p>本サービスは、利用者が設定した表示制御の設定値を、ブラウザまたは端末のローカルストレージ領域に保存します。</p>
          <p>保存される情報には、例えば以下が含まれます。</p>
          <ul>
            <li>カウント表示の非表示設定</li>
            <li>カウント表示の置換設定</li>
            <li>本サービス内部で使用する設定状態</li>
          </ul>
          <p>これらの情報は、本サービスの機能提供以外の目的で利用しません。</p>
        </section>

        <section>
          <h3>4. 情報の利用目的</h3>
          <p>本サービスが端末内に保存する情報は、以下の目的でのみ利用します。</p>
          <ul>
            <li>本サービスの設定を保存・復元するため</li>
            <li>設定内容をXおよびTwitterの画面表示へ反映するため</li>
            <li>本サービスの動作状態を維持するため</li>
          </ul>
        </section>

        <section>
          <h3>5. 外部送信および第三者提供</h3>
          <p>本サービスは、利用者情報を外部サーバーへ送信しません。</p>
          <p>また、広告配信、アクセス解析、トラッキング、独自の分析SDKその他これらに類する仕組みを使用しません。</p>
          <p>法令に基づく場合を除き、利用者情報を第三者へ提供することもありません。</p>
        </section>

        <section>
          <h3>6. 権限の利用</h3>
          <p>本サービスは、必要最小限のブラウザ権限のみを使用します。</p>
          <p>本サービスがWebページへのアクセス権限を使用するのは、XおよびTwitterのページ上でカウント表示を制御するためです。その他のWebサイト上で本サービスの処理を実行することはありません。</p>
        </section>

        <section>
          <h3>7. 利用者による設定情報の削除</h3>
          <p>保存された設定情報は、以下の方法で削除できます。</p>
          <ul>
            <li>本サービスの設定画面から設定を初期化する</li>
            <li>ブラウザの拡張機能データを削除する</li>
            <li>本サービスをアンインストールする</li>
          </ul>
        </section>

        <section>
          <h3>8. 安全管理</h3>
          <p>当社は、本サービスに関して取り扱う情報について、不正アクセス、紛失、改ざん、漏えい等を防止するため、適切な安全管理に努めます。</p>
        </section>

        <section>
          <h3>9. プライバシーポリシーの変更</h3>
          <p>当社は、必要に応じて本ポリシーを変更することがあります。</p>
          <p>重要な変更を行う場合は、当社のWebサイトまたは本サービスを通じてお知らせします。変更後のプライバシーポリシーは、当社Webサイトに掲載した時点から効力を生じます。</p>
        </section>

        <p className="enacted-date">制定日：2026年9月3日</p>
      </RetroPanel>
    </SiteFrame>
  );
}
