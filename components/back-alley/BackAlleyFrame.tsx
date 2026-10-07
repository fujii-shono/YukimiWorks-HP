'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BackAlleyGate } from '@/components/back-alley/BackAlleyGate';
import { useBackAlleyPortfolio } from '@/components/back-alley/useBackAlleyPortfolio';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { TimeThemeProvider } from '@/components/theme/TimeThemeProvider';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { MessagePanel } from '@/components/ui/MessagePanel';
import { siteConfig } from '@/data/siteConfig';
import { cn } from '@/lib/format';

const menu = [
  { href: '/back-alley', label: 'Top' },
  { href: '/back-alley/portfolio', label: 'Portfolio' },
  { href: '/back-alley/messages', label: 'Message' },
];

function BackAlleyCounterPanel() {
  const { event, sleepMode } = useTimeTheme();
  const [count, setCount] = useState<string>(siteConfig.decorativeCounter);
  const characterSrc = sleepMode ? '/character/sleeping.png' : '/character/default.png';

  useEffect(() => {
    let active = true;
    void fetch('/api/counter', { cache: 'no-store' })
      .then(async (response) => response.ok ? response.json() as Promise<{ count?: unknown }> : null)
      .then((result) => {
        if (active && typeof result?.count === 'number') setCount(String(Math.max(0, Math.floor(result.count))).padStart(siteConfig.decorativeCounter.length, '0'));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  return <section className="window-panel counter-panel" aria-label="サイト情報"><h2 className="window-title"><span className="title-deco" aria-hidden="true">❄</span><span>Counter</span><span className="title-deco" aria-hidden="true">❄</span></h2><div className="counter-body"><div className="counter-digits" aria-label="装飾用カウンター">{count}</div><span className="counter-character-slot"><span className="pixel-tint-frame pixel-tint-frame-counter" style={{ '--pixel-mask': `url("${event === 'sleep-warning' ? '/effects/eyes.png' : characterSrc}")` } as React.CSSProperties}><SleepWarningImage src={characterSrc} alt="YukimiWorksのミニキャラクター" width={37} height={45} className={cn('tiny-character pixel-image tinted-pixel-art', event !== 'sleep-warning' && 'pixel-art-silhouette')} unoptimized draggable={false} /></span></span></div><p>Since {siteConfig.since}</p></section>;
}

function BackAlleyContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { items } = useBackAlleyPortfolio();
  return (
      <div className="back-alley-root">
        <a className="skip-link" href="#back-alley-main">本文へ移動</a>
        <div className="page-shell">
          <Header homeHref="/back-alley" />
          <div className="layout-grid">
            <aside className="sidebar" aria-label="裏路地メニュー">
              <section className="window-panel menu-panel"><h2 className="window-title">Menu</h2><nav className="sidebar-nav is-open">{menu.map((item) => {
                const active = item.href === '/back-alley' ? pathname === item.href : pathname.startsWith(item.href);
                return <Link key={item.href} href={item.href} className={cn('nav-link', active && 'active')}><span className="nav-mark">◇</span>{item.label}</Link>;
              })}</nav></section>
              <section className="window-panel news-panel"><h2 className="window-title">What&apos;s New</h2><div className="sidebar-content">{items.slice(0, 3).map((item) => <article className="news-item" key={item.id}><time>{item.publishedAt.toDate().toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })}</time><p><Link href={`/back-alley/portfolio/${item.id}`}>{item.title}</Link></p></article>)}{items.length === 0 ? <p>更新情報はありません</p> : null}</div></section>
              <MessagePanel includeBackAlley href="/back-alley/messages" />
              <BackAlleyCounterPanel />
            </aside>
            <main id="back-alley-main" className="main-column">{children}</main>
          </div>
          <Footer />
        </div>
        <Link href="/" className="back-alley-exit">通常ページに戻る</Link>
      </div>
  );
}

export function BackAlleyFrame({ children }: { children: React.ReactNode }) {
  return <TimeThemeProvider><BackAlleyGate><BackAlleyContent>{children}</BackAlleyContent></BackAlleyGate></TimeThemeProvider>;
}
