'use client';

import Image from 'next/image';
import Link from 'next/link';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { getIconPath } from '@/data/iconSets';

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
    <RetroPanel title="Works">
      <div className="service-list">
        {items.map((item) => (
          <Link key={item.value} href={`/works?category=${item.value}`} className="service-row-link">
            <article className="service-row">
              <span className="row-snow" aria-hidden="true">
                ❄
              </span>
              <Image
                className="service-icon pixel-image pixel-art-silhouette"
                src={getIconPath(item.value, event)}
                alt={`${item.title}のアイコン`}
                width={58}
                height={58}
              />
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            </article>
          </Link>
        ))}
      </div>
    </RetroPanel>
  );
}
