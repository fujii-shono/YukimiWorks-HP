import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { PortfolioGallery } from '@/components/ui/PortfolioGallery';
import { gamesItems } from '@/data/games';

export default function GamesPage() {
  return (
    <SiteFrame>
      <RetroPanel title="Games" contentClassName="listing-panel-body">
        {gamesItems.length ? <PortfolioGallery items={gamesItems} /> : <p className="empty-state">ゲームはまだありません</p>}
      </RetroPanel>
    </SiteFrame>
  );
}
