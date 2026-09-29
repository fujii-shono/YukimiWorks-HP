import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';

const strengths = [
  {
    number: '01',
    heading: 'つくる側から始まった会社',
    body: 'YukimiWorksは、企画を語るだけでなく、実際に手を動かして作品やサービスを生み出してきたクリエイターが立ち上げた会社です。だからこそ、見た目の魅力だけでなく、制作の流れや仕上がりの質まで含めて考えます。',
  },
  {
    number: '02',
    heading: '制作現場を知っている',
    body: '現場では、言葉のすれ違いひとつで進行が止まり、理想と実装の間に小さな負担が積み重なっていきます。YukimiWorksはその苦労を知っているから、つくる人の感覚を置き去りにせず、伝達や判断のズレまで見据えて伴走します。',
  },
  {
    number: '03',
    heading: 'アイデアを、完成まで',
    body: 'アイデアや企画は出発点にすぎません。実際に世の中へ届けるには、形にし、磨き、最後まで完成させる責任が必要です。YukimiWorksは創作の前提を大切にし、思いつきで終わらせず、完成まで持っていくことに価値を置いています。',
  },
] as const;

export default function AboutPage() {
  return (
    <SiteFrame>
      <RetroPanel title="About" contentClassName="single-panel-body about-body">
        <h1 className="about-catchphrase">もっと楽しく、もっと便利に</h1>
        <div className="about-intro">
          <p>
            合同会社YukimiWorksは
            <br />
            クリエイターゆきみによって
            <br />
            立ち上げられた会社です。
          </p>
          <p>
            YukimiWorksが大切にしているのは、
            <br />
            きれいな企画書ではなく、
            <br />
            実際に形になり、ちゃんと届くものづくりです。
          </p>
        </div>
        <div className="about-strength-list">
          {strengths.map((strength) => (
            <section key={strength.number} className="about-strength-block" aria-labelledby={`about-strength-${strength.number}`}>
              <div className="about-strength-heading">
                <p className="about-strength-number">{strength.number}</p>
                <h2 id={`about-strength-${strength.number}`}>{strength.heading}</h2>
              </div>
              <p className="about-strength-body">{strength.body}</p>
            </section>
          ))}
        </div>
        <div className="about-closing">
          <p>
            企画だけで終わらせない。
            <br />
            現場だけに苦労を押しつけない。
            <br />
            そして、完成するところまで諦めない。
          </p>
          <p>それがYukimiWorksのものづくりです。</p>
          <p>
            神奈川県横浜市西区浅間町1丁目4番3号ウィザードビル402
            <br />
            代表者 ゆきみ
          </p>
        </div>
      </RetroPanel>
    </SiteFrame>
  );
}
