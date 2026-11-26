'use client';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { LoginEntryButton } from '@/components/auth/AccountControls';
import { WhatsNewPanel, type WhatsNewItem } from '@/components/layout/WhatsNewPanel';
import { MessagePanel } from '@/components/ui/MessagePanel';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { SleepWarningImage } from '@/components/ui/SleepWarningImage';
import { newsItems } from '@/data/news';
import { siteConfig } from '@/data/siteConfig';
import { cn } from '@/lib/format';

const navItems = [
  { href: '/circle', label: 'TOP', iconImage: '/icons/default/top.png' },
  { href: '/news', label: 'ニュース', iconImage: '/icons/default/apps.png' },
  { href: '/works', label: '作品', iconImage: '/icons/default/contents.png' },
  { href: '/goods', label: 'グッズ', iconImage: '/icons/user/coin.png' },
  { href: '/messages', label: 'メッセージ', iconImage: '/icons/default/x.png' },
] as const;

const crackerPieces = Array.from({ length: 18 }, (_, index) => index);

type CounterMilestone = {
  count: number;
  message: string;
  effect?: 'cracker';
};

function getLatestUpdates(now: Date | null): WhatsNewItem[] {
  if (!now) return [];
  return newsItems.map((item) => ({ ...item, href: item.href ?? `/news/${item.id}` }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
}

function formatCounterDisplay(value: number) {
  const minimumDigits = siteConfig.decorativeCounter.length;
  return String(Math.max(0, Math.floor(value))).padStart(minimumDigits, '0');
}

function isCounterMilestone(value: unknown): value is CounterMilestone {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<CounterMilestone>;
  return (
    typeof candidate.count === 'number' &&
    Number.isFinite(candidate.count) &&
    typeof candidate.message === 'string' &&
    (candidate.effect === undefined || candidate.effect === 'cracker')
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [counterDisplay, setCounterDisplay] = useState<string>(siteConfig.decorativeCounter);
  const [counterMessage, setCounterMessage] = useState<string | null>(null);
  const [counterMilestone, setCounterMilestone] = useState<CounterMilestone | null>(null);
  const [isCounterPressed, setIsCounterPressed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [firebaseUpdates, setFirebaseUpdates] = useState<WhatsNewItem[] | null>(null);
  const counterClickTimestamps = useRef<number[]>([]);
  const counterMessageTimer = useRef<number | null>(null);
  const counterAnimationTimer = useRef<number | null>(null);
  const { absent, event, sleepMode } = useTimeTheme();
  const latestNews = firebaseUpdates ?? getLatestUpdates(now);
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
    const updateNow = () => setNow(new Date());
    updateNow();
    const timer = window.setInterval(updateNow, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadUpdates = async () => {
      const response = await fetch('/api/content/updates', { cache: 'no-store' });
      if (!response.ok) return;
      const payload = (await response.json()) as { updates?: WhatsNewItem[] };
      if (active && Array.isArray(payload.updates)) setFirebaseUpdates(payload.updates);
    };
    void loadUpdates();
    const timer = window.setInterval(() => void loadUpdates(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

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
      const json = (await response.json()) as { count?: number; milestone?: unknown };
      if (typeof json.count === 'number' && isMounted) setCounterDisplay(formatCounterDisplay(json.count));
      if (shouldCount && isCounterMilestone(json.milestone) && isMounted) setCounterMilestone(json.milestone);

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

  useEffect(() => {
    if (!counterMilestone) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCounterMilestone(null);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [counterMilestone]);

  useEffect(() => {
    const onDebugMilestone = (event: Event) => {
      if (!(event instanceof CustomEvent) || !isCounterMilestone(event.detail)) return;
      setCounterMilestone(event.detail);
    };

    window.addEventListener('yukimi-counter-debug-milestone', onDebugMilestone);
    return () => window.removeEventListener('yukimi-counter-debug-milestone', onDebugMilestone);
  }, []);

  return (
    <>
      <aside className="sidebar" aria-label="サイドメニュー">
      <LoginEntryButton />
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
            const isActive = item.href === '/circle' ? pathname === '/circle' : pathname.startsWith(item.href);
            return (
              <Link key={item.href} className={cn('nav-link', isActive && 'active')} href={item.href}>
                <SleepWarningImage
                  src={item.iconImage}
                  alt=""
                  width={16}
                  height={16}
                  className="nav-mark-image pixel-image"
                  unoptimized
                  draggable={false}
                />
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

      <WhatsNewPanel items={latestNews} historyHref="/news" LinkComponent={Link} />

      <MessagePanel />

      <section className="window-panel counter-panel" aria-label="サイト情報">
        <h2 className="window-title">
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
          <span>Counter</span>
          <span className="title-deco" aria-hidden="true">
            ❄
          </span>
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

      <AnimatePresence>
        {counterMilestone ? (
          <motion.div
            className="counter-milestone-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="記念番号のお知らせ"
            onClick={() => setCounterMilestone(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {counterMilestone.effect === 'cracker' ? (
              <div className="counter-cracker-effect" aria-hidden="true">
                {crackerPieces.map((piece) => (
                  <span key={piece} />
                ))}
              </div>
            ) : null}
            <motion.div
              className="counter-milestone-modal"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <button type="button" className="counter-milestone-close" onClick={() => setCounterMilestone(null)} aria-label="閉じる">
                ×
              </button>
              <p>{counterMilestone.message}</p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
