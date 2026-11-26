import type { Metadata } from 'next';
import Image from 'next/image';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { getAllGoods } from '@/lib/firebase/content.server';

export const metadata: Metadata = {
  title: 'グッズ | 溶けたアイス',
  description: 'サークル「溶けたアイス」のグッズ情報です。',
};

export const dynamic = 'force-dynamic';

export default async function GoodsPage() {
  const goods = await getAllGoods();
  return (
    <SiteFrame>
      <RetroPanel title="グッズ" titleAside="Goods" contentClassName="listing-panel-body">
        {goods.length ? (
          <div className="card-grid">
            {goods.map((item) => (
              <article className="retro-card" key={item.id}>
                {item.image ? (
                  <Image src={item.image.src} alt={item.image.alt} width={560} height={315} className="retro-card-image" unoptimized />
                ) : null}
                <div className="retro-card-body">
                  <h2>{item.title}</h2>
                  <p>{item.description}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="empty-state">グッズ情報はまだありません</p>
        )}
      </RetroPanel>
    </SiteFrame>
  );
}
