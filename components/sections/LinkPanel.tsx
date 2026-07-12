'use client';

import Image from 'next/image';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { getIconPath } from '@/data/iconSets';
import { siteLinks } from '@/data/links';

export function LinkPanel() {
  const { event } = useTimeTheme();
  const homeLinks = [...siteLinks]
    .filter((item) => item.showOnHome)
    .sort((left, right) => (left.order ?? Number.MAX_SAFE_INTEGER) - (right.order ?? Number.MAX_SAFE_INTEGER));

  return (
    <RetroPanel title="Link">
      <div className="link-grid">
        {homeLinks.map((item, index) => (
          <a key={item.id} className="social-link" href={item.url} target="_blank" rel="noopener noreferrer">
            {index === 0 ? (
              <Image
                className="social-icon pixel-image pixel-art-silhouette"
                src={getIconPath('sns', event)}
                alt=""
                width={52}
                height={52}
              />
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
        ))}
      </div>
    </RetroPanel>
  );
}
