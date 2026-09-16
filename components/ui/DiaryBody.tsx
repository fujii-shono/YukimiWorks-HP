import { Fragment } from 'react';
import { getLinkPreview, type LinkPreview } from '@/lib/linkPreview';

/* eslint-disable @next/next/no-img-element -- OGP画像は任意の外部ドメインから取得するため */

const URL_PATTERN = /(https?:\/\/[^\s<>"']+)/g;
const TRAILING_URL_PUNCTUATION = /[.,!?;:、。！？）\]\}]+$/;

function getUrl(value: string) {
  return value.replace(TRAILING_URL_PUNCTUATION, '');
}

function getUrls(body: string) {
  const urls = body.match(URL_PATTERN)?.map(getUrl).filter(Boolean) ?? [];
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

export async function DiaryBody({ body }: { body: string }) {
  const previewEntries = await Promise.all(
    getUrls(body).map(async (url) => ({ url, preview: await getLinkPreview(url) })),
  );
  const previews = new Map(
    previewEntries.filter((entry): entry is { url: string; preview: LinkPreview } => entry.preview !== null).map((entry) => [entry.url, entry.preview]),
  );

  return (
    <div className="detail-body">
      {body.split(URL_PATTERN).map((part, index) => {
        if (!part) return null;
        if (!part.startsWith('http://') && !part.startsWith('https://')) return <p key={index}>{part}</p>;

        const url = getUrl(part);
        const punctuation = part.slice(url.length);
        const preview = previews.get(url);

        return (
          <Fragment key={`${url}-${index}`}>
            <p>
              <a href={url} target="_blank" rel="noopener noreferrer">
                {url}
              </a>
              {punctuation}
            </p>
            {preview ? <LinkPreviewCard preview={preview} /> : null}
          </Fragment>
        );
      })}
    </div>
  );
}
