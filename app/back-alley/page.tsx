import Link from 'next/link';
import { BackAlleyPortfolioList } from '@/components/back-alley/BackAlleyPortfolioList';
import { WelcomeSection } from '@/components/sections/WelcomeSection';
import { RetroPanel } from '@/components/panels/RetroPanel';

export default function BackAlleyPage() { return <><WelcomeSection copy={['裏路地へようこそ。', '表では扱えない大人な作品を扱っています。']} /><RetroPanel title="Portfolio" titleHref="/back-alley/portfolio" className="portfolio-preview-panel"><BackAlleyPortfolioList featuredOnly /><div className="portfolio-preview-more"><Link href="/back-alley/portfolio">その他の作品 &raquo;</Link></div></RetroPanel></>; }
