export type MessageTone = 'blue' | 'purple' | 'red' | 'rainbow';

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
  tone?: MessageTone;
};

export const messagePosts: readonly MessagePost[] = [
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-31 18:51',
    body: 'ついにリクありリリース完了です！',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    image: {
      src: '/message/20260822.jpg',
      alt: '震災募金',
    },
    publishedAt: '2026-08-22 10:14',
    body: 'ちゃんと10%募金しました（天使の羽募金）',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    image: {
      src: '/message/20260818.jpg',
      alt: 'wip',
    },
    publishedAt: '2026-08-18 15:27',
    body: '次の作品は難しめ。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-11 11:41',
    body: '新サイト作成が難航中です。便利にしたいので、色々機能を入れてます。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-07 09:29',
    body: '新作ができました！今回は時間限定イベントです。音も流せたので、これでゲームもできそう。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-05 14:31',
    body: 'tarifをもっと使いやすく改良しています。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    image: {
      src: '/message/20260803.png',
      alt: 'メシ',
    },
    publishedAt: '2026-08-04 13:17',
    body: '',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-04 09:08',
    body: 'アクスタシミュレーターに「安定」ボタン追加しました。下側が安定した生成になるので、ポーズが不安定な場合などにお使いください！',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-03 17:25',
    body: 'skebひとつ完了しました。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-02 20:50',
    body: 'アクスタのプレビュー機能だけ完成&公開しました！今日はもう遅いので明日改めて紹介します。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-01 23:00',
    body: 'アクキー微調整終わった(T_T) まだ変なところあったら報告ください。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-08-01 10:00',
    body: 'アクキーSVGを微調整してます。これが終わったらアクスタ対応もします。',
  },
  {
    icon: {
      src: '/logo/yukimi_works_favicon.png',
      alt: 'YukimiWorks',
    },
    publishedAt: '2026-07-31 15:44',
    body: '募金機能実装できました。支援額の10%は震災募金に回すようにしています。',
  },
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
