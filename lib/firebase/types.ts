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
