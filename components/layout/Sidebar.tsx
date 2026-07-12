'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { news } from '@/data/news';
import { siteConfig } from '@/data/siteConfig';
import { cn } from '@/lib/format';

const navItems = [
  { href: '/', label: 'Top', icon: '⌂' },
  { href: '/about', label: 'About', icon: '❄' },
  { href: '/works', label: 'Works', icon: '❄' },
  { href: '/portfolio', label: 'Portfolio', icon: '❄' },
  { href: '/news', label: 'News', icon: '❄' },
  { href: '/links', label: 'Link', icon: '❄' },
  { href: '/contact', label: 'Contact', icon: '❄' },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const latestNews = news.slice(0, 3);

  return (
    <aside className="sidebar" aria-label="サイドメニュー">
      <section className="window-panel menu-panel">
        <h2 className="window-title window-title-menu">
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
          <span>Menu</span>
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu-list"
            onClick={() => setMobileOpen((value) => !value)}
          >
            MENU
          </button>
        </h2>
        <nav id="mobile-menu-list" className={cn('sidebar-nav', mobileOpen && 'is-open')}>
          {navItems.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} className={cn('nav-link', isActive && 'active')} href={item.href}>
                <span className="nav-mark">{item.icon}</span>
                {item.label}
                {isActive ? (
                  <span className="current-mark" aria-hidden="true">
                    ◆
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </section>

      <section className="window-panel news-panel">
        <h2 className="window-title">
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
          <span>What&apos;s New</span>
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
        </h2>
        <div className="sidebar-content">
          {latestNews.length > 0 ? (
            latestNews.map((item) => (
              <article className="news-item" key={item.id}>
                <time dateTime={item.date}>{item.date.replaceAll('-', '/')}</time>
                <p>
                  <Link href={`/news/${item.id}`}>{item.title}</Link>
                </p>
              </article>
            ))
          ) : (
            <p>更新情報はありません</p>
          )}
          <Link className="more-link" href="/news">
            過去の更新履歴 &raquo;
          </Link>
        </div>
      </section>

      <section className="window-panel counter-panel" aria-label="サイト情報">
        <h2 className="window-title">
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
          <span>Counter</span>
        </h2>
        <div className="counter-body">
          <div className="counter-digits" aria-label="装飾用カウンター">
            {siteConfig.decorativeCounter}
          </div>
          <Image
            src="/character/default.png"
            alt="YukimiWorksのミニキャラクター"
            width={37}
            height={45}
            className="tiny-character pixel-image pixel-art-silhouette"
            unoptimized
            draggable={false}
          />
        </div>
        <p>Since {siteConfig.since}</p>
      </section>
    </aside>
  );
}
