import type { Metadata } from 'next';
import { BackAlleyFrame } from '@/components/back-alley/BackAlleyFrame';

export const metadata: Metadata = { title: '裏ページ | YukimiWorks', robots: { index: false, follow: false, nocache: true } };
export default function BackAlleyLayout({ children }: { children: React.ReactNode }) { return <BackAlleyFrame>{children}</BackAlleyFrame>; }
