import { RetroPanel } from '@/components/panels/RetroPanel';
import { PortfolioMedia } from '@/components/portfolio/PortfolioMedia';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { PortfolioPreviewContent } from '@/components/ui/PortfolioCardContent';
import { getAllPortfolioItems } from '@/lib/firebase/content.server';

export async function PortfolioPreviewSection() {
  const portfolioItems = await getAllPortfolioItems();
  const latestItems = portfolioItems.filter((item) => item.featured).slice(0, 8);

  return (
    <RetroPanel title="Portfolio" titleHref="/portfolio" className="portfolio-preview-panel">
      <div className="portfolio-preview-list">
        {latestItems.map((item) => (
          <Link key={item.id} href={item.href} className="portfolio-preview-item">
            <PortfolioPreviewContent media={<PortfolioMedia item={item} variant="preview" className="portfolio-preview-thumb" />} title={item.title} />
          </Link>
        ))}
      </div>
      <div className="portfolio-preview-more">
        <Link href="/portfolio">その他の作品 &raquo;</Link>
      </div>
    </RetroPanel>
  );
}
