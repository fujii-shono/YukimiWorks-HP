import Link from 'next/link';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { portfolioItems } from '@/data/portfolio';

export function PortfolioPreviewSection() {
  const latestItems = portfolioItems.slice(0, 8);

  return (
    <RetroPanel title="Portfolio" className="portfolio-preview-panel">
      <div className="portfolio-preview-list">
        {latestItems.map((item) => (
          <Link key={item.id} href={item.href} className="portfolio-preview-item">
            <SleepWarningImage src={item.image} alt={item.alt} width={96} height={96} className="portfolio-preview-thumb" />
            <span className="portfolio-preview-title">{item.title}</span>
          </Link>
        ))}
      </div>
      <div className="portfolio-preview-more">
        <Link href="/portfolio">その他の作品 &raquo;</Link>
      </div>
    </RetroPanel>
  );
}
