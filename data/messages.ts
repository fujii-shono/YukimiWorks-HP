export type MessagePost = {
  icon?: {
    src: string;
    alt: string;
  };
  image?: {
    src: string;
    alt: string;
  };
  /** 日本時間で `YYYY-MM-DD HH:mm` の形式で指定する */
  publishedAt: string;
  body: string;
};

export const messagePosts: readonly MessagePost[] = [
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-07-30 20:00',
    body: '明日は募金機能の追加と、アクキーシミュレーターをアクスタ対応させます！',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-07-30 18:02',
    body: '新サービス公開しました。バグはあるという前提で改善していきます。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-07-29 16:22',
    body: '新サービスの最終調整中です。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-07-29 09:00',
    body: 'キリ番判定仕込みました。踏んだ人にはお祝いメッセージが出ます！',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    image: {
      src: '/message/20260728.png',
      alt: 'ラフ',
    },
    publishedAt: '2026-07-28 15:35',
    body: 'イラストできたー！ラフと顔違うけどそんなもの',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-07-27 17:37',
    body: '今日は一日中SVGファイルとにらめっこしてた(T_T)',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-07-27 08:30',
    body: 'アクキーシミュレーターの機能を改善してます。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    image: {
      src: '/message/20260726.jpg',
      alt: 'ラフ',
    },
    publishedAt: '2026-07-26 16:00',
    body: 'ラフです。これはHTMLにはせず、とあるバナー・ヘッダーに使う予定です。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-07-26 13:33',
    body: '雑にメッセージ入れられるようにしました。今は更新大変だけどそのうち簡単に日常のつぶやきとかできるようにします。',
  },
] as const;
