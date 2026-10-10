export type TrafficPoint = {
  period: string;
  visitors: number;
};

export type TrafficGranularity = 'daily' | 'monthly';

export type TrackingTrafficDetail = {
  token: string;
  granularity: TrafficGranularity;
  anchor: string;
  rangeStart: string;
  rangeEnd: string;
  points: TrafficPoint[];
};

export type TrackingLinkStats = {
  token: string;
  kind: 'message' | 'standalone';
  destinationUrl: string;
  trackingUrl: string;
  label?: string;
  messageId?: string;
  messageBody?: string;
  totalVisitors: number;
  createdAt: string;
};
