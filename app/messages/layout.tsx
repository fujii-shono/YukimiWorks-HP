import type { Metadata } from 'next';
import { circleMetadata } from '@/lib/siteMetadata';

export const metadata: Metadata = circleMetadata;

export default function MessagesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
