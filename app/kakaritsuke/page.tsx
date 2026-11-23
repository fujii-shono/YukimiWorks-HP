import type { Metadata } from 'next';
import Link from 'next/link';
import { CorporateBanner } from '@/components/corporate/CorporateBanner';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';

export const metadata: Metadata = {
  title: 'かかりつけ開発室 | YukimiWorks',
  description: '必要な期間だけ利用できる月額制の開発支援。新規サービスから既存システムの改修・保守まで支援します。',
};

const examples = [
  {
    title: 'Excel集計・報告書自動作成',
  },
  {
    title: '二段階認証実装などセキュリティ強化対応',
  },
  {
    title: 'AI電話対応システム',
  },
  {
    title: 'アプリサービスのMCP対応',
  },
  {
    title: 'ローカルLLMによる業務システム',
  },
] as const;

const plans = [
  {
    name: 'ライト',
    price: '10万',
    featured: false,
    features: ['既存機能の改修・社内ツール作成', '月1回のオンライン定例', '月次の対応報告'],
  },
  {
    name: 'スタンダード',
    price: '20万',
    featured: true,
    features: ['新機能の追加・AI機能の導入', '月2回のオンライン定例', '月単位の開発計画'],
  },
  {
    name: 'パートナー',
    price: '40万',
    featured: false,
    features: ['新規サービス・大規模システム', '月2回のオンライン定例', '月1回の会社訪問', '中長期の開発ロードマップ'],
  },
] as const;

export default function KakaritsukePage() {
  return (
    <CorporateLayout>
      <CorporateBanner priority />

      <section className="kakaritsuke-hero">
        <div className="corporate-container kakaritsuke-hero-content">
          <h1>会社に、いつでも相談できる開発室を。</h1>
          <p>かかりつけ開発室は、<br />システムの改修から新しいサービスの開発まで<br />継続的に支援する月額制サービスです。</p>
        </div>
      </section>

      <section className="corporate-section corporate-section-soft">
        <div className="corporate-container kakaritsuke-content kakaritsuke-intro">
          <div className="corporate-section-heading"><h2>かかりつけ開発室とは？</h2></div>
          <p>必要な期間だけ利用できる、サブスク型の開発支援サービスです。<br />新規サービスの立ち上げから既存システムの改修・保守まで、<br />企画、設計、実装、運用を一貫して支援します。</p>
        </div>
      </section>

      <section className="corporate-section">
        <div className="corporate-container kakaritsuke-content">
          <div className="corporate-section-heading"><h2>開発事例</h2></div>
          <div className="kakaritsuke-example-list">
            {examples.map((example) => (
              <article key={example.title}>
                <div role="img" aria-label={`${example.title}の画像は準備中です`}><span>画像準備中</span></div>
                <h3>{example.title}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="plans" className="corporate-section corporate-section-soft">
        <div className="corporate-container kakaritsuke-content">
          <div className="corporate-section-heading"><h2>料金プラン</h2></div>
          <div className="corporate-plan-grid">
            {plans.map((plan) => (
              <article key={plan.name} className={plan.featured ? 'featured' : undefined}>
                {plan.featured ? <p className="corporate-plan-label">おすすめ</p> : null}
                <h3>{plan.name}</h3>
                <p className="corporate-plan-price"><strong>{plan.price}</strong><span>円／月（税別）</span></p>
                <ul>{plan.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="corporate-cta-section">
        <div className="corporate-container kakaritsuke-content">
          <h2>まずはご相談から</h2>
          <Link href="/contact" className="corporate-button">かかりつけ開発室で相談する。</Link>
        </div>
      </section>
    </CorporateLayout>
  );
}
