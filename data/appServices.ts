export type AppService = {
  value: (typeof appServiceValues)[number];
  label: string;
};

export type AppInquiryType = {
  value: (typeof appInquiryTypeValues)[number];
  label: string;
};

export const appServiceValues = ['portlink', 'mega'] as const;
export const appInquiryTypeValues = ['bug', 'request', 'question'] as const;

export const appServices: AppService[] = [
  { value: 'portlink', label: 'PORTLINK' },
  { value: 'mega', label: 'MEGA製作所' },
];

export const appInquiryTypes: AppInquiryType[] = [
  { value: 'bug', label: '不具合報告' },
  { value: 'request', label: '要望' },
  { value: 'question', label: '質問' },
];
