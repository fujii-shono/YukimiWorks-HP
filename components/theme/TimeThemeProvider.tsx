'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { debugTimeOptions, eventOptions, themeOptions, type DebugTimeValue } from '@/data/themeConfig';
import { getTagline, getTokyoParts, isEventEligibleAtTime, resolveEvent, resolveTheme, type ResolvedEvent, type ResolvedTheme } from '@/lib/japanTime';

type ForcedTheme = (typeof themeOptions)[number]['value'];
type ForcedEvent = (typeof eventOptions)[number]['value'];

type ThemeContextValue = {
  theme: ResolvedTheme;
  event: ResolvedEvent;
  tagline: string;
  forcedTheme: ForcedTheme;
  forcedEvent: ForcedEvent;
  forcedTime: DebugTimeValue;
  setForcedTheme: (value: ForcedTheme) => void;
  setForcedEvent: (value: ForcedEvent) => void;
  setForcedTime: (value: DebugTimeValue) => void;
  isDevelopment: boolean;
  hour: number;
  minute: number;
  absent: boolean;
  canPeek: boolean;
  peekActive: boolean;
  triggerPeek: () => void;
  peekImageSrc: string;
  showPeekBubble: boolean;
  sleepMode: boolean;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const garbledNodes = new Map<Text, string>();
const GARBLED_CHARS = [
  'ﾊ', 'ﾐ', 'ﾑ', 'ﾒ', 'ﾓ', 'ﾔ', 'ﾕ', 'ﾖ', 'ﾜ', 'ｦ', 'ﾝ', 'ﾞ', 'ﾟ',
  '§', '¶', '※', 'Ξ', 'Ω', 'Ж', 'Ю', 'Я', 'λ', 'ψ', 'ξ', 'Δ', '∴', '∵',
  '⊗', '⊙', '⌘', '⌬', '⌁', '☇', '☍', '☒', '☣', '☍', '☠', '⟁', '⟟',
  'ꙮ', 'Ѫ', 'Ѭ', '҈', 'א', 'ב', 'ג', 'ד', 'ش', 'غ', 'ฬ', '෴', 'ฬ', '௵',
  '々', '〆', 'ゟ', 'ヿ', '㊙', '☯', '☲', '♆', '♲', '⚠', '✶', '✸', '✹',
  '░', '▒', '▓', '█', '▣', '▤', '▥', '◉', '◎', '◌', '◍', '⚘', '⚚', '⛧',
  '0', '3', '6', '8', '@', '#', '&', '%', '?', '!', '/', '\\', '|', '~',
] as const;

function garbleText(value: string) {
  return value.replace(/\S/g, () => GARBLED_CHARS[Math.floor(Math.random() * GARBLED_CHARS.length)] ?? '※');
}

function setSleepWarningPersistence(dateKey: string) {
  try {
    window.localStorage.setItem('yukimi-sleep-warning-active', JSON.stringify({ dateKey, untilMinute: 150 }));
  } catch {
    return;
  }
}

function getPersistedSleepWarning(dateKey: string, hour: number, minute: number) {
  try {
    const stored = window.localStorage.getItem('yukimi-sleep-warning-active');
    if (!stored) return false;
    const parsed = JSON.parse(stored) as { dateKey?: string; untilMinute?: number };
    const nowMinute = hour * 60 + minute;
    if (parsed.dateKey === dateKey && typeof parsed.untilMinute === 'number' && nowMinute <= parsed.untilMinute) return true;
    window.localStorage.removeItem('yukimi-sleep-warning-active');
    return false;
  } catch {
    return false;
  }
}

function drawTransientEvent(probability: number) {
  return Math.random() < probability;
}

function applyDataset(theme: ResolvedTheme, eventName: ResolvedEvent, absent: boolean) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.event = eventName;
  document.documentElement.dataset.absent = absent ? 'true' : 'false';
  document.body.dataset.theme = theme;
  document.body.dataset.event = eventName;
  document.body.dataset.absent = absent ? 'true' : 'false';
}

function applyGarbledText(enabled: boolean) {
  const root = document.querySelector('.page-shell');
  if (!root) return;

  if (!enabled) {
    for (const [node, original] of garbledNodes.entries()) node.textContent = original;
    garbledNodes.clear();
    return;
  }

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const parentElement = node.parentElement;
    const content = node.textContent ?? '';
    if (!parentElement || !content.trim()) continue;
    if (parentElement.closest('#site-title')) continue;
    if (parentElement.closest('script,style,textarea,input,select,option')) continue;
    if (!garbledNodes.has(node)) garbledNodes.set(node, content);
    node.textContent = garbleText(garbledNodes.get(node) ?? content);
  }
}

function getDebugParts(value: DebugTimeValue) {
  if (value === 'auto') return null;
  const [hour, minute] = value.split(':').map(Number);
  return { hour, minute, dateKey: 'debug-day' };
}

