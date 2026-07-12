import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';

const purposeItems = [
  '小さなアイデアを一つ一つ形にすること。',
  'ユーザーに楽しんでもらえるコンテンツを作ること。',
  '斬新な発想を実現させること。',
  'サービスを便利なインフラとして提供すること。',
] as const;

export default function AboutPage() {
  return (
    <SiteFrame>
      <RetroPanel title="About" contentClassName="single-panel-body about-body">
        <p>
          合同会社YukimiWorksは
          <br />
          クリエイターゆきみによって
          <br />
          立ち上げられた会社です。
        </p>
        <p>YukimiWorks以下の目的で運営されています。</p>
        <div className="about-purpose-wrap">
          <ol className="about-purpose-list">
            {purposeItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
        <p>
          楽しく便利な社会を実現するため
          <br />
          時に収益性を度外視し社会課題に臨みます。
        </p>
        <p>皆様の暖かいご支援お待ちしております。</p>
        <p>
          神奈川県横浜市西区浅間町1丁目4番3号ウィザードビル402
          <br />
          代表者 ゆきみ
        </p>
      </RetroPanel>
    </SiteFrame>
  );
}
