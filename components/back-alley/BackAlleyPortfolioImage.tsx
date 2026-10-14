'use client';

import { useEffect, useState } from 'react';
import { ProtectedImage } from '@/components/back-alley/ProtectedImage';

export function BackAlleyPortfolioImage({ path, alt, title }: { path: string; alt: string; title: string }) {
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

  return (
    <>
      <button type="button" className="back-alley-portfolio-image-button" onClick={() => setOpen(true)} aria-label={`${title}を拡大表示`}>
        <ProtectedImage path={path} alt={alt} />
      </button>
      {open ? (
        <div className="messages-image-modal-backdrop" onMouseDown={() => setOpen(false)}>
          <section className="messages-image-modal portfolio-image-modal portfolio-image-modal-image-only" role="dialog" aria-modal="true" aria-label={`${title}の拡大表示`} onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" className="messages-image-modal-close" onClick={() => setOpen(false)} autoFocus aria-label="閉じる">×</button>
            <ProtectedImage path={path} alt={alt} className="messages-image-modal-image" />
          </section>
        </div>
      ) : null}
    </>
  );
}