export function TimeThemeProvider({ children }: { children: ReactNode }) {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const [theme, setTheme] = useState<ResolvedTheme>('day');
  const [event, setEvent] = useState<ResolvedEvent>('none');
  const [forcedTheme, setForcedTheme] = useState<ForcedTheme>('auto');
  const [forcedEvent, setForcedEvent] = useState<ForcedEvent>('auto');
  const [forcedTime, setForcedTime] = useState<DebugTimeValue>('auto');
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [absent, setAbsent] = useState(false);
  const [canPeek, setCanPeek] = useState(false);
  const [peekActive, setPeekActive] = useState(false);
  const rolledEventRef = useRef<ResolvedEvent | null>(null);

  useEffect(() => {
    if (!isDevelopment) return;
    const params = new URLSearchParams(window.location.search);
    const themeParam = params.get('theme');
    const eventParam = params.get('event');
    const timeParam = params.get('debugTime');
    if (themeOptions.some((option) => option.value === themeParam)) setForcedTheme(themeParam as ForcedTheme);
    if (eventOptions.some((option) => option.value === eventParam)) setForcedEvent(eventParam as ForcedEvent);
    if (debugTimeOptions.some((option) => option.value === timeParam)) setForcedTime(timeParam as DebugTimeValue);
  }, [isDevelopment]);

  useEffect(() => {
    rolledEventRef.current = null;
  }, [forcedEvent, forcedTime]);

  useEffect(() => {
    const update = () => {
      const actualParts = getTokyoParts();
      const debugParts = isDevelopment ? getDebugParts(forcedTime) : null;
      const parts = debugParts ?? actualParts;

      setHour(parts.hour);
      setMinute(parts.minute);

      let nextTheme = forcedTheme === 'auto' ? resolveTheme(parts.hour) : (forcedTheme as ResolvedTheme);
      let nextEvent: ResolvedEvent;

      if (forcedEvent !== 'auto') {
        nextEvent = forcedEvent as ResolvedEvent;
      } else if (getPersistedSleepWarning(actualParts.dateKey, actualParts.hour, actualParts.minute)) {
        nextEvent = 'sleep-warning';
      } else if (rolledEventRef.current && isEventEligibleAtTime(rolledEventRef.current, parts.hour, parts.minute)) {
        nextEvent = rolledEventRef.current;
      } else if (parts.hour === 2 && parts.minute <= 30 && drawTransientEvent(0.01)) {
        setSleepWarningPersistence(actualParts.dateKey);
        nextEvent = 'sleep-warning';
      } else {
        nextEvent = resolveEvent(parts, (_dateKey, eventName, probability) => {
          if (eventName === 'sleep-warning') return false;
          return drawTransientEvent(probability);
        });
      }

      if (
        forcedEvent === 'auto' &&
        !getPersistedSleepWarning(actualParts.dateKey, actualParts.hour, actualParts.minute) &&
        nextEvent !== 'sleep-warning'
      ) {
        rolledEventRef.current = nextEvent;
      }

      const shouldBeAbsent = nextEvent === 'away' || nextEvent === 'busy' || nextEvent === 'late-night-away' || nextEvent === 'lunch';
      const canPeekNext = nextEvent === 'busy' || nextEvent === 'late-night-away';

      if (nextEvent === 'lunch') nextTheme = 'day';

      setTheme(nextTheme);
      setEvent(nextEvent);
      setAbsent(shouldBeAbsent);
      setCanPeek(canPeekNext);
      if (!shouldBeAbsent) setPeekActive(false);
      applyDataset(nextTheme, nextEvent, shouldBeAbsent);
    };

    const initialTheme = document.documentElement.dataset.theme as ResolvedTheme | undefined;
    const initialEvent = document.documentElement.dataset.event as ResolvedEvent | undefined;
    if (initialTheme) setTheme(initialTheme);
    if (initialEvent) setEvent(initialEvent);

    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, [forcedEvent, forcedTheme, forcedTime, isDevelopment]);

  const sleepMode = event === 'sleep-warning' || (hour >= 0 && hour < 5);

  useEffect(() => {
    applyGarbledText(event === 'sleep-warning');
    return () => applyGarbledText(false);
  }, [event]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      event,
      tagline: getTagline(event),
      forcedTheme,
      forcedEvent,
      forcedTime,
      setForcedTheme,
      setForcedEvent,
      setForcedTime,
      isDevelopment,
      hour,
      minute,
      absent,
      canPeek,
      peekActive,
      triggerPeek: () => {
        if (!canPeek) return;
        setPeekActive(true);
        window.setTimeout(() => setPeekActive(false), 2500);
      },
      peekImageSrc: event === 'late-night-away' ? '/effects/eyes2.png' : '/character/default.png',
      showPeekBubble: event === 'busy',
      sleepMode,
    }),
    [absent, canPeek, event, forcedEvent, forcedTheme, forcedTime, hour, isDevelopment, minute, peekActive, sleepMode, theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTimeTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTimeTheme must be used within TimeThemeProvider');
  return context;
}
