'use client';

import type { CSSProperties } from 'react';
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
  if (item.content.kind === 'image') {
    const outerClassName = cn('portfolio-media-shell', `portfolio-media-shell-${variant}`, className);
    const { width, height } = imageSizes[variant];

    return (
      <div className={outerClassName}>
        <SleepWarningImage
          src={item.content.src}
          alt={item.content.alt}
          width={width}
          height={height}
          className={variant === 'modal' ? 'portfolio-media-image portfolio-media-image-modal pixel-image' : 'portfolio-media-image pixel-image'}
          unoptimized
        />
      </div>
    );
  }

  const hasThumbnail = item.content.thumbnail?.trim().length ? true : false;
  const Renderer = portfolioHtmlComponents[item.content.componentId];
  const outerClassName = cn(
    'portfolio-media-shell',
    `portfolio-media-shell-${variant}`,
    'portfolio-html-shell',
    `portfolio-html-shell-${variant}`,
    item.content.fitHeightToContent && 'portfolio-html-shell-fit-height',
    className,
  );
  const htmlWidth = item.content.width ?? 719;
  const htmlHeight = item.content.height ?? 1200;
  const htmlStyle = {
    '--portfolio-html-width': String(htmlWidth),
    '--portfolio-html-height': String(htmlHeight),
    '--portfolio-html-aspect-ratio': `${htmlWidth} / ${htmlHeight}`,
  } as CSSProperties;

  if (hasThumbnail && variant !== 'modal') {
    const { width, height } = imageSizes[variant];

    return (
      <div className={outerClassName} style={htmlStyle}>
        <SleepWarningImage
          src={item.content.thumbnail as string}
          alt={`${item.title}のサムネイル`}
          width={width}
          height={height}
          className="portfolio-media-image pixel-image"
          unoptimized
        />
      </div>
    );
  }

  return (
    <div className={outerClassName} style={htmlStyle}>
      {/* HTML作品は画像と違い自然な高さを持たないので、ここで必ず専用ステージを与える。
          `fill` や `height: 100%` の連鎖に依存しないこと。 */}
      <div className="portfolio-html-stage">
        {Renderer ? <Renderer item={item} variant={variant} /> : <p>表示コンポーネントが見つかりません。</p>}
      </div>
    </div>
  );
}
