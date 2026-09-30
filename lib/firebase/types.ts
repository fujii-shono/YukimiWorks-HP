import type { Timestamp } from 'firebase/firestore';

export type UserPlan = 'none' | 'blue' | 'night';
export type UserRole = 'user' | 'admin';

export type SiteUser = {
  displayName: string;
  plan: UserPlan;
  coins: number;
  purchasedWorkIds: string[];
  role: UserRole;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseMessageImage = {
  url: string;
  path: string;
  alt: string;
};

export type XPostStatus = 'not_requested' | 'pending' | 'posting' | 'posted' | 'failed' | 'skipped_too_long';

export type FirebaseMessage = {
  id: string;
  body: string;
  images: FirebaseMessageImage[];
  postToX: boolean;
  xPostStatus: XPostStatus;
  xPostId?: string;
  xPostError?: string;
  xPostAttemptedAt?: Timestamp;
  xPostedAt?: Timestamp;
  publishedAt: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseContentMedia = {
  type: 'image' | 'video';
  url: string;
  path: string;
  alt: string;
};

export type FirebaseContentBodySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'media'; media: FirebaseContentMedia };

export type FirebasePortfolioItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  image: FirebaseContentMedia;
  publishedAt: Timestamp;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  noIndex: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseWork = {
  id: string;
  title: string;
  description: string;
  body: string;
  bodySegments: FirebaseContentBodySegment[];
  category: 'contents' | 'tools' | 'apps';
  tags: string[];
  thumbnail?: FirebaseContentMedia;
  media: FirebaseContentMedia[];
  publishedAt: Timestamp;
  url?: string;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  noIndex: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseDiaryEntry = {
  id: string;
  title: string;
  body: string;
  bodySegments: FirebaseContentBodySegment[];
  category: 'chat' | 'report' | 'development' | 'behind-the-scenes' | 'content-creation-tips';
  eyecatch?: FirebaseContentMedia;
  publishedAt: Timestamp;
  seoTitle?: string;
  seoDescription?: string;
  noIndex: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseNews = {
  id: string;
  title: string;
  summary: string;
  body: string;
  bodySegments: FirebaseContentBodySegment[];
  category: 'event' | 'announcement' | 'release' | 'other';
  thumbnail?: FirebaseContentMedia;
  media: FirebaseContentMedia[];
  publishedAt: Timestamp;
  featured: boolean;
  seoTitle?: string;
  seoDescription?: string;
  noIndex: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseContentRecord = FirebasePortfolioItem | FirebaseWork | FirebaseDiaryEntry | FirebaseNews;
