import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { NewsCard } from '@/components/ui/NewsCard';
import { newsCategoryLabels, newsItems, type NewsCategory } from '@/data/news';

const allCategories: NewsCategory[] = ['event', 'announcement', 'release', 'other'];

export default function NewsPage({
  searchParams,
}: {
  searchParams?: { category?: string };
}) {
  const validCategory = allCategories.includes(searchParams?.category as NewsCategory)
    ? (searchParams?.category as NewsCategory)
    : null;
  const visibleCategories = allCategories.filter((category) => newsItems.some((item) => item.category === category));
  const filteredNews = validCategory ? newsItems.filter((item) => item.category === validCategory) : newsItems;

  return (
    <SiteFrame>
      <RetroPanel title="お知らせ" titleAside="News" contentClassName="listing-panel-body">
        <div className="filter-tabs">
          <Link href="/news" className={!validCategory ? 'active' : undefined}>
            すべて
          </Link>
          {visibleCategories.map((category) => (
            <Link key={category} href={`/news?category=${category}`} className={validCategory === category ? 'active' : undefined}>
              {newsCategoryLabels[category]}
            </Link>
          ))}
        </div>
        {filteredNews.length ? (
          <div className="card-grid">
            {filteredNews.map((article) => (
              <NewsCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          <p className="empty-state">Coming Soon</p>
        )}
      </RetroPanel>
    </SiteFrame>
  );
}
