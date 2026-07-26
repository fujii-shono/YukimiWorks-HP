export type MessagePost = {
  icon?: {
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
    publishedAt: '2026-07-26 13:33',
    body: '雑にメッセージ入れられるようにしました。今は更新大変だけどそのうち簡単に日常のつぶやきとかできるようにします。',
  },
] as const;
