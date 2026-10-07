import { Suspense } from 'react';
import { AdminMessageManager } from '@/components/admin/AdminMessageManager';

export function AdminPagePanel({ basePath }: { basePath: '/admin' | '/back-alley/admin' }) {
  return (
    <section className="window-panel admin-panel">
      <h1 className="window-title">
        <span className="title-deco" aria-hidden="true">❄</span>
        <span>管理画面</span>
        <span className="title-deco" aria-hidden="true">❄</span>
      </h1>
      <Suspense fallback={<p className="admin-access-message">管理画面を読み込んでいます…</p>}>
        <AdminMessageManager basePath={basePath} />
      </Suspense>
    </section>
  );
}
