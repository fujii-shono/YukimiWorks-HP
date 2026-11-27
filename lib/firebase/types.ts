import type { Timestamp } from 'firebase/firestore';

export type UserPlan = 'none' | 'blue' | 'night';
export type UserTicket = 'blue' | 'night';
export type UserRole = 'user' | 'admin';

export type StripeSubscriptionState = {
  subscriptionId: string | null;
  customerId: string | null;
  status: string;
  currentPeriodEnd?: number | null;
};

export type SiteUser = {
  displayName: string;
  plan: UserPlan;
  tickets: UserTicket[];
  coins: number;
  purchasedWorkIds: string[];
  role: UserRole;
  backAlleyConfirmed: boolean;
  adultConfirmed: boolean;
  stripeCustomerId?: string;
  stripeSubscriptions?: Partial<Record<UserTicket, StripeSubscriptionState>>;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseMessageImage = {
  url?: string;
  path: string;
  alt: string;
};

export type FirebaseMessage = {
  id: string;
  body: string;
  authorName?: string;
  images: FirebaseMessageImage[];
  publishedAt: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseBackAlleyPortfolioItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  image?: { type: 'image'; path: string; alt: string };
  interaction?: {
    type: 'two-choice';
    prompt: string;
    top: { label: string; image: { type: 'image'; path: string; alt: string } };
    bottom: { label: string; image: { type: 'image'; path: string; alt: string } };
  };
  r18: boolean;
  locked?: boolean;
  publishedAt: Timestamp;
  featured: boolean;
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
  media: FirebaseContentMedia;
  thumbnail?: FirebaseContentMedia;
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
  body: string;
  bodySegments: FirebaseContentBodySegment[];
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

export type FirebaseGoodsItem = {
  id: string;
  title: string;
  body: string;
  bodySegments: FirebaseContentBodySegment[];
  description: string;
  thumbnail?: FirebaseContentMedia;
  image?: FirebaseContentMedia;
  media: FirebaseContentMedia[];
  publishedAt: Timestamp;
  seoTitle?: string;
  seoDescription?: string;
  noIndex: boolean;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};

export type FirebaseSiteLink = {
  id: string;
  label: string;
  url: string;
  banner?: FirebaseContentMedia;
  order: number;
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
  body: string;
  bodySegments: FirebaseContentBodySegment[];
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

export type FirebaseContentRecord = FirebasePortfolioItem | FirebaseWork | FirebaseGoodsItem | FirebaseDiaryEntry | FirebaseNews;
