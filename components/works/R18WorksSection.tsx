'use client';

import Link from 'next/link';
import { ProtectedImage } from '@/components/back-alley/ProtectedImage';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { PortfolioCardContent } from '@/components/ui/PortfolioCardContent';
import { useR18Works } from '@/components/works/useR18Works';

export function R18WorksSection() {
  const { items, loading, error, enabled } = useR18Works();

  if (!enabled) return null;

  return (
    <RetroPanel title="R18作品" contentClassName="listing-panel-body">
      {loading ? <p className="empty-state">読み込み中…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
      {!loading && !error && !items.length ? <p className="empty-state">R18作品はまだありません</p> : null}
      {items.length ? (
        <div className="card-grid">
          {items.map((item) => (
            <Link href={`/works/r18/${item.id}`} className="retro-card portfolio-card" key={item.id}>
              <PortfolioCardContent
                media={item.image ? <ProtectedImage path={item.image.path} alt={item.image.alt} className="retro-card-image portfolio-card-image" /> : null}
                title={item.title}
                r18
              />
            </Link>
          ))}
        </div>
      ) : null}
    </RetroPanel>
  );
}
