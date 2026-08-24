import type { Metadata } from 'next';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';

const strengths = [
  {
    number: '01',
    heading: 'CREATED BY CREATOR',
    subheading: 'つくる側から始まった会社',
    body: 'YukimiWorksは、企画だけを語るためではなく、実際に手を動かして作品やサービスを生み出してきたクリエイターが立ち上げた会社です。だからこそ、見た目の魅力だけでなく、制作の流れや仕上がりの質まで含めて考えます。',
  },
  {
    number: '02',
    heading: 'WE KNOW THE FIELD',
    subheading: '制作現場を知っている',
    body: '現場では、言葉のすれ違いひとつで進行が止まり、理想と実装の間に小さな負担が積み重なっていきます。YukimiWorksはその苦労を知っているから、つくる人の感覚を置き去りにせず、伝達や判断のズレまで見据えて伴走します。',
  },
  {
    number: '03',
    heading: 'IDEA TO COMPLETE',
    subheading: 'アイデアを、完成まで',
    body: 'アイデアや企画は出発点にすぎません。実際に世の中へ届けるには、形にし、磨き、最後まで完成させる責任が必要です。YukimiWorksは創作の前提を大切にし、思いつきで終わらせず、完成まで持っていくことに価値を置いています。',
  },
] as const;

export const metadata: Metadata = {
  title: 'Why YukimiWorks | YukimiWorks',
  description:
    'クリエイターが立ち上げ、制作現場を知り、アイデアを完成まで導くYukimiWorksの強みをご紹介します。',
};

export default function WhyPage() {
  return (
    <SiteFrame hideSidebar>
      <RetroPanel title="Why YukimiWorks" titleAside="なぜYukimiWorksなのか" contentClassName="single-panel-body why-body">
        <div className="why-intro">
          <p className="why-kicker">Why YukimiWorks</p>
          <p className="why-lead">
            つくる人の目線から始まり、
            <br />
            現場の感覚を知ったまま、
            <br />
            完成まで責任を持つ。
          </p>
          <p>
            YukimiWorksが大切にしているのは、
            <br />
            きれいな企画書だけではなく、
            <br />
            実際に形になり、ちゃんと届くものづくりです。
          </p>
        </div>

        <div className="why-strength-list">
          {strengths.map((strength) => (
            <section key={strength.number} className="why-strength-block" aria-labelledby={`why-strength-${strength.number}`}>
              <div className="why-strength-heading">
                <p className="why-strength-number">{strength.number}</p>
                <div>
                  <h3 id={`why-strength-${strength.number}`}>{strength.heading}</h3>
                  <p className="why-strength-subheading">{strength.subheading}</p>
                </div>
              </div>
              <p className="why-strength-body">{strength.body}</p>
            </section>
          ))}
        </div>

        <div className="why-closing">
          <p>
            企画だけで終わらせない。
            <br />
            現場だけに苦労を押しつけない。
            <br />
            そして、完成するところまで諦めない。
          </p>
          <p>それがYukimiWorksのものづくりです。</p>
        </div>
      </RetroPanel>
    </SiteFrame>
  );
}
