import type { ReactNode } from 'react';

export function PortfolioCardContent({ media, title }: { media: ReactNode; title: string }) {
  return <>{media}<div className="retro-card-body portfolio-card-body"><h3>{title}</h3></div></>;
}

export function PortfolioPreviewContent({ media, title }: { media: ReactNode; title: string }) {
  return <>{media}<span className="portfolio-preview-title">{title}</span></>;
}
