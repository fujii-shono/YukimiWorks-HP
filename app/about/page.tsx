import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';

const aboutText = `合同会社YukimiWorksは
クリエイターゆきみるくによって
立ち上げられた会社です。

YukimiWorks以下の目的で運営されています。
1.小さなアイデアを一つ一つ形にすること。
2.ユーザーに楽しんでもらえるコンテンツを作ること。
3.斬新な発想を実現させること。
4.サービスを便利なインフラとして提供すること。

楽しく便利な社会を実現するため
時に収益性を度外視し社会課題に臨みます。

皆様の暖かいご支援お待ちしております。

神奈川県横浜市西区浅間町1丁目4番3号ウィザードビル402
代表者 ゆきみるく`;

export default function AboutPage() {
  return (
    <SiteFrame>
      <RetroPanel title="About" contentClassName="single-panel-body about-body">
        <p>{aboutText}</p>
      </RetroPanel>
    </SiteFrame>
  );
}
