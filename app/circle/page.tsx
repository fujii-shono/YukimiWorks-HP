import type { Metadata } from 'next';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { LinkPanel } from '@/components/sections/LinkPanel';
import { PortfolioPreviewSection } from '@/components/sections/PortfolioPreviewSection';
import { WelcomeSection } from '@/components/sections/WelcomeSection';
import { WorksCategoryLinks } from '@/components/sections/WorksCategoryLinks';

export const metadata: Metadata = {
  title: 'YukimiWorks Circle | 制作活動',
  description: 'YukimiWorksのイラスト、同人活動、ツール、ミニゲームなどを紹介するサークルサイトです。',
};

export default function CircleHomePage() {
  return (
    <SiteFrame>
      <WelcomeSection />
      <PortfolioPreviewSection />
      <WorksCategoryLinks />
      <LinkPanel />
    </SiteFrame>
  );
}

export const dynamic = 'force-dynamic';
