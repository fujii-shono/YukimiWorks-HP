'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';

export function SleepWarningRouteGuard() {
  const pathname = usePathname();
  const router = useRouter();
  const { event } = useTimeTheme();

  useEffect(() => {
    if (event !== 'sleep-warning' || pathname === '/') return;
    router.replace('/');
  }, [event, pathname, router]);

  return null;
}
