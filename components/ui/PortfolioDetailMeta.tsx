import { cn } from '@/lib/format';

export function PortfolioDetailMeta({ date, tags, className }: { date?: string; tags?: string[]; className?: string }) {
  if (!date && !tags?.length) return null;

  return (
    <div className={cn('portfolio-detail-meta', className)}>
      {date ? <p className="card-meta portfolio-modal-date">{date}</p> : null}
      {tags?.length ? <div className="tag-list portfolio-detail-tags">{tags.map((tag) => <span className="tag-badge" key={tag}>{tag}</span>)}</div> : null}
    </div>
  );
}
