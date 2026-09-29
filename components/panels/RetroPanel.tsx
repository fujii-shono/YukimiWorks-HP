import { cn } from '@/lib/format';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';

export function RetroPanel({
  title,
  titleHref,
  titleAside,
  children,
  className,
  contentClassName,
}: {
  title: string;
  titleHref?: string;
  titleAside?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn('window-panel', className)}>
      <h2 className="window-title">
        <span className="title-deco" aria-hidden="true">
          ❄
        </span>
        {titleHref ? (
          <Link href={titleHref} className="window-title-link">
            {title}
          </Link>
        ) : (
          <span>{title}</span>
        )}
        {titleAside ? <span className="panel-subtitle">{titleAside}</span> : null}
        <span className="title-deco" aria-hidden="true">
          ❄
        </span>
      </h2>
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}
