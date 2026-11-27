import type { Metadata } from 'next';
import Image from 'next/image';
import { SiteFrame } from '@/components/layout/SiteFrame';
import { RetroPanel } from '@/components/panels/RetroPanel';
import { getAllSiteLinks } from '@/lib/firebase/content.server';

export const metadata: Metadata = {
  title: 'リンク集 | 溶けたアイス',
  description: 'サークル「溶けたアイス」のリンク集です。',
};

export const dynamic = 'force-dynamic';

function externalProps(url: string) {
  return url.startsWith('http://') || url.startsWith('https://')
    ? { target: '_blank' as const, rel: 'noopener noreferrer' }
    : {};
}

export default async function LinksPage() {
  const links = await getAllSiteLinks();
  return (
    <SiteFrame>
      <RetroPanel title="リンク集" titleAside="Links" contentClassName="listing-panel-body">
        {links.length ? (
          <div className="site-links-list">
            {links.map((item) => (
              <article className={item.banner ? 'site-link-item has-banner' : 'site-link-item'} key={item.id}>
                {item.banner ? (
                  <a href={item.url} className="site-link-banner" {...externalProps(item.url)}>
                    <Image src={item.banner.src} alt={item.banner.alt} width={900} height={300} unoptimized />
                  </a>
                ) : null}
                <a href={item.url} className="site-link-name" {...externalProps(item.url)}>{item.label}</a>
              </article>
            ))}
          </div>
        ) : <p className="empty-state">リンクはまだありません</p>}
      </RetroPanel>
    </SiteFrame>
  );
}
