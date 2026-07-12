import Link from 'next/link';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';

export default function PrivacyPolicyPage() {
  return (
    <SiteFrame>
      <RetroPanel title="cocoa プライバシーポリシー" titleAside="Privacy Policy" contentClassName="single-panel-body detail-body">
        <hr className="content-rule" />
        <p>本アプリは、ユーザーの個人情報を収集しません。</p>
        <p>本アプリは完全オフラインで動作し、入力されたデータは端末内にのみ保存されます。</p>
        <p>開発者は、ユーザーが入力した情報、画像、ファイル、利用履歴等を取得・送信・共有しません。</p>
        <p>本アプリでは、広告、アクセス解析、外部SDK、第三者へのデータ提供は行いません。</p>
        <p>ただし、アプリストア、OS、端末メーカー等が独自に取得する情報については、本アプリの管理対象外です。</p>
        <p>
          お問い合わせ：
          <Link href="/contact/app">アプリ・サービスに関するお問い合わせ</Link>
        </p>
        <p className="enacted-date">制定日：2026年5月18日</p>
      </RetroPanel>
    </SiteFrame>
  );
}
