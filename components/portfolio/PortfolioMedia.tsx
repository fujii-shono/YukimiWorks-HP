'use client';

import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { portfolioHtmlComponents } from '@/components/portfolio/PortfolioHtmlComponents';
import type { PortfolioItem, PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';

type PortfolioMediaProps = {
  item: PortfolioItem;
  variant: PortfolioMediaVariant;
  className?: string;
};

const imageSizes: Record<PortfolioMediaVariant, { width: number; height: number }> = {
  preview: { width: 96, height: 96 },
  card: { width: 560, height: 560 },
  modal: { width: 960, height: 960 },
};

export function PortfolioMedia({ item, variant, className }: PortfolioMediaProps) {
  const outerClassName = cn('portfolio-media-shell', `portfolio-media-shell-${variant}`, className);

  if (item.content.kind === 'image') {
    const { width, height } = imageSizes[variant];

    return (
      <div className={outerClassName}>
        <SleepWarningImage
          src={item.content.src}
          alt={item.content.alt}
          width={width}
          height={height}
          className={variant === 'modal' ? 'portfolio-media-image portfolio-media-image-modal' : 'portfolio-media-image'}
        />
      </div>
    );
  }

  const Renderer = portfolioHtmlComponents[item.content.componentId];

  return (
    <div className={outerClassName}>
      <div className="portfolio-media-html">
        {Renderer ? <Renderer item={item} variant={variant} /> : <p>表示コンポーネントが見つかりません。</p>}
      </div>
    </div>
  );
}
