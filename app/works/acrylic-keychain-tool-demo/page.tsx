import type { Metadata } from 'next';
import { AcrylicKeychainTool, type AcrylicDemoSample } from '@/components/works/AcrylicKeychainTool';

const demoSamples: AcrylicDemoSample[] = [
  {
    label: 'Sample 670',
    src: '/works/acrylic-keychain-tool-demo/samples/sample-670.png',
    fileName: 'sample-670.png',
  },
  {
    label: 'Sample 695',
    src: '/works/acrylic-keychain-tool-demo/samples/sample-695.png',
    fileName: 'sample-695.png',
  },
];

export const metadata: Metadata = {
  title: 'アクキーシミュレーター デモ | YukimiWorks',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AcrylicKeychainToolDemoPage() {
  return (
    <main className="acrylic-demo-page">
      <section className="acrylic-demo-panel" aria-label="アクキーシミュレーター デモ">
        <div className="acrylic-demo-heading">
          <h1>アクキーシミュレーター デモ</h1>
        </div>
        <AcrylicKeychainTool mode="demo" samples={demoSamples} />
      </section>
    </main>
  );
}
