export type CorporateProduct = {
  id: string;
  title: string;
  category: '社内システム' | 'webサービス';
  summary: string;
  challenge: string;
  capabilities: string[];
  supportedSocialNetworks?: string[];
  thumbnail?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
};

export const corporateProducts: CorporateProduct[] = [
  {
    id: 'ai-reception',
    title: 'AI受電システム',
    category: '社内システム',
    summary: '電話の一次受付はAIに。担当者は用件を見て折り返す。',
    challenge:
      '接客や作業中に電話が入り、仕事が止まる。不在着信だけでは、誰からの連絡で、急ぎかどうかが分からない。',
    capabilities: [
      'TwilioとOpenAI Realtime APIをつなぎ、音声ガイダンスの選択式ではなく、相手の回答に合わせてAIが日本語で用件を聞き取ります。',
      '通話中の文字起こしを管理画面で確認でき、必要なら「折り返し先も聞いて」などの指示をその場で追加できます。',
      '通話後は履歴からやり取りを確認できるので、担当者が内容を把握してから折り返せます。',
    ],
    thumbnail: '/products/ai-reception-thumbnail.png',
    thumbnailWidth: 1306,
    thumbnailHeight: 740,
  },
  {
    id: 'fanport',
    title: '同時SNS投稿ツール PORTLINK',
    category: 'webサービス',
    summary: '1つの素材で、複数のSNSに。広報の投稿作業をまとめる。',
    challenge:
      '作品を投稿するたびクリエイターはSNSを開き直し入力している。投稿先が増えるほど、予約や投稿結果を追いづらい。',
    capabilities: [
      'ひとつの画面で投稿を準備し、連携したSNSへまとめて投稿・予約できます。SNSごとの認証や文字数、画像の扱いの違いはシステム側で処理します。',
      '予約投稿はSNSごとに処理し、投稿結果を個別に記録します。一時的な失敗に備え、再試行の仕組みも備えています。',
      '制作実績はポートフォリオにまとめて公開でき、画像に透かしを入れた状態で発信できます。',
    ],
    supportedSocialNetworks: ['X', 'Instagram', 'Threads', 'Bluesky', 'Misskey'],
    thumbnail: '/products/portlink-thumbnail.png',
    thumbnailWidth: 1200,
    thumbnailHeight: 630,
  },
  {
    id: 'mega-factory',
    title: 'MEGA製作所',
    category: 'webサービス',
    summary: '画像1枚で完成イメージを。製作所には、仕様のそろった注文を。',
    challenge:
      '発注者は完成品を想像できず、白版やカットパスの作成でつまずく。製作所は受注のたびに、サイズや仕様、入稿データを確認するやり取りが発生する。',
    capabilities: [
      '発注者は画像をアップロードし、ブラウザ上の3Dプレビューで、アクリルグッズの見た目を注文前に確認できます。',
      '画像の輪郭からカットパスを生成し、元画像・白版・カットパスを分けた編集可能なPSDを作成します。製作所側で必要に応じて調整できます。',
      '注文に入力されたサイズや数量などから、商品仕様書と発注書を生成します。製作所は、注文条件と入稿データをそろえた状態で確認できます。',
    ],
    thumbnail: '/products/mega-factory-thumbnail.png',
    thumbnailWidth: 1280,
    thumbnailHeight: 720,
  },
  {
    id: 'local-llm-search',
    title: '社内文書検索システム（OCR + ローカルLLM）',
    category: '社内システム',
    summary: 'ファイル名を覚えていなくても。社内資料を、外に出さずに中身から探す。',
    challenge:
      '過去の見積書や手順書を探したいが、保存先もファイル名も思い出せない。スキャン資料は通常の文字検索で見つけにくく、機密資料を外部サービスにアップロードできない。',
    capabilities: [
      'Excel・Word・PDF・画像を、ファイル形式を気にせずまとめて検索。スキャン資料やスクリーンショットの文字も端末内OCRで読み取ります。',
      '文書や検索語を外部サーバーへ送らずに検索。PDFは結果から該当ページを開き、原文を確認できます。',
      'ローカルLLMを組み合わせた、自然な文章での検索にも対応可能です。たとえば「前回の見積もりで、納期の条件はどうなっていた？」のように、探したいことを文章で入力できる構成に拡張できます。',
    ],
    thumbnail: '/products/local-llm-search-thumbnail.png',
    thumbnailWidth: 945,
    thumbnailHeight: 659,
  },
];
