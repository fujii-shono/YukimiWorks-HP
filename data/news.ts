import { portfolioItems } from '@/data/portfolio';
import { works } from '@/data/works';

export type NewsMedia = {
  type: 'image' | 'video';
  src: string;
  alt?: string;
};

export type NewsBodySegment =
  | { type: 'text'; value: string }
  | { type: 'strikethrough'; value: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'media'; src: string; mediaType: 'image' | 'video'; alt?: string };

export type NewsCategory = 'event' | 'announcement' | 'release' | 'other';
export type NewsSource = 'manual' | 'work' | 'portfolio';

export type News = {
  id: string;
  title: string;
  date: string;
  category: NewsCategory;
  thumbnail: string;
  summary: string;
  href?: string;
  source?: NewsSource;
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

export const manualNews: News[] = [
  {
    id: 'announcement-bokinpage-launch',
    title: '「天使の羽募金」を開始いたしました',
    date: '2026-07-31',
    category: 'announcement',
    thumbnail: '/bokin/header.png',
    summary: '募金ページを追加しました',
    body: [
      {
        type: 'text',
        value:
          'いつも利用してくださる皆様へ。\nこのサービスを今後も継続するため、「天使の羽募金」を開始いたしました。\n\nご支援いただいた方には、ささやかなお礼としておみくじも提供しております。',
      },
      {
        type: 'link',
        label: '天使の羽募金',
        href: '/bokin',
      },
      {
        type: 'text',
        value:
          '今後、会員限定のゲーム・コンテンツなども増やしていく予定です。\n開発にご協力いただけると幸いです。',
      },
    ],
    seoTitle: '「天使の羽募金」を開始いたしました | YukimiWorks',
    seoDescription: '「天使の羽募金」を開始いたしました',
    featured: true,
  },
  {
    id: 'release-acrylic-keychain-svg',
    title: '「アクキーシミュレーター」にSVG作成機能を追加しました',
    date: '2026-07-27',
    category: 'release',
    thumbnail: '/news/20260727-171550.png',
    summary: 'アクキーシミュレーターにSVG作成機能を追加しました',
    body: [
      {
        type: 'text',
        value:
          '「アクキーシミュレーター」に、なんと「SVG作成機能」が追加されました。\nイラストからカットパスを作成できます。',
      },
      {
        type: 'link',
        label: 'アクキーシミュレーター',
        href: '/works/acrylic-keychain-tool',
      },
      {
        type: 'text',
        value:
          'ただし、カットパスは業者によって指定が異なるためそのままでは使えません。今後はこの技術に興味を持ってくれた企業様と連携し、そのまま発注できる形にしたいと思います。\n\nもし、ご興味が湧いた方がいらっしゃいましたら、\nぜひこちらからご連絡くださいm(_ _)m\n\n要望に合わせて柔軟に対応可能です。',
      },
            {
        type: 'link',
        label: 'ご意見・ご要望',
        href: '/contact/inquiry',
      },
    ],
    seoTitle: '「アクキーシミュレーター」にSVG作成機能を追加しました | YukimiWorks',
    seoDescription: '「アクキーシミュレーター」にSVG作成機能を追加しました',
    featured: true,
  },
  {
    id: 'announcement-gamespage-launch',
    title: '「ゲーム」カテゴリを追加しました',
    date: '2026-07-19',
    category: 'announcement',
    thumbnail: '',
    summary: 'HPにGamesページを追加しました',
    body: [
      {
        type: 'strikethrough',
        value:
          'YukimiWorksにGamesページを追加しました。\n\nGamesページには、HTMLで作成したシンプルなゲームを追加していきます。\nネタ系から本格的に遊べるものまで思いついたアイデアを試していくので、ぜひ遊んでみてください。',
      },
      {
        type: 'text',
        value:
          'ゲーム作品はPortfolioページ内の「ゲーム」カテゴリで公開しています。\n\nHTMLアートやイラストとあわせて、Portfolioページからまとめてご覧ください。',
      },
      {
        type: 'link',
        label: 'Portfolioのゲーム一覧へ',
        href: '/portfolio?category=game',
      },
    ],
    seoTitle: 'Gamesカテゴリを追加しました | YukimiWorks',
    seoDescription: 'Gamesカテゴリを追加しました。',
    featured: true,
  },
  // {
  //   id: 'release-tarif-beta',
  //   title: 'Tarifベータ版を公開しました',
  //   date: '2026-07-14',
  //   category: 'release',
  //   thumbnail: '/tarif/hero.png',
  //   summary: 'オンライン料金表サービスTarifを公開しました。',
  //   body: [
  //     {
  //       type: 'text',
  //       value :
  //         'オンライン料金表サービスTarif(タリフ)を公開しました。\n\nTarifでは、依頼時のプラン説明の手間・見積書作成の手間を省くことができます。\n非常に便利なのでぜひお使いください。',
  //     },
  //           {
  //       type: 'link',
  //       label: 'サービスはこちら',
  //       href: 'https://tarif.jp',
  //     }
  //   ],
  //   seoTitle: 'オンライン料金表サービスTarif公開のお知らせ | YukimiWorks',
  //   seoDescription: 'オンライン料金表サービスTarifを公開しました。料金表・見積もり書作成ならTarif。',
  //   featured: true,
  // },
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

const sourceRank: Record<NewsSource, number> = {
  manual: 0,
  work: 1,
  portfolio: 2,
};

const generatedWorkNews: News[] = works
  .filter((work) => Boolean(work.date))
  .map((work) => ({
    id: `work-${work.id}`,
    title: `成果物「${work.title}」を追加しました`,
    date: work.date as string,
    category: 'other',
    thumbnail: work.thumbnail,
    summary: work.description,
    href: `/works/${work.id}`,
    source: 'work',
  }));

const getPortfolioThumbnail = (item: (typeof portfolioItems)[number]) => {
  if (item.content.kind === 'image') return item.content.src;
  return item.content.thumbnail ?? '';
};

const generatedPortfolioNews: News[] = portfolioItems
  .filter((item) => Boolean(item.date))
  .map((item) => ({
    id: `portfolio-${item.id}`,
    title: `ポートフォリオ「${item.title}」を追加しました`,
    date: item.date as string,
    category: 'other',
    thumbnail: getPortfolioThumbnail(item),
    summary: item.description ?? item.title,
    href: item.href,
    source: 'portfolio',
  }));

export const news: News[] = manualNews;

export const newsItems: News[] = [
  ...manualNews.map((item) => ({ ...item, source: item.source ?? 'manual' })),
  ...generatedWorkNews,
  ...generatedPortfolioNews,
].sort((a, b) => {
  const dateOrder = b.date.localeCompare(a.date);
  if (dateOrder !== 0) return dateOrder;

  return sourceRank[a.source ?? 'manual'] - sourceRank[b.source ?? 'manual'];
});
