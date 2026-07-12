'use client';

import type { CSSProperties } from 'react';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { getIconPath } from '@/data/iconSets';
import { siteLinks } from '@/data/links';
import { cn } from '@/lib/format';

export function LinkPanel() {
  const { event } = useTimeTheme();
  const homeLinks = [...siteLinks]
    .filter((item) => item.showOnHome)
    .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER));

  const getLinkIconPath = (iconPath?: string) => {
    if (event === 'sleep-warning') return '/effects/eyes.png';
    return iconPath ?? getIconPath('sns', event);
  };

  return (
    <RetroPanel title="Link" className="link-panel">
      <div className="link-grid">
        {homeLinks.map((item) => {
          const iconPath = getLinkIconPath(item.icon);

          return (
            <a key={item.id} className="social-link" href={item.url} target="_blank" rel="noopener noreferrer">
              {item.icon ? (
                <span
                  className="pixel-tint-frame pixel-tint-frame-icon"
                  style={{ '--pixel-mask': `url("${iconPath}")` } as CSSProperties}
                >
                  <SleepWarningImage
                    className={cn('social-icon pixel-image tinted-pixel-art', event !== 'sleep-warning' && 'pixel-art-silhouette')}
                    src={iconPath}
                    alt=""
                    width={52}
                    height={52}
                    unoptimized
                    draggable={false}
                  />
                </span>
              ) : (
                <span className="placeholder-social" aria-hidden="true">
                  ◎
                </span>
              )}
              <span>
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </span>
            </a>
          );
        })}
      </div>
    </RetroPanel>
  );
}
