'use client';

import Link from 'next/link';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';

export function Header() {
  const { tagline } = useTimeTheme();

  return (
    <header className="hero-banner" aria-labelledby="site-title">
      <span className="header-snow header-snow-large header-snow-left" aria-hidden="true">
        ❄
      </span>
      <span className="header-snow header-snow-small header-snow-left-small" aria-hidden="true">
        ❄
      </span>
      <span className="header-snow header-snow-large header-snow-right" aria-hidden="true">
        ❄
      </span>
      <span className="header-snow header-snow-small header-snow-right-small" aria-hidden="true">
        ❄
      </span>

      <Link href="/" className="hero-link" aria-label="YukimiWorks トップページへ移動">
        <h1 id="site-title">YukimiWorks</h1>
        <p className="tagline">{tagline}</p>
      </Link>
      <div className="dotted-rule" aria-hidden="true" />
    </header>
  );
}
