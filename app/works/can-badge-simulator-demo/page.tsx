import type { Metadata } from 'next';
import { CanBadgePreview } from '@/components/works/CanBadgePreview';

export const metadata: Metadata = {
  title: '缶バッジ3Dプレビュー 試作 | YukimiWorks',
  robots: {
    index: false,
    follow: false,
  },
};

export default function CanBadgeSimulatorDemoPage() {
  return (
    <main className="acrylic-demo-page can-badge-demo-page">
      <section className="acrylic-demo-panel" aria-label="缶バッジ3Dプレビュー 試作">
        <div className="acrylic-demo-heading">
          <h1>缶バッジ3Dプレビュー 試作</h1>
        </div>
        <CanBadgePreview />
      </section>
    </main>
  );
}
