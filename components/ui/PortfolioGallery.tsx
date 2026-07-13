'use client';

import { useEffect, useState } from 'react';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import type { PortfolioItem } from '@/data/portfolio';

export function PortfolioGallery({ items }: { items: PortfolioItem[] }) {
  const [selected, setSelected] = useState<PortfolioItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  useEffect(() => {
    if (!selected) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selected]);

  useEffect(() => {
    setDetailsOpen(false);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);

  return (
    <>
      <div className="card-grid">
        {items.map((item) => (
          <button key={item.id} type="button" className="retro-card retro-card-button portfolio-card" onClick={() => setSelected(item)}>
            <SleepWarningImage src={item.image} alt={item.alt} width={560} height={560} className="retro-card-image portfolio-card-image" />
            <div className="retro-card-body portfolio-card-body">
              <h3>{item.title}</h3>
            </div>
          </button>
        ))}
      </div>
      {selected ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={selected.title} onClick={() => setSelected(null)}>
          <div className="modal-panel portfolio-modal-panel" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="modal-close" onClick={() => setSelected(null)} aria-label="閉じる">
              ×
            </button>
            <div className="portfolio-modal-content">
              <div className="portfolio-modal-image-wrap">
                <SleepWarningImage src={selected.image} alt={selected.alt} width={960} height={960} className="modal-image portfolio-modal-image" />
              </div>
              <div className="portfolio-modal-title-row">
                <h3>{selected.title}</h3>
                <button
                  type="button"
                  className="portfolio-accordion-toggle"
                  aria-expanded={detailsOpen}
                  onClick={() => setDetailsOpen((value) => !value)}
                >
                  ▼
                </button>
              </div>
              {detailsOpen ? (
                <div className="portfolio-modal-body">
                  {selected.description ? <p className="modal-message">{selected.description}</p> : null}
                  {selected.date || selected.year ? (
                    <p className="card-meta portfolio-modal-date">{selected.date ?? String(selected.year)}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
