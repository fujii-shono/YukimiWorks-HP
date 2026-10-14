'use client';

import { MessageBody } from '@/components/messages/MessageBody';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { PortfolioDetailMeta } from '@/components/ui/PortfolioDetailMeta';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import type { PortfolioItem } from '@/data/portfolio';
import { formatJapaneseDate } from '@/lib/format';

export function PortfolioImageLightbox({
  item,
  onClose,
  imageOnly = false,
}: {
  item: PortfolioItem;
  onClose: () => void;
  imageOnly?: boolean;
}) {
  if (item.content.kind !== 'image') return null;

  return (
    <div className="messages-image-modal-backdrop" onMouseDown={onClose}>
      <section
        className={`messages-image-modal portfolio-image-modal${imageOnly ? ' portfolio-image-modal-image-only' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={`${item.title}の拡大表示`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="messages-image-modal-close" onClick={onClose} autoFocus aria-label="閉じる">
          ×
        </button>
        <SleepWarningImage
          src={item.content.src}
          alt={item.content.alt}
          width={1200}
          height={900}
          className="messages-image-modal-image"
          unoptimized
        />
        {!imageOnly ? (
          <div className="messages-image-modal-details">
            <h3>{item.title}</h3>
            {item.description ? <p><MessageBody body={item.description} /></p> : null}
            <PortfolioDetailMeta date={item.date ? formatJapaneseDate(item.date) : item.year ? String(item.year) : undefined} tags={item.tags} />
            <div className="portfolio-modal-actions">
              <Link href={item.href} className="pixel-button portfolio-browser-link">
                ブラウザで見る
              </Link>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
