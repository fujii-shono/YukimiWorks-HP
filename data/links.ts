export type SiteLink = {
  id: string;
  label: string;
  url: string;
  description?: string;
  icon?: string;
  showOnHome: boolean;
  order?: number;
  supportContact?: boolean;
};

export const siteLinks: SiteLink[] = [
  {
    id: 'x',
    label: 'X',
    url: 'https://x.com/fujii_shino',
    description: '最新情報やお知らせを投稿しています。',
    icon: '/icons/default/x.png',
    showOnHome: true,
    order: 10,
    supportContact: true,
  },
  {
    id: 'instagram',
    label: 'Instagram',
    url: 'https://www.instagram.com/yukimisino/',
    description: '制作物や日常の記録を投稿しています。',
    icon: '/icons/default/instagram.png',
    showOnHome: true,
    order: 20,
  },
  {
    id: 'discord',
    label: 'Discord',
    url: 'https://discord.com/users/fujiishino',
    description: 'サポートや交流用のコミュニティです。',
    order: 30,
    supportContact: true,
    showOnHome: false,
  },
];
