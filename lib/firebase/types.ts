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

export type FirebaseMessage = {
  id: string;
  body: string;
  images: FirebaseMessageImage[];
  /** 将来のX投稿連携用の予約項目。投稿処理自体は未実装。 */
  postToX: boolean;
  publishedAt: Timestamp;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
