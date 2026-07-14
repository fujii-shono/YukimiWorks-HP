'use client';

import NextLink from 'next/link';
import { type ComponentProps } from 'react';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';

type RestrictedLinkProps = ComponentProps<typeof NextLink>;

function resolvePathname(href: RestrictedLinkProps['href']) {
  if (typeof href === 'string') {
    if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return null;
    if (href.startsWith('http://') || href.startsWith('https://')) return '__external__';

    try {
      return new URL(href, 'https://yukimiworks.local').pathname;
    } catch {
      return null;
    }
  }

  if ('pathname' in href) {
    return href.pathname ?? '/';
  }

  return null;
}

export function RestrictedLink({ href, ...props }: RestrictedLinkProps) {
  const { event } = useTimeTheme();
  const pathname = resolvePathname(href);
  const redirectedHref = event === 'sleep-warning' && pathname !== null && pathname !== '/' ? '/' : href;

  return <NextLink href={redirectedHref} {...props} />;
}
