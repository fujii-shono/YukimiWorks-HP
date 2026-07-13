export const siteConfig = {
  siteName: 'YukimiWorks',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yukimiworks.com',
  description: '小さなアイデアを形にするYukimiWorksの公式サイト',
  defaultTagline: '小さなアイデアを形にする',
  lunchTagline: '腹が減っては仕事はできぬ',
  snackTagline: '甘いものでもいかが？',
  sleepWarningTagline: 'はやく寝ろ',
  since: '2026.03.04',
  decorativeCounter: '000000',
} as const;
