import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { NewsCard } from '@/components/ui/NewsCard';
import { getAllNewsItems } from '@/lib/firebase/content.server';

export const dynamic = 'force-dynamic';

export default async function NewsPage() {
  const newsItems = await getAllNewsItems();

  return (
    <SiteFrame>
      <RetroPanel title="お知らせ" titleAside="News" contentClassName="listing-panel-body">
        {newsItems.length ? (
          <div className="card-grid">
            {newsItems.map((article) => (
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
