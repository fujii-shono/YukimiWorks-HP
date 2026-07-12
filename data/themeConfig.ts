export const themeOptions = [
  { value: 'auto', label: '自動' },
  { value: 'early-morning', label: '早朝' },
  { value: 'morning', label: '朝' },
  { value: 'day', label: '昼' },
  { value: 'evening', label: '夕方' },
  { value: 'night', label: '夜' },
  { value: 'late-night', label: '深夜' },
] as const;

export const eventOptions = [
  { value: 'auto', label: '自動' },
  { value: 'none', label: 'なし' },
  { value: 'lunch', label: '昼食' },
  { value: 'snack', label: 'お菓子' },
  { value: 'sleep-warning', label: '深夜警告' },
] as const;

export const iconFolderByEvent = {
  none: 'default',
  lunch: 'food',
  snack: 'sweets',
  'sleep-warning': 'default',
} as const;

export type ThemeName = (typeof themeOptions)[number]['value'];
export type EventName = (typeof eventOptions)[number]['value'];
