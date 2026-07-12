import { iconFolderByEvent } from '@/data/themeConfig';

export function getIconPath(icon: 'contents' | 'tools' | 'apps' | 'sns', eventName: 'none' | 'lunch' | 'snack' | 'sleep-warning') {
  const folder = iconFolderByEvent[eventName] ?? 'default';
  return `/icons/${folder}/${icon}.png`;
}
