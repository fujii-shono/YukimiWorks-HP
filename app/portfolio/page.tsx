import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { PortfolioGallery } from '@/components/ui/PortfolioGallery';
import { portfolioCategoryLabels, portfolioItems, type PortfolioCategory } from '@/data/portfolio';

const allCategories: PortfolioCategory[] = ['illustration', 'html-art', 'game'];

export default function PortfolioPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const validCategory = allCategories.includes(searchParams?.category as PortfolioCategory)
    ? (searchParams?.category as PortfolioCategory)
    : null;
  const visibleCategories = allCategories.filter((category) => portfolioItems.some((item) => item.category === category));
  const filteredItems = validCategory ? portfolioItems.filter((item) => item.category === validCategory) : portfolioItems;

  return (
    <SiteFrame>
      <RetroPanel title="Portfolio" contentClassName="listing-panel-body">
        <div className="filter-tabs">
          <Link href="/portfolio" className={!validCategory ? 'active' : undefined}>
            すべて
          </Link>
          {visibleCategories.map((category) => (
            <Link
              key={category}
              href={`/portfolio?category=${category}`}
              className={validCategory === category ? 'active' : undefined}
            >
              {portfolioCategoryLabels[category]}
            </Link>
          ))}
        </div>
        {filteredItems.length ? <PortfolioGallery items={filteredItems} /> : <p className="empty-state">このカテゴリの作品はまだありません</p>}
      </RetroPanel>
    </SiteFrame>
  );
}
