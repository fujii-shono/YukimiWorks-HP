export const themeOptions = [
  { value: 'auto', label: '自動' },
  { value: 'early-morning', label: '早朝' },
  { value: 'day', label: '昼' },
  { value: 'evening', label: '夕方' },
  { value: 'night', label: '夜' },
  { value: 'late-night', label: '深夜' },
] as const;

export const eventOptions = [
  { value: 'auto', label: '自動' },
  { value: 'none', label: 'なし' },
  { value: 'away', label: '不在' },
  { value: 'busy', label: '取り込み中' },
  { value: 'late-night-away', label: '深夜不在' },
  { value: 'lunch', label: '昼食' },
  { value: 'snack', label: 'お菓子' },
  { value: 'sleep-warning', label: '深夜警告' },
] as const;

export const debugTimeOptions = [
  { value: 'auto', label: '自動' },
  { value: '05:30', label: '早朝 05:30' },
  { value: '12:15', label: '昼 12:15' },
  { value: '15:15', label: '3時 15:15' },
  { value: '17:30', label: '夕方 17:30' },
  { value: '19:00', label: '花火開催 19:00' },
  { value: '21:30', label: '夜 21:30' },
  { value: '00:30', label: '深夜 00:30' },
  { value: '02:15', label: '警告 02:15' },
] as const;

// 公開時は false のままにしておく。検証時だけ true にすると、デバッグUIとクエリ上書きを有効化できる。
export const debugControlsEnabled = false as const;

export const iconFolderByEvent = {
  none: 'default',
  away: 'default',
  busy: 'default',
  'late-night-away': 'default',
  lunch: 'food',
  snack: 'sweets',
  'sleep-warning': 'default',
} as const;

export type ThemeName = (typeof themeOptions)[number]['value'];
export type EventName = (typeof eventOptions)[number]['value'];
export type DebugTimeValue = (typeof debugTimeOptions)[number]['value'];
