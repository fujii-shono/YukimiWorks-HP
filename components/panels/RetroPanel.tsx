import Image from 'next/image';
import { cn } from '@/lib/format';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';

export function RetroPanel({
  title,
  titleHref,
  titleIconSrc,
  titleAside,
  children,
  className,
  contentClassName,
}: {
  title: string;
  titleHref?: string;
  titleIconSrc?: string;
  titleAside?: string;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn('window-panel', className)}>
      <h2 className="window-title">
        {!titleIconSrc ? (
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
        ) : null}
        {titleHref ? (
          <Link href={titleHref} className={cn('window-title-link', titleIconSrc && 'window-title-label')}>
            {titleIconSrc ? <Image src={titleIconSrc} alt="" width={16} height={16} className="window-title-icon pixel-image" unoptimized /> : null}
            <span>{title}</span>
          </Link>
        ) : (
          <span className={cn(titleIconSrc && 'window-title-label')}>
            {titleIconSrc ? <Image src={titleIconSrc} alt="" width={16} height={16} className="window-title-icon pixel-image" unoptimized /> : null}
            <span>{title}</span>
          </span>
        )}
        {titleAside ? <span className="panel-subtitle">{titleAside}</span> : null}
        {!titleIconSrc ? (
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
        ) : null}
      </h2>
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}
