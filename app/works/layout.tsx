import type { Metadata } from 'next';
import { circleMetadata } from '@/lib/siteMetadata';

export const metadata: Metadata = circleMetadata;

export default function WorksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
