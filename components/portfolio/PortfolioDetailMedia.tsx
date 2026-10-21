'use client';

import { useEffect, useState } from 'react';
import { PortfolioImageLightbox } from '@/components/portfolio/PortfolioImageLightbox';
import { PortfolioMedia } from '@/components/portfolio/PortfolioMedia';
import type { PortfolioItem } from '@/data/portfolio';

export function PortfolioDetailMedia({ item }: { item: PortfolioItem }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  if (item.content.kind === 'video') {
    return <PortfolioMedia item={item} variant="modal" className="portfolio-detail-video" />;
  }

  if (item.content.kind === 'html') {
    return <PortfolioMedia item={item} variant="modal" className="portfolio-detail-html" />;
  }

  return (
    <>
      <button
        type="button"
        className="portfolio-detail-image-button"
        onClick={() => setOpen(true)}
        aria-label={`${item.title}を拡大表示`}
      >
        <PortfolioMedia item={item} variant="modal" className="portfolio-detail-image" />
      </button>
      {open ? <PortfolioImageLightbox item={item} onClose={() => setOpen(false)} imageOnly /> : null}
    </>
  );
}
