import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { PortfolioGallery } from '@/components/ui/PortfolioGallery';
import { portfolioCategoryLabels, type PortfolioCategory } from '@/data/portfolio';
import { getAllPortfolioItems } from '@/lib/firebase/content.server';

const allCategories: PortfolioCategory[] = ['illustration', 'html-art', 'game'];

export const dynamic = 'force-dynamic';

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const portfolioItems = await getAllPortfolioItems();
  const validCategory = allCategories.includes(resolvedSearchParams?.category as PortfolioCategory)
    ? (resolvedSearchParams?.category as PortfolioCategory)
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
