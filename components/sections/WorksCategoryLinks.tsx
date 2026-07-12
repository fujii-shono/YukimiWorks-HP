'use client';

import type { CSSProperties } from 'react';
import Link from 'next/link';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { getIconPath } from '@/data/iconSets';
import { cn } from '@/lib/format';

const items = [
  {
    value: 'contents',
    title: 'コンテンツ',
    description: 'Web記事・企画・ガイドなどの成果物',
  },
  {
    value: 'tools',
    title: 'ツール開発',
    description: '業務効率化や日常を支援するツール',
  },
  {
    value: 'apps',
    title: 'アプリサービス',
    description: 'Webサービス・モバイルアプリ',
  },
] as const;

export function WorksCategoryLinks() {
  const { event } = useTimeTheme();

  return (
    <RetroPanel title="Works" className="works-panel">
      <div className="service-list">
        {items.map((item) => {
          const iconPath = getIconPath(item.value, event);

          return (
            <Link key={item.value} href={`/works?category=${item.value}`} className="service-row-link">
              <article className="service-row">
                <span className="row-snow" aria-hidden="true">
                  ❄
                </span>
                <span
                  className="pixel-tint-frame pixel-tint-frame-icon"
                  style={{ '--pixel-mask': `url("${iconPath}")` } as CSSProperties}
                >
                  <SleepWarningImage
                    className={cn('service-icon pixel-image tinted-pixel-art', event !== 'sleep-warning' && 'pixel-art-silhouette')}
                    src={iconPath}
                    alt={`${item.title}のアイコン`}
                    width={58}
                    height={58}
                    unoptimized
                    draggable={false}
                  />
                </span>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </article>
            </Link>
          );
        })}
      </div>
    </RetroPanel>
  );
}
