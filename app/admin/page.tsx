import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AdminMessageManager } from '@/components/admin/AdminMessageManager';
import { SiteFrame } from '@/components/layout/SiteFrame';

export const metadata: Metadata = {
  title: '管理画面 | YukimiWorks',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <SiteFrame>
      <section className="window-panel admin-panel">
        <h1 className="window-title">
          <span className="title-deco" aria-hidden="true">❄</span>
          <span>管理画面</span>
          <span className="title-deco" aria-hidden="true">❄</span>
        </h1>
        <Suspense fallback={<p className="admin-access-message">管理画面を読み込んでいます…</p>}>
          <AdminMessageManager />
        </Suspense>
      </section>
    </SiteFrame>
  );
}
