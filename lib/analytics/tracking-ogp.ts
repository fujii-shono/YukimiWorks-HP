import { siteConfig } from '@/data/siteConfig';

const BOT_PATTERN = /bot|crawler|spider|preview|twitterbot|facebookexternalhit|slackbot|discordbot|whatsapp|telegrambot|embedly|quora link preview/i;
const OGP_FETCH_TIMEOUT_MS = 4_000;
const OGP_RESOLVE_HEADER = 'x-yukimi-ogp-resolve';
const DEFAULT_TITLE = 'YukimiWorks | アプリ・コンテンツ制作';
const DEFAULT_IMAGE_PATH = '/logo/open_graph.png';

type OgpMetadata = {
  title: string;
  description: string;
  image: string;
};

export function isOgpCrawler(userAgent: string) {
  return BOT_PATTERN.test(userAgent);
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getMetaContent(html: string, keys: string[]) {
  for (const tag of html.match(/<meta\s[^>]*>/gi) || []) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])([\s\S]*?)\2/g)) {
      attributes.set(match[1].toLowerCase(), decodeHtmlEntities(match[3].trim()));
    }
    const key = (attributes.get('property') || attributes.get('name') || '').toLowerCase();
    if (keys.includes(key)) {
      const content = attributes.get('content');
      if (content) return content;
    }
  }
  return null;
}

function getDocumentTitle(html: string) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeHtmlEntities(match[1].replace(/\s+/g, ' ').trim()) : null;
}

function defaultMetadata(baseUrl: URL): OgpMetadata {
  return {
    title: DEFAULT_TITLE,
    description: siteConfig.description,
    image: new URL(DEFAULT_IMAGE_PATH, baseUrl).toString(),
  };
}

function allowedOrigins(requestUrl: URL) {
  const origins = new Set([requestUrl.origin]);
  try {
    origins.add(new URL(siteConfig.siteUrl).origin);
  } catch {
    // Invalid configuration falls back to the current request origin.
  }
  return origins;
}

export async function resolveTrackingOgp(destination: string, requestUrl: URL): Promise<OgpMetadata> {
  const fallback = defaultMetadata(requestUrl);
  let destinationUrl: URL;
  try {
    destinationUrl = new URL(destination);
  } catch {
    return fallback;
  }

  const origins = allowedOrigins(requestUrl);
  if (!['http:', 'https:'].includes(destinationUrl.protocol) || !origins.has(destinationUrl.origin)) return fallback;
  if (destinationUrl.pathname.startsWith('/go/')) return fallback;

  try {
    const response = await fetch(destinationUrl, {
      headers: {
        'User-Agent': 'YukimiWorks-OGP-Preview-Bot',
        [OGP_RESOLVE_HEADER]: '1',
      },
      redirect: 'follow',
      signal: AbortSignal.timeout(OGP_FETCH_TIMEOUT_MS),
      next: { revalidate: 300 },
    });
    const responseUrl = new URL(response.url);
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok || !origins.has(responseUrl.origin) || !contentType.includes('text/html')) return fallback;

    const html = await response.text();
    const image = getMetaContent(html, ['og:image', 'twitter:image']);
    return {
      title: getMetaContent(html, ['og:title', 'twitter:title']) || getDocumentTitle(html) || fallback.title,
      description: getMetaContent(html, ['og:description', 'twitter:description', 'description']) || fallback.description,
      image: image ? new URL(image, responseUrl).toString() : fallback.image,
    };
  } catch {
    return fallback;
  }
}

export function createTrackingOgpHtml(metadata: OgpMetadata, trackingUrl: URL, destination: string) {
  const title = escapeHtml(metadata.title);
  const description = escapeHtml(metadata.description);
  const image = escapeHtml(metadata.image);
  const url = escapeHtml(trackingUrl.toString());
  const destinationUrl = escapeHtml(destination);
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex,nofollow">
<title>${title}</title>
<meta name="description" content="${description}">
<meta property="og:type" content="website">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:image" content="${image}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
</head>
<body><p><a href="${destinationUrl}">リンク先へ移動</a></p></body>
</html>`;
}

export function isNestedOgpResolve(request: Request) {
  return request.headers.get(OGP_RESOLVE_HEADER) === '1';
}
