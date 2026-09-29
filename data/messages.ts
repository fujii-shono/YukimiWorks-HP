export type MessageTone = 'blue' | 'purple' | 'red' | 'rainbow';

export type MessagePost = {
  /** Firestore由来の投稿を識別するためのID */
  id?: string;
  icon?: {
    src: string;
    alt: string;
  };
  image?: {
    src: string;
    alt: string;
  };
  images?: readonly {
    src: string;
    alt: string;
  }[];
  /** 日本時間で `YYYY-MM-DD HH:mm` の形式で指定する */
  publishedAt: string;
  body: string;
  /** 募金メッセージだけが使用する */
  tone?: MessageTone;
};
