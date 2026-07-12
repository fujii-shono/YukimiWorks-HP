import { SiteFrame } from '@/components/layout/SiteFrame';
import { LinkPanel } from '@/components/sections/LinkPanel';
import { WelcomeSection } from '@/components/sections/WelcomeSection';
import { WorksCategoryLinks } from '@/components/sections/WorksCategoryLinks';

export default function HomePage() {
  return (
    <SiteFrame>
      <WelcomeSection />
      <WorksCategoryLinks />
      <LinkPanel />
    </SiteFrame>
  );
}
