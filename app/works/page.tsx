import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { WorksGrid } from '@/components/works/WorksGrid';
import { getAllWorks } from '@/lib/firebase/content.server';

export const dynamic = 'force-dynamic';

export default async function WorksPage() {
  const works = await getAllWorks();

  return (
    <SiteFrame>
      <RetroPanel title="作品" titleAside="Works" contentClassName="listing-panel-body">
        <WorksGrid works={works} />
      </RetroPanel>
    </SiteFrame>
  );
}
