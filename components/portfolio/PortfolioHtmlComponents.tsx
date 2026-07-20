'use client';

import type { ReactNode } from 'react';
import type { PortfolioHtmlComponentId, PortfolioItem, PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';
import { HikageScene } from '@/components/portfolio/HikageScene';
import { KokoroScene } from '@/components/portfolio/KokoroScene';
import { RainyDayScene } from '@/components/portfolio/RainyDayScene';
import { SaruDemoScene } from '@/components/portfolio/SaruDemoScene';

type PortfolioHtmlRendererProps = {
  item: PortfolioItem;
  variant: PortfolioMediaVariant;
};

function PortfolioWindowHtml({ item, variant }: PortfolioHtmlRendererProps) {
  const isModal = variant === 'modal';
  const isPreview = variant === 'preview';
  const title = isPreview ? 'HTML' : item.title;

  return (
    <div className={cn('portfolio-html-window', isModal && 'portfolio-html-window-modal', isPreview && 'portfolio-html-window-preview')}>
      <div className="portfolio-html-window-bar">
        <span className="portfolio-html-window-dot" aria-hidden="true" />
        <span className="portfolio-html-window-title">{title}</span>
      </div>
      {isPreview ? (
        <div className="portfolio-html-window-preview-body" aria-hidden="true">
          <span className="portfolio-html-window-preview-mark">HTML</span>
        </div>
      ) : (
        <div className="portfolio-html-window-body">
          <p>{item.description ?? 'HTMLコンポーネントで描画されるポートフォリオです。'}</p>
          {item.tags?.length ? (
            <div className="portfolio-html-window-tags">
              {item.tags.map((tag) => (
                <span key={tag} className="tag-badge">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export const portfolioHtmlComponents: Record<PortfolioHtmlComponentId, (props: PortfolioHtmlRendererProps) => ReactNode> = {
  'pixel-window': PortfolioWindowHtml,
  'hikage-scene': ({ variant }) => <HikageScene variant={variant} />,
  'kokoro-scene': ({ variant }) => <KokoroScene variant={variant} />,
  'rainy-day-scene': ({ variant }) => <RainyDayScene variant={variant} />,
  'saru-demo-scene': ({ variant }) => <SaruDemoScene variant={variant} />,
};
