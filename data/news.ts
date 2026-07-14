export type NewsMedia = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
};

export type NewsBodySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'media'; src: string; mediaType: 'image' | 'video'; alt?: string };

export type NewsCategory = 'event' | 'announcement' | 'release' | 'other';

export type News = {
  id: string;
  title: string;
  date: string;
  category: NewsCategory;
  thumbnail: string;
  summary: string;
  body?: NewsBodySegment[] | string;
  featured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
};

export const newsCategoryLabels: Record<NewsCategory, string> = {
  event: 'イベント',
  announcement: 'お知らせ',
  release: 'リリース情報',
  other: 'その他',
};

export const news: News[] = [
  // {
  //   id: 'release-sample-app-v1',
  //   title: '新作アプリ「〇〇」をリリースしました',
  //   date: '2026-04-01',
  //   category: 'release',
  //   thumbnail: '/news/placeholder.svg',
  //   summary: 'YukimiWorksの新作アプリ「〇〇」がApp Store・Google Playにて本日より配信開始しました。',
  //   body: [
  //     {
  //       type: 'text',
  //       value:
  //         'YukimiWorksの新作アプリ「〇〇」が、本日よりApp Store・Google Playにて配信を開始しました。\n\n「〇〇」は〇〇をコンセプトに開発した〇〇向けアプリです。\nユーザーの皆さまにとって「あると嬉しい」体験を届けるため、デザインと使いやすさにこだわりました。',
  //     },
  //     {
  //       type: 'media',
  //       src: '/news/placeholder.svg',
  //       mediaType: 'image',
  //       alt: '新作アプリ スクリーンショット',
  //     },
  //     {
  //       type: 'text',
  //       value: '主な機能:\n・機能A\n・機能B\n・機能C\n\nぜひダウンロードしてお試しください。フィードバックもお待ちしています！',
  //     },
  //     {
  //       type: 'link',
  //       label: 'App Store でダウンロード',
  //       href: 'https://apps.apple.com/',
  //     },
  //   ],
  //   seoTitle: '新作アプリ「〇〇」リリース | YukimiWorks',
  //   seoDescription: 'YukimiWorksの新作アプリ「〇〇」がApp Store・Google Playにて配信開始。〇〇向けのアプリです。',
  //   featured: true,
  // },
  // {
  //   id: 'event-sample-2026-spring',
  //   title: '2026年春イベント「〇〇」に出展します',
  //   date: '2026-03-20',
  //   category: 'event',
  //   thumbnail: '/news/placeholder.svg',
  //   summary: '2026年春に開催されるイベント「〇〇」にYukimiWorksが出展します。新作グッズ・デジタルコンテンツの先行販売も予定しています。',
  //   body: [
  //     {
  //       type: 'text',
  //       value:
  //         '2026年〇月〇日（〇）〜〇月〇日（〇）に開催される「〇〇」にYukimiWorksが出展します。\n\n【ブース情報】\n会場: 〇〇\nブース番号: 〇〇\n\n当日は新作グッズの販売や、開発中タイトルのデモプレイを予定しています。\nぜひお気軽にお立ち寄りください！',
  //     },
  //   ],
  //   seoTitle: '2026年春イベント「〇〇」出展のお知らせ | YukimiWorks',
  //   seoDescription: 'YukimiWorksが2026年春イベント「〇〇」に出展します。新作グッズ先行販売・デモプレイも予定。',
  //   featured: true,
  // },
  {
    id: 'announcement-tarif',
    title: 'Tarifベータ版を公開しました',
    date: '2026-07-14',
    category: 'release',
    thumbnail: '/tarif/hero.png',
    summary: 'オンライン料金表サービスTarifを公開しました。',
    body:
      'オンライン料金表サービスTarif(タリフ)を公開しました。\n\nTarifでは、依頼時のプラン説明の手間・見積書作成の手間を省くことができます。\n非常に便利なのでぜひお使いください。',
    seoTitle: 'オンライン料金表サービスTarif公開のお知らせ | YukimiWorks',
    seoDescription: 'オンライン料金表サービスTarifを公開しました。料金表・見積もり書作成ならTarif。',
    featured: true,
  },
  {
    id: 'announcement-sample-site-launch',
    title: 'YukimiWorks コーポレートサイトを公開しました',
    date: '2026-07-13',
    category: 'announcement',
    thumbnail: '',
    summary: 'YukimiWorksの公式コーポレートサイトを本日公開しました。制作実績や会社情報をご覧いただけます。',
    body:
      'YukimiWorksのコーポレートサイトを本日公開しました。\n\n制作実績・会社概要・お問い合わせフォームなどをご用意しています。\nご不明な点やご依頼はお問い合わせフォームよりお気軽にご連絡ください。',
    seoTitle: 'コーポレートサイト公開のお知らせ | YukimiWorks',
    seoDescription: 'YukimiWorksの公式コーポレートサイトを公開しました。制作実績・会社情報・お問い合わせはこちらから。',
    featured: true,
  },
];
