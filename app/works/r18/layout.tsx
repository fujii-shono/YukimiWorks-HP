import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'R18作品 | 溶けたアイス',
  robots: { index: false, follow: false, nocache: true },
};

export default function R18WorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
