'use client';

import Link from 'next/link';
import { ProtectedImage } from '@/components/back-alley/ProtectedImage';
import { useBackAlleyPortfolio } from '@/components/back-alley/useBackAlleyPortfolio';
import { PortfolioCardContent, PortfolioPreviewContent } from '@/components/ui/PortfolioCardContent';

export function BackAlleyPortfolioList({ featuredOnly = false }: { featuredOnly?: boolean }) {
  const { items, loading, error } = useBackAlleyPortfolio();
  const visible = (featuredOnly ? items.filter((item) => item.featured) : items).slice(0, featuredOnly ? 8 : undefined);
  if (loading) return <p className="empty-state">読み込み中…</p>;
  if (error) return <p className="form-error">{error}</p>;
  if (!visible.length) return <p className="empty-state">裏作品はまだありません</p>;
  if (featuredOnly) return <div className="portfolio-preview-list back-alley-portfolio-preview-list">{visible.map((item) => <Link href={`/back-alley/portfolio/${item.id}`} className="portfolio-preview-item" key={item.id}><PortfolioPreviewContent media={item.locked || !item.image ? <span className="portfolio-preview-thumb r18-locked-cover">R18</span> : <ProtectedImage path={item.image.path} alt={item.image.alt} className="portfolio-preview-thumb" />} title={item.title} /></Link>)}</div>;
  return <div className="card-grid">{visible.map((item) => <Link href={`/back-alley/portfolio/${item.id}`} className="retro-card portfolio-card" key={item.id}><PortfolioCardContent media={item.locked || !item.image ? <span className="retro-card-image portfolio-card-image r18-locked-cover">R18</span> : <ProtectedImage path={item.image.path} alt={item.image.alt} className="retro-card-image portfolio-card-image" />} title={item.title} /></Link>)}</div>;
}
