import type { Metadata } from 'next';
import { AdminPagePanel } from '@/components/admin/AdminPagePanel';

export const metadata: Metadata = {
  title: '管理画面 | 裏ページ | YukimiWorks',
  robots: { index: false, follow: false, nocache: true },
};

export default function BackAlleyAdminPage() {
  return <AdminPagePanel basePath="/back-alley/admin" />;
}
