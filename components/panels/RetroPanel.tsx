import { cn } from '@/lib/format';

export function RetroPanel({
  title,
  titleAside,
  children,
  className,
  contentClassName,
}: {
  title: string;
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
        <span>{title}</span>
        {titleAside ? <span className="panel-subtitle">{titleAside}</span> : null}
        <span className="title-deco" aria-hidden="true">
          ❄
        </span>
      </h2>
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}
