import type { ReactNode } from 'react';

export function PortfolioCardContent({ media, title, r18 = false }: { media: ReactNode; title: string; r18?: boolean }) {
  return <><div className="portfolio-card-media">{media}{r18 ? <span className="portfolio-r18-badge">r18</span> : null}</div><div className="retro-card-body portfolio-card-body"><h3>{title}</h3></div></>;
}

export function PortfolioPreviewContent({ media, title, r18 = false }: { media: ReactNode; title: string; r18?: boolean }) {
  return <><span className="portfolio-preview-media">{media}{r18 ? <span className="portfolio-r18-badge">r18</span> : null}</span><span className="portfolio-preview-title">{title}</span></>;
}
