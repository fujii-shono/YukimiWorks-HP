import type { Metadata } from 'next';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { CircleLatestSections } from '@/components/sections/CircleLatestSections';
import { WelcomeSection } from '@/components/sections/WelcomeSection';

export const metadata: Metadata = {
  title: '溶けたアイス | サークルサイト',
  description: 'サークル「溶けたアイス」のイベント参加、グッズ、ゲーム制作情報をまとめたサイトです。',
};

export default function CircleHomePage() {
  return (
    <SiteFrame>
      <WelcomeSection />
      <CircleLatestSections />
    </SiteFrame>
  );
}

export const dynamic = 'force-dynamic';
