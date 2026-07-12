'use client';

import { useEffect, useState } from 'react';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import type { PortfolioItem } from '@/data/portfolio';

export function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const [selected, setSelected] = useState<PortfolioItem | null>(null);

  useEffect(() => {
    if (!selected) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  return (
    <>
      <div className="card-grid">
        {items.map((item) => (
          <button key={item.id} type="button" className="retro-card retro-card-button" onClick={() => setSelected(item)}>
            <SleepWarningImage src={item.image} alt={item.alt} width={560} height={560} className="retro-card-image" />
            <div className="retro-card-body">
              <h3>{item.title}</h3>
              {item.description ? <p>{item.description}</p> : null}
              <p className="card-meta">
                {item.year ? `${item.year}` : null}
                {item.tags?.length ? ` ${item.tags.join(' / ')}` : null}
              </p>
            </div>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={selected.title} onClick={() => setSelected(null)}>
          <div className="modal-panel" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)} aria-label="閉じる">
              ×
            </button>
            <SleepWarningImage src={selected.image} alt={selected.alt} width={960} height={960} className="modal-image" />
            <h3>{selected.title}</h3>
            {selected.description ? <p>{selected.description}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
