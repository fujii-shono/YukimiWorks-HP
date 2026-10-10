import Link from 'next/link';
import { BackAlleyPortfolioList } from '@/components/back-alley/BackAlleyPortfolioList';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { WelcomeSection } from '@/components/sections/WelcomeSection';

export function BackAlleyHomeContent() {
  return (
    <>
      <WelcomeSection copy={['裏ページへようこそ。', '一般向けではない作品や小ネタを扱っています。']} />
      <RetroPanel title="Portfolio" titleHref="/back-alley/portfolio" className="portfolio-preview-panel">
        <BackAlleyPortfolioList featuredOnly />
        <div className="portfolio-preview-more"><Link href="/back-alley/portfolio">その他の作品 &raquo;</Link></div>
      </RetroPanel>
    </>
  );
}
