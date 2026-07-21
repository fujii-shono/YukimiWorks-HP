'use client';

import Image, { type ImageProps } from 'next/image';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { cn } from '@/lib/format';

type SleepWarningImageProps = ImageProps & {
  sleepWarningSrc?: string;
};

export function SleepWarningImage({
  src,
  sleepWarningSrc = '/effects/eyes.png',
  alt,
  className,
  unoptimized = true,
  ...props
}: SleepWarningImageProps) {
  const { event } = useTimeTheme();
  const resolvedSrc = event === 'sleep-warning' ? sleepWarningSrc : src;

  return (
    <Image
      {...props}
      src={resolvedSrc}
      alt={alt}
      className={cn(className, event === 'sleep-warning' && 'sleep-warning-image')}
      unoptimized={unoptimized}
    />
  );
}
