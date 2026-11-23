export type CorporateProduct = {
  id: string;
  title: string;
  summary: string;
  thumbnail?: string;
};

export const corporateProducts: CorporateProduct[] = [
  {
    id: 'ai-reception',
    title: 'AI受電システム',
    summary: 'OpenAIと連携し、自然な会話でAIが受付を行う社内システムです。',
    thumbnail: '/products/ai-reception-thumbnail.png',
  },
  {
    id: 'fanport',
    title: '同時SNS投稿ツール FANPORT',
    summary: 'クリエイター支援のため、複数SNSへの同時ポストを実現するサービスです。',
  },
  {
    id: 'mega-factory',
    title: 'グッズ制作の最短ルート MEGA製作所',
    summary: '3Dプレビューと自動カットパス生成により、既存のグッズ制作サイトよりも手軽に簡単に発注できます。',
    thumbnail: '/products/mega-factory-thumbnail.png',
  },
  {
    id: 'local-llm-search',
    title: '社内情報検索システム（ローカルLLM）',
    summary: 'Ollamaを使用し、機密データを守りながら社内情報の検索を可能にしました。',
  },
  {
    id: 'sns-automation',
    title: '自動SNS運用',
    summary: 'AIエージェントを利用することで、誰でも簡単にSNS運用を自動化できます。',
  },
  {
    id: 'sales-email-automation',
    title: '営業メール自動化運用',
    summary: 'AIエージェントを駆使することで、営業メールの自動化に加え、企業ごとに内容を変えることも簡単になりました。',
  },
];
