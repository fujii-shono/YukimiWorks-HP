import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';

export default function CircleAboutPage() {
  return (
    <SiteFrame>
      <RetroPanel title="About" contentClassName="single-panel-body about-body">
        <h1 className="about-catchphrase">もっと楽しく、もっと便利に</h1>
        <div className="about-intro">
          <p>クリエイターゆきみの制作活動と、YukimiWorksが作ったコンテンツを紹介するサークルサイトです。</p>
          <p>イラスト、便利ツール、ミニゲームなど、小さなアイデアを楽しく形にしていきます。</p>
        </div>
      </RetroPanel>
    </SiteFrame>
  );
}
