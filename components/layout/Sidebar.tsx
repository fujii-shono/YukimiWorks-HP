'use client';
import { AnimatePresence, motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { newsItems } from '@/data/news';
import { siteConfig } from '@/data/siteConfig';
import { cn } from '@/lib/format';

const navItems = [
  { href: '/', label: 'Top', icon: '⌂', iconImage: '/icons/default/top.png' },
  { href: '/about', label: 'About', icon: '❄', iconImage: null },
  { href: '/works', label: 'Works', icon: '❄', iconImage: null },
  { href: '/portfolio', label: 'Portfolio', icon: '❄', iconImage: null },
  { href: '/news', label: 'News', icon: '❄', iconImage: null },
  { href: '/links', label: 'Link', icon: '❄', iconImage: null },
  { href: '/contact', label: 'Contact', icon: '❄', iconImage: null },
] as const;

function formatCounterDisplay(value: number) {
  const minimumDigits = siteConfig.decorativeCounter.length;
  return String(Math.max(0, Math.floor(value))).padStart(minimumDigits, '0');
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counterDisplay, setCounterDisplay] = useState<string>(siteConfig.decorativeCounter);
  const [counterMessage, setCounterMessage] = useState<string | null>(null);
  const [isCounterPressed, setIsCounterPressed] = useState(false);
  const counterClickTimestamps = useRef<number[]>([]);
  const counterMessageTimer = useRef<number | null>(null);
  const counterAnimationTimer = useRef<number | null>(null);
  const { absent, event, sleepMode } = useTimeTheme();
  const latestNews = newsItems.slice(0, 3);
  const counterCharacterSrc = sleepMode ? '/character/sleeping.png' : '/character/default.png';
  const counterCharacterMask = event === 'sleep-warning' ? '/effects/eyes.png' : counterCharacterSrc;
  const absentLabel = event === 'lunch' ? '食事中' : event === 'late-night-away' ? '....' : 'お出かけ中';

  const clearCounterTimers = useCallback(() => {
    if (counterMessageTimer.current !== null) {
      window.clearTimeout(counterMessageTimer.current);
      counterMessageTimer.current = null;
    }

    if (counterAnimationTimer.current !== null) {
      window.clearTimeout(counterAnimationTimer.current);
      counterAnimationTimer.current = null;
    }
  }, []);

  const handleCounterCharacterClick = useCallback(() => {
    if (absent) return;

    setIsCounterPressed(true);
    if (counterAnimationTimer.current !== null) window.clearTimeout(counterAnimationTimer.current);
    counterAnimationTimer.current = window.setTimeout(() => {
      setIsCounterPressed(false);
      counterAnimationTimer.current = null;
    }, 140);

    const now = Date.now();
    counterClickTimestamps.current = [...counterClickTimestamps.current.filter((stamp) => now - stamp <= 6000), now];

    if (counterClickTimestamps.current.length < 10) return;

    if (counterMessageTimer.current !== null) window.clearTimeout(counterMessageTimer.current);
    setCounterMessage(
      counterClickTimestamps.current.length >= 30 ? 'いい加減にしないと殴りますよ？' : 'ここをタップしても何もないですよ',
    );
    counterMessageTimer.current = window.setTimeout(() => {
      setCounterMessage(null);
      counterMessageTimer.current = null;
    }, 2_500);
  }, [absent]);

  useEffect(() => {
    let isMounted = true;

    const getTokyoDateKey = () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Tokyo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date());

    const syncCounter = async () => {
      const todayKey = getTokyoDateKey();
      const storageKey = 'yukimi-counter-last-counted-date';
      let shouldCount = true;

      try {
        shouldCount = window.localStorage.getItem(storageKey) !== todayKey;
      } catch {
        shouldCount = true;
      }

      const response = await fetch('/api/counter', {
        method: shouldCount ? 'POST' : 'GET',
        cache: 'no-store',
      });

      if (!response.ok) throw new Error(`[counter] ${response.status}`);
      const json = (await response.json()) as { count?: number };
      if (typeof json.count === 'number' && isMounted) setCounterDisplay(formatCounterDisplay(json.count));

      if (shouldCount) {
        try {
          window.localStorage.setItem(storageKey, todayKey);
        } catch {
          return;
        }
      }
    };

    void syncCounter().catch(async () => {
      try {
        const fallback = await fetch('/api/counter', { cache: 'no-store' });
        if (!fallback.ok) return;
        const json = (await fallback.json()) as { count?: number };
        if (typeof json.count === 'number' && isMounted) setCounterDisplay(formatCounterDisplay(json.count));
      } catch {
        return;
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!absent) return;
    clearCounterTimers();
    counterClickTimestamps.current = [];
    setCounterMessage(null);
    setIsCounterPressed(false);
  }, [absent, clearCounterTimers]);

  useEffect(() => {
    return () => {
      clearCounterTimers();
    };
  }, [clearCounterTimers]);

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
                {item.iconImage ? (
                  <SleepWarningImage
                    src={item.iconImage}
                    alt=""
                    width={16}
                    height={16}
                    className="nav-mark-image pixel-image"
                    unoptimized
                    draggable={false}
                  />
                ) : (
                  <span className="nav-mark">{item.icon}</span>
                )}
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
                  <Link href={item.href ?? `/news/${item.id}`}>{item.title}</Link>
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
            {counterDisplay}
          </div>
          {absent ? (
            <span className="counter-absent">{absentLabel}</span>
          ) : (
            <span className="counter-character-slot">
              <AnimatePresence>
                {counterMessage ? (
                  <motion.span
                    key={counterMessage}
                    className="counter-speech-bubble"
                    role="status"
                    aria-live="polite"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                  >
                    {counterMessage}
                  </motion.span>
                ) : null}
              </AnimatePresence>
              <button
                type="button"
                className="counter-character-button"
                aria-label="ミニキャラクターをタップする"
                onClick={handleCounterCharacterClick}
              >
                <span
                  className={cn(
                    'pixel-tint-frame',
                    'pixel-tint-frame-counter',
                    'counter-character-press-target',
                    isCounterPressed && 'is-clicked',
                  )}
                  style={{ '--pixel-mask': `url("${counterCharacterMask}")` } as CSSProperties}
                >
                  <SleepWarningImage
                    src={counterCharacterSrc}
                    alt="YukimiWorksのミニキャラクター"
                    width={37}
                    height={45}
                    className={cn('tiny-character pixel-image tinted-pixel-art', event !== 'sleep-warning' && 'pixel-art-silhouette')}
                    unoptimized
                    draggable={false}
                  />
                </span>
              </button>
            </span>
          )}
        </div>
        <p>Since {siteConfig.since}</p>
      </section>
    </aside>
  );
}
