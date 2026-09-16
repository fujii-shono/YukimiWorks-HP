export type LinkPreview = {
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

const FETCH_TIMEOUT_MS = 5_000;
const MAX_HTML_BYTES = 1_000_000;

function getMetaContent(html: string, key: string) {
  const metaTags = html.match(/<meta\s+[^>]*>/gi) ?? [];

  for (const tag of metaTags) {
    const property = /(?:property|name)=["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (property !== key) continue;

    return /content=["']([^"']*)["']/i.exec(tag)?.[1]?.trim();
  }

  return undefined;
}

function decodeHtml(value: string | undefined) {
  if (!value) return undefined;

  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function toAbsoluteUrl(value: string | undefined, baseUrl: string) {
  if (!value) return undefined;

  try {
    const url = new URL(value, baseUrl);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

export async function getLinkPreview(value: string): Promise<LinkPreview | null> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'YukimiWorks Link Preview Bot' },
      next: { revalidate: 86_400 },
      signal: controller.signal,
    });
    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = Number(response.headers.get('content-length') ?? '0');

    if (!response.ok || !contentType.includes('text/html') || contentLength > MAX_HTML_BYTES) return null;

    const html = await response.text();
    if (html.length > MAX_HTML_BYTES) return null;

    const title = decodeHtml(getMetaContent(html, 'og:title'));
    const description = decodeHtml(getMetaContent(html, 'og:description'));
    const image = toAbsoluteUrl(decodeHtml(getMetaContent(html, 'og:image')), response.url);

    return title || description || image ? { url: response.url, title, description, image } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
