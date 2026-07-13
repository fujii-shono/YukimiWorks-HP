import { siteConfig } from '@/data/siteConfig';

export type ResolvedTheme = 'early-morning' | 'day' | 'evening' | 'night' | 'late-night';
export type ResolvedEvent = 'none' | 'away' | 'busy' | 'late-night-away' | 'lunch' | 'snack' | 'sleep-warning';

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
  if (hour >= 5 && hour < 9) return 'early-morning';
  if (hour >= 9 && hour < 17) return 'day';
  if (hour >= 17 && hour < 19) return 'evening';
  if (hour >= 19) return 'night';
  return 'late-night';
}

export function resolveEvent(parts: ReturnType<typeof getTokyoParts>, getStoredEvent: (dateKey: string, eventName: ResolvedEvent, probability: number) => boolean): ResolvedEvent {
  if (parts.hour === 2 && parts.minute <= 30 && getStoredEvent(parts.dateKey, 'sleep-warning', 0.01)) return 'sleep-warning';
  if (parts.hour === 15 && parts.minute <= 30 && getStoredEvent(parts.dateKey, 'snack', 0.01)) return 'snack';
  if (parts.hour === 12 && parts.minute <= 30 && getStoredEvent(parts.dateKey, 'lunch', 0.01)) return 'lunch';
  if (parts.hour >= 0 && parts.hour < 2 && getStoredEvent(parts.dateKey, 'late-night-away', 0.005)) return 'late-night-away';
  if (parts.hour >= 0 && parts.hour < 5) return 'none';
  if (getStoredEvent(parts.dateKey, 'away', 0.005)) return getStoredEvent(parts.dateKey, 'busy', 0.2) ? 'busy' : 'away';
  return 'none';
}

export function isEventEligibleAtTime(eventName: ResolvedEvent, hour: number, minute: number) {
  if (eventName === 'sleep-warning') return hour === 2 && minute <= 30;
  if (eventName === 'snack') return hour === 15 && minute <= 30;
  if (eventName === 'lunch') return hour === 12 && minute <= 30;
  if (eventName === 'late-night-away') return hour >= 0 && hour < 2;
  if (eventName === 'away' || eventName === 'busy') return !(hour >= 0 && hour < 5);
  return eventName === 'none';
}

export function getTagline(eventName: ResolvedEvent) {
  if (eventName === 'sleep-warning') return siteConfig.sleepWarningTagline;
  if (eventName === 'lunch') return siteConfig.lunchTagline;
  if (eventName === 'snack') return siteConfig.snackTagline;
  return siteConfig.defaultTagline;
}
