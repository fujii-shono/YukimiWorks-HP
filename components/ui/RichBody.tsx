import { Fragment } from 'react';
import Image from 'next/image';
import { RestrictedLink as Link } from '@/components/ui/RestrictedLink';
import { getLinkPreview, type LinkPreview } from '@/lib/linkPreview';
import { cn, isSafeLinkHref } from '@/lib/format';

/* eslint-disable @next/next/no-img-element -- OGP画像は任意の外部ドメインから取得するため */

export type RichBodySegment =
  | { type: 'text'; value: string }
  | { type: 'strikethrough'; value: string }
  | { type: 'link'; label: string; href: string }
  | { type: 'media'; src: string; mediaType: 'image' | 'video'; alt?: string };

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;
const TRAILING_URL_PUNCTUATION = /[.,!?;:、。！？）\]\}]+$/;

function getUrl(value: string) {
  return value.replace(TRAILING_URL_PUNCTUATION, '');
}

function getUrls(segments: RichBodySegment[]) {
  const urls = segments.flatMap((segment) => {
    if (segment.type !== 'text') return [];
    return segment.value.match(URL_PATTERN)?.map(getUrl).filter(Boolean) ?? [];
  });
  return [...new Set(urls)];
}

function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer" className="diary-link-preview">
      {preview.image ? <img src={preview.image} alt="" className="diary-link-preview-image" /> : null}
      <span className="diary-link-preview-body">
        {preview.title ? <strong>{preview.title}</strong> : null}
        {preview.description ? <span>{preview.description}</span> : null}
        <small>{new URL(preview.url).hostname}</small>
      </span>
    </a>
  );
}

function TextSegment({ value, previews }: { value: string; previews: Map<string, LinkPreview> }) {
  return value.split(URL_PATTERN).map((part, index) => {
    if (!part) return null;
    if (!part.startsWith('http://') && !part.startsWith('https://')) return <p key={index}>{part}</p>;

    const url = getUrl(part);
    const punctuation = part.slice(url.length);
    const preview = previews.get(url);
    return (
      <Fragment key={`${url}-${index}`}>
        <p>
          <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
          {punctuation}
        </p>
        {preview ? <LinkPreviewCard preview={preview} /> : null}
      </Fragment>
    );
  });
}

export async function RichBody({ body, className }: { body: RichBodySegment[] | string; className?: string }) {
  const segments: RichBodySegment[] = typeof body === 'string' ? [{ type: 'text', value: body }] : body;
  const previewEntries = await Promise.all(getUrls(segments).map(async (url) => ({ url, preview: await getLinkPreview(url) })));
  const previews = new Map(previewEntries.filter((entry): entry is { url: string; preview: LinkPreview } => entry.preview !== null).map((entry) => [entry.url, entry.preview]));

  return (
    <div className={cn('detail-body', className)}>
      {segments.map((segment, index) => {
        if (segment.type === 'text') return <TextSegment key={index} value={segment.value} previews={previews} />;
        if (segment.type === 'strikethrough') return <p key={index} className="detail-body-strikethrough">{segment.value}</p>;
        if (segment.type === 'link') {
          if (!isSafeLinkHref(segment.href)) return null;
          return (
            <p key={index}><Link href={segment.href} target="_blank" rel="noopener noreferrer">{segment.label}</Link></p>
          );
        }
        return segment.mediaType === 'image' ? (
          <Image key={index} src={segment.src} alt={segment.alt ?? ''} width={800} height={450} className="detail-media" />
        ) : (
          <video key={index} src={segment.src} controls className="detail-media" />
        );
      })}
    </div>
  );
}
