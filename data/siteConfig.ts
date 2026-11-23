export const siteConfig = {
  siteName: 'YukimiWorks',
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://yukimiworks.com',
  description: '自社プロダクトの開発と企業向けの開発支援を行うYukimiWorksの公式サイト',
  defaultTagline: '',
  lunchTagline: '腹が減っては仕事はできぬ',
  snackTagline: '甘いものでもいかが？',
  sleepWarningTagline: 'はやく寝ろ',
  since: '2026.03.04',
  decorativeCounter: '000000',
} as const;
