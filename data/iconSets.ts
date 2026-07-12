import { iconFolderByEvent } from '@/data/themeConfig';

export function getIconPath(icon: 'contents' | 'tools' | 'apps' | 'sns', eventName: 'none' | 'away' | 'busy' | 'late-night-away' | 'lunch' | 'snack' | 'sleep-warning') {
  if (eventName === 'sleep-warning') return '/effects/eyes.png';
  const folder = iconFolderByEvent[eventName] ?? 'default';
  return `/icons/${folder}/${icon}.png`;
}
