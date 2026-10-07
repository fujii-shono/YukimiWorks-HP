import type { Metadata } from 'next';
import { AdminPagePanel } from '@/components/admin/AdminPagePanel';
import { SiteFrame } from '@/components/layout/SiteFrame';

export const metadata: Metadata = {
  title: '管理画面 | YukimiWorks',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <SiteFrame>
      <AdminPagePanel basePath="/admin" />
    </SiteFrame>
  );
}
