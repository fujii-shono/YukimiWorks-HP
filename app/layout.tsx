import type { Metadata } from 'next';
import { DotGothic16 } from 'next/font/google';
import './globals.css';
import { siteConfig } from '@/data/siteConfig';

const dotGothic = DotGothic16({
  weight: '400',
  variable: '--font-dot',
  display: 'swap',
  preload: false,
});

const themeBootstrapScript = `
(() => {
  const root = document.documentElement;
  const body = document.body;
  const getParts = (date = new Date()) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(date).reduce((acc, part) => {
      if (part.type !== 'literal') acc[part.type] = part.value;
      return acc;
    }, {});
    return {
      dateKey: \`\${parts.year}-\${parts.month}-\${parts.day}\`,
      hour: Number(parts.hour),
      minute: Number(parts.minute),
    };
  };
  const resolveTheme = (hour) => {
    if (hour >= 5 && hour < 7) return 'early-morning';
    if (hour >= 7 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 17) return 'day';
    if (hour >= 17 && hour < 19) return 'evening';
    if (hour >= 19) return 'night';
    return 'late-night';
  };
  const stored = (dateKey, eventName, probability) => {
    const key = \`yukimi-event:\${dateKey}:\${eventName}\`;
    try {
      const value = localStorage.getItem(key);
      if (value === 'active' || value === 'inactive') return value === 'active';
      const active = Math.random() < probability;
      localStorage.setItem(key, active ? 'active' : 'inactive');
      return active;
    } catch {
      return Math.random() < probability;
    }
  };
  const resolveEvent = (parts) => {
    if (parts.hour === 2 && parts.minute <= 30 && stored(parts.dateKey, 'sleep-warning', 0.01)) return 'sleep-warning';
    if (parts.hour === 15 && parts.minute <= 30 && stored(parts.dateKey, 'snack', 0.05)) return 'snack';
    if (parts.hour === 12 && parts.minute <= 30 && stored(parts.dateKey, 'lunch', 0.05)) return 'lunch';
    return 'none';
  };
  const parts = getParts();
  const theme = resolveTheme(parts.hour);
  const eventName = resolveEvent(parts);
  root.dataset.theme = theme;
  root.dataset.event = eventName;
  if (body) {
    body.dataset.theme = theme;
    body.dataset.event = eventName;
  }
})();
`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: 'YukimiWorks | アプリ・コンテンツ制作',
  description: siteConfig.description,
  icons: {
    icon: '/logo/yukimi_works_favicon.svg',
  },
  openGraph: {
    title: 'YukimiWorks | アプリ・コンテンツ制作',
    description: siteConfig.description,
    images: [{ url: '/logo/open_graph.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'YukimiWorks | アプリ・コンテンツ制作',
    description: siteConfig.description,
    images: ['/logo/open_graph.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-theme="day" data-event="none">
      <body className={`${dotGothic.className} ${dotGothic.variable}`}>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        {children}
      </body>
    </html>
  );
}
