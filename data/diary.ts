export type DiaryEntry = {
  title: string;
  /** 日本時間で `YYYY-MM-DD HH:mm` の形式で指定する。URL用IDもこの値から自動生成する。 */
  publishedAt: string;
  category: DiaryCategory;
  body: string;
  eyecatch?: string;
  eyecatchAlt?: string;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  noIndex?: boolean;
};

export type DiaryCategory = 'chat' | 'report' | 'development' | 'behind-the-scenes' | 'content-creation-tips';

export const diaryCategoryLabels: Record<DiaryCategory, string> = {
  chat: '雑談',
  report: '報告',
  development: '開発日誌',
  'behind-the-scenes': '制作秘話',
  'content-creation-tips': 'コンテンツ制作の極意',
};

export const defaultDiaryEyecatch = '/logo/open_graph.png';

const PUBLISHED_AT_PATTERN = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;

export function getDiaryId(entry: DiaryEntry) {
  const match = PUBLISHED_AT_PATTERN.exec(entry.publishedAt);
  if (!match) throw new Error(`日記のpublishedAtはYYYY-MM-DD HH:mm形式で指定してください: ${entry.publishedAt}`);

  const [, year, month, day, hour, minute] = match;
  return `${year}${month}${day}-${hour}${minute}`;
}

export function getDiaryDate(entry: DiaryEntry) {
  return entry.publishedAt.slice(0, 10);
}

export function getDiaryTime(entry: DiaryEntry) {
  return entry.publishedAt.slice(11);
}

export function getDiaryPublishedTime(entry: DiaryEntry) {
  return `${entry.publishedAt.replace(' ', 'T')}:00+09:00`;
}

export function isDiaryPublished(entry: DiaryEntry, now = new Date()) {
  const publishedAt = new Date(getDiaryPublishedTime(entry));
  if (Number.isNaN(publishedAt.getTime())) {
    throw new Error(`日記のpublishedAtは有効な日時を指定してください: ${entry.publishedAt}`);
  }

  return publishedAt.getTime() <= now.getTime();
}

export const diaryEntries: DiaryEntry[] = [
  {
    title: '「RSSまとめ」サービス終了の理由',
    publishedAt: '2026-09-16 12:29',
    category: 'development',
    // 本文はテンプレートリテラル内に、画面に表示したい改行のまま記載できます。URLは自動でリンク化されます。
    body: `
      いつもご支援いただきありがとうございます！


      この度まことに残念ながら、
      「RSSまとめ」のサービスを
      9月いっぱいで終了させていただくことになりました…。
      https://rss-matome.com

      利用してくださる方もいて心苦しくはありますが、
      サービス維持費もかかり、
      続けることが難しいのが現状です。
      本当に申し訳ありません。


      サービス終了に至った理由としては、
      当初「他にない斬新さ」で作っては見たものの、
      私自身がこのサービスを使っていて、
      面白さや利便性を感じづらかったことがあります。


      私はサービスの価値を売れるか売れないかで
      決めることはしていません。
      実際、私の運営している「リクあり」は
      現状赤字ですが継続しておりますし、
      今後もサービス終了することはございません。
      https://rikuari.com

      なぜかというと、リクありは私が使っていて
      便利だと感じるからです。
      
      この仕組みは、今後クリエイターの取引において
      スタンダード化していくべきものだと思っているので、
      より便利にして広めたいという情熱があります。


      一方でRSSまとめは「斬新さ」はあるものの、
      それが毎日使うほどの中毒性には至っておらず、
      また利便性もいまいちでした…。
      
      もちろん作って初めて気づけたこともあったので
      意味はありましたが、
      このままサービスを継続しても
      私自身がこのサービスをどう宣伝し売っていくかというビジョンが
      あまり見えませんでした。


      サービス開発においては、この「どう売るか」というのが
      非常に重要になります。
      正直、初速でバズるかどうかは大して重要ではありません。
      むしろバズらないほうが、他社に真似されず
      牙を研ぎ続けることができるので、有利です。

      しかし牙をどう研げば
      社会にとって価値のあるサービスになるかわからないと、
      継続はもちろん改良することも難しいのかなと思います。


      今後も、こうした思いつきでサービスを作ることはあると思いますが、
      私の信念・及び合同会社YukimiWorksのキャッチフレーズは
      「もっと楽しく、もっと便利に」なので、
      その理念にしたがって判断していきたいと思います。

      今後ともよろしくお願いします。
    `.trim(),
  },
];
