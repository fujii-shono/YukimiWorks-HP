export type AppService = {
  value: string;
  label: string;
};

export const appServices: AppService[] = [
  { value: 'cocoa', label: 'Cocoa' },
  { value: 'rikuari', label: 'リクあり' },
  { value: 'rssmatome', label: 'RSSまとめ' }
];
