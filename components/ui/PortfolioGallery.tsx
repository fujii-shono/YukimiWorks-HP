import { PortfolioMedia } from '@/components/portfolio/PortfolioMedia';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { PortfolioCardContent } from '@/components/ui/PortfolioCardContent';
import type { PortfolioItem } from '@/data/portfolio';

export function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  return (
    <div className="card-grid">
      {items.map((item) => (
        <Link key={item.id} href={item.href} className="retro-card portfolio-card">
          <PortfolioCardContent media={<PortfolioMedia item={item} variant="card" className="portfolio-card-image" />} title={item.title} />
        </Link>
      ))}
    </div>
  );
}
