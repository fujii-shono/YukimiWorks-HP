export function formatJapaneseDate(date: string) {
  const parsed = new Date(`${date}T00:00:00+09:00`);
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Tokyo',
  })
    .format(parsed)
    .replaceAll('/', '年')
    .replace(/年(\d{2})年/, '年$1月')
    .replace(/(\d{2})$/, '$1日');
}

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('\n', '<br>');
}
