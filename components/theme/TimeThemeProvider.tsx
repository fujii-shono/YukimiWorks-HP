'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { eventOptions, themeOptions } from '@/data/themeConfig';
import { getTagline, getTokyoParts, resolveEvent, resolveTheme, type ResolvedEvent, type ResolvedTheme } from '@/lib/japanTime';

type ForcedTheme = (typeof themeOptions)[number]['value'];
type ForcedEvent = (typeof eventOptions)[number]['value'];

type ThemeContextValue = {
  theme: ResolvedTheme;
  event: ResolvedEvent;
  tagline: string;
  forcedTheme: ForcedTheme;
  forcedEvent: ForcedEvent;
  setForcedTheme: (value: ForcedTheme) => void;
  setForcedEvent: (value: ForcedEvent) => void;
  isDevelopment: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const memoryEventStore = new Map<string, boolean>();

function drawStoredEvent(dateKey: string, eventName: ResolvedEvent, probability: number) {
  const key = `yukimi-event:${dateKey}:${eventName}`;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === 'active' || stored === 'inactive') return stored === 'active';
    const active = Math.random() < probability;
    window.localStorage.setItem(key, active ? 'active' : 'inactive');
    return active;
  } catch {
    if (memoryEventStore.has(key)) return memoryEventStore.get(key) ?? false;
    const active = Math.random() < probability;
    memoryEventStore.set(key, active);
    return active;
  }
}

function applyDataset(theme: ResolvedTheme, eventName: ResolvedEvent) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.event = eventName;
  document.body.dataset.theme = theme;
  document.body.dataset.event = eventName;
}

export function TimeThemeProvider({ children }: { children: ReactNode }) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const [theme, setTheme] = useState<ResolvedTheme>('day');
  const [event, setEvent] = useState<ResolvedEvent>('none');
  const [forcedTheme, setForcedTheme] = useState<ForcedTheme>('auto');
  const [forcedEvent, setForcedEvent] = useState<ForcedEvent>('auto');

  useEffect(() => {
    if (!isDevelopment) return;
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    const eventParam = params.get('event');
    if (themeOptions.some((option) => option.value === themeParam)) setForcedTheme(themeParam as ForcedTheme);
    if (eventOptions.some((option) => option.value === eventParam)) setForcedEvent(eventParam as ForcedEvent);
  }, [isDevelopment]);

  useEffect(() => {
    const update = () => {
      const parts = getTokyoParts();
      const nextTheme = forcedTheme === 'auto' ? resolveTheme(parts.hour) : (forcedTheme as ResolvedTheme);
      const nextEvent = forcedEvent === 'auto' ? resolveEvent(parts, drawStoredEvent) : (forcedEvent as ResolvedEvent);
      setTheme(nextTheme);
      setEvent(nextEvent);
      applyDataset(nextTheme, nextEvent);
    };

    const initialTheme = document.documentElement.dataset.theme as ResolvedTheme | undefined;
    const initialEvent = document.documentElement.dataset.event as ResolvedEvent | undefined;
    if (initialTheme) setTheme(initialTheme);
    if (initialEvent) setEvent(initialEvent);

    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [forcedEvent, forcedTheme]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      event,
      tagline: getTagline(event),
      forcedTheme,
      forcedEvent,
      setForcedTheme,
      setForcedEvent,
      isDevelopment,
    }),
    [event, forcedEvent, forcedTheme, isDevelopment, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTimeTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTimeTheme must be used within TimeThemeProvider');
  }
  return context;
}
