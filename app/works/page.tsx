import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { WorkCard } from '@/components/ui/WorkCard';
import { workCategoryLabels, works, type WorkCategory } from '@/data/works';

const allCategories: WorkCategory[] = ['contents', 'tools', 'apps'];

export default function WorksPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const validCategory = allCategories.includes(searchParams?.category as WorkCategory)
    ? (searchParams?.category as WorkCategory)
    : null;
  const visibleCategories = allCategories.filter((category) => works.some((work) => work.category === category));
  const filteredWorks = validCategory ? works.filter((work) => work.category === validCategory) : works;

  return (
    <SiteFrame>
      <RetroPanel title="成果物" titleAside="Works" contentClassName="listing-panel-body">
        <div className="filter-tabs">
          <Link href="/works" className={!validCategory ? 'active' : undefined}>
            すべて
          </Link>
          {visibleCategories.map((category) => (
            <Link key={category} href={`/works?category=${category}`} className={validCategory === category ? 'active' : undefined}>
              {workCategoryLabels[category]}
            </Link>
          ))}
        </div>
        {filteredWorks.length ? (
          <div className="card-grid">
            {filteredWorks.map((work) => (
              <WorkCard key={work.id} work={work} />
            ))}
          </div>
        ) : (
          <p className="empty-state">該当する成果物はありません</p>
        )}
      </RetroPanel>
    </SiteFrame>
  );
}
