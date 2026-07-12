import { siteConfig } from '@/data/siteConfig';

export type ResolvedTheme = 'early-morning' | 'morning' | 'day' | 'evening' | 'night' | 'late-night';
export type ResolvedEvent = 'none' | 'lunch' | 'snack' | 'sleep-warning';

export function getTokyoParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});

  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function resolveTheme(hour: number): ResolvedTheme {
  if (hour >= 5 && hour < 7) return 'early-morning';
  if (hour >= 7 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'evening';
  if (hour >= 19) return 'night';
  return 'late-night';
}

export function resolveEvent(parts: ReturnType<typeof getTokyoParts>, getStoredEvent: (dateKey: string, eventName: ResolvedEvent, probability: number) => boolean): ResolvedEvent {
  if (parts.hour === 2 && parts.minute <= 30 && getStoredEvent(parts.dateKey, 'sleep-warning', 0.01)) return 'sleep-warning';
  if (parts.hour === 15 && parts.minute <= 30 && getStoredEvent(parts.dateKey, 'snack', 0.05)) return 'snack';
  if (parts.hour === 12 && parts.minute <= 30 && getStoredEvent(parts.dateKey, 'lunch', 0.05)) return 'lunch';
  return 'none';
}

export function getTagline(eventName: ResolvedEvent) {
  if (eventName === 'sleep-warning') return siteConfig.sleepWarningTagline;
  if (eventName === 'lunch') return siteConfig.lunchTagline;
  return siteConfig.defaultTagline;
}
