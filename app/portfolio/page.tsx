import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { PortfolioGallery } from '@/components/ui/PortfolioGallery';
import { portfolioItems } from '@/data/portfolio';

export default function PortfolioPage() {
  return (
    <SiteFrame>
      <RetroPanel title="Portfolio" contentClassName="listing-panel-body">
        {portfolioItems.length ? <PortfolioGallery items={portfolioItems} /> : <p className="empty-state">作品はまだありません</p>}
      </RetroPanel>
    </SiteFrame>
  );
}
