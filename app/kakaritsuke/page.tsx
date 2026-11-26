import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';

export const metadata: Metadata = {
  title: 'かかりつけ開発室 | YukimiWorks',
  description: '必要な期間だけ利用できる月額制の開発支援。新規サービスから既存システムの改修・保守まで支援します。',
};

const examples = [
  {
    title: 'Excel集計・報告書自動作成',
    icon: '/icons/kakaritsuke/01-excel-report.svg',
  },
  {
    title: '二段階認証実装などセキュリティ強化対応',
    icon: '/icons/kakaritsuke/02-two-factor.svg',
  },
  {
    title: 'AI電話対応システム',
    icon: '/icons/kakaritsuke/03-ai-phone.svg',
  },
  {
    title: 'アプリサービスのMCP対応',
    icon: '/icons/kakaritsuke/04-mcp.svg',
  },
  {
    title: 'ローカルLLMによる業務システム',
    icon: '/icons/kakaritsuke/05-local-llm.svg',
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
      <section className="kakaritsuke-banner" aria-labelledby="kakaritsuke-title">
        <div className="kakaritsuke-banner-copy">
          <h1 id="kakaritsuke-title">
            <span className="kakaritsuke-title-mark-frame" aria-hidden="true">
              <Image
                src="/brand/kakaritsuke-open-door.png"
                alt=""
                width={1254}
                height={1254}
                className="kakaritsuke-title-mark"
              />
            </span>
            <span>かかりつけ開発室</span>
          </h1>
          <p>会社に、いつでも相談できる開発室を。</p>
          <p>システムの改修から新しいサービスの開発まで、継続的に支援する月額制サービスです。</p>
        </div>
        <div className="kakaritsuke-banner-media">
          <Image
            src="/brand/kakaritsuke-banner.png"
            alt="オフィスでクリップボードを手に相談内容を確認する開発担当者"
            width={1774}
            height={887}
            className="kakaritsuke-banner-image"
            priority
            sizes="(max-width: 720px) 100vw, 50vw"
          />
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
            {[examples.slice(0, 3), examples.slice(3)].map((row, index) => (
              <div className="kakaritsuke-example-row" key={index}>
                {row.map((example) => (
                  <article key={example.title}>
                    <Image
                      src={example.icon}
                      alt=""
                      width={48}
                      height={48}
                      className="kakaritsuke-example-icon"
                    />
                    <h3>{example.title}</h3>
                  </article>
                ))}
              </div>
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
          <Link href="/contact/development" className="corporate-button">かかりつけ開発室で相談する。</Link>
        </div>
      </section>
    </CorporateLayout>
  );
}
