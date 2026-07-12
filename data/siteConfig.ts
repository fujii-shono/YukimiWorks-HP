export const siteConfig = {
  siteName: 'YukimiWorks',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yukimiworks.com',
  description: '小さなアイデアを形にするYukimiWorksの公式サイト',
  defaultTagline: '小さなアイデアを形にする',
  lunchTagline: 'おいしいごはんをいただきます',
  sleepWarningTagline: 'はやく寝ろ',
  since: '2026.03.04',
  decorativeCounter: '001234',
} as const;
