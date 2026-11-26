import type { Metadata } from 'next';
import { CorporateBanner } from '@/components/corporate/CorporateBanner';
import { CorporateLayout } from '@/components/corporate/CorporateLayout';

export const metadata: Metadata = {
  title: '会社情報 | YukimiWorks',
  description: '合同会社YukimiWorksの経営理念と会社情報です。',
};

export default function AboutPage() {
  return (
    <CorporateLayout>
      <CorporateBanner decorative priority />

      <section className="corporate-section corporate-philosophy" aria-labelledby="corporate-philosophy-title">
        <div className="corporate-container corporate-philosophy-inner">
          <div className="corporate-section-heading">
            <h1 id="corporate-philosophy-title">経営理念</h1>
          </div>
          <div className="corporate-philosophy-message">
            <h3>人を活かすIT・AIで、より良い未来へ。</h3>
            <p>私たちは、小さな課題にも目を向け、</p>
            <p>IT・AIを活用して日々の業務負担を軽減します。</p>
            <p>人が本来の仕事に集中できる環境をつくり、</p>
            <p>外部に依存せず、自社で運用できる仕組みを目指します。</p>
            <p><strong>技術を通じて、人と組織の自立と成長に貢献します。</strong></p>
          </div>
        </div>
      </section>

      <section className="corporate-section corporate-section-soft" aria-labelledby="corporate-company-title">
        <div className="corporate-container corporate-company-details">
          <div className="corporate-section-heading">
            <h2 id="corporate-company-title">会社情報</h2>
          </div>
          <dl className="corporate-company-list">
            <div><dt>会社名</dt><dd>合同会社YukimiWorks</dd></div>
            <div><dt>代表者</dt><dd>ゆきみ</dd></div>
            <div><dt>所在地</dt><dd>神奈川県横浜市西区浅間町1丁目4番3号 ウィザードビル402</dd></div>
            <div><dt>設立年月日</dt><dd>2026年1月29日</dd></div>
            <div>
              <dt>事業内容</dt>
              <dd>
                <ul className="corporate-company-business-list">
                  <li>Webアプリケーション開発</li>
                  <li>モバイルアプリケーション開発</li>
                  <li>AIシステムの企画・開発</li>
                  <li>業務システムの受託開発</li>
                  <li>Webサイトの企画・制作</li>
                </ul>
              </dd>
            </div>
            <div><dt>法人番号</dt><dd>2020003030288</dd></div>
          </dl>
        </div>
      </section>
    </CorporateLayout>
  );
}
