'use client';

import Link from 'next/link';
import { ProtectedImage } from '@/components/back-alley/ProtectedImage';
import { PortfolioCardContent } from '@/components/ui/PortfolioCardContent';
import { WorkCard } from '@/components/ui/WorkCard';
import { useR18Works } from '@/components/works/useR18Works';
import type { Work } from '@/data/works';

export function WorksGrid({ works }: { works: Work[] }) {
  const { items: r18Works, loading, error, enabled } = useR18Works();
  const hasWorks = works.length > 0 || r18Works.length > 0;

  return (
    <>
      {hasWorks ? (
        <div className="card-grid">
          {works.map((work) => (
            <WorkCard key={work.id} work={work} />
          ))}
          {r18Works.map((item) => (
            <Link href={`/works/r18/${item.id}`} className="retro-card portfolio-card" key={`r18-${item.id}`}>
              <PortfolioCardContent
                media={item.image ? <ProtectedImage path={item.image.path} alt={item.image.alt} className="retro-card-image portfolio-card-image" /> : null}
                title={item.title}
                r18
              />
            </Link>
          ))}
        </div>
      ) : !enabled || !loading ? (
        <p className="empty-state">作品はまだありません</p>
      ) : null}
      {enabled && loading ? <p className="empty-state">R18作品を読み込み中…</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </>
  );
}
