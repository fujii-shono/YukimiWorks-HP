import { Fragment, type ReactNode } from 'react';

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g;
const TRAILING_URL_PUNCTUATION = /[.,!?;:。、」』】］｝）》〉]+$/u;

function splitTrailingPunctuation(url: string) {
  const punctuation = url.match(TRAILING_URL_PUNCTUATION)?.[0] || '';
  return { url: punctuation ? url.slice(0, -punctuation.length) : url, punctuation };
}

export function MessageBody({ body, interactive = true }: { body: string; interactive?: boolean }) {
  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const match of body.matchAll(URL_PATTERN)) {
    const matchedUrl = match[0];
    const start = match.index ?? cursor;
    const { url, punctuation } = splitTrailingPunctuation(matchedUrl);
    if (start > cursor) nodes.push(body.slice(cursor, start));

    nodes.push(
      interactive ? (
        <a className="message-inline-link" href={url} key={`${start}-${url}`}>
          {url}
        </a>
      ) : (
        <span className="message-inline-link" key={`${start}-${url}`}>
          {url}
        </span>
      ),
    );
    if (punctuation) nodes.push(punctuation);
    cursor = start + matchedUrl.length;
  }

  if (cursor < body.length) nodes.push(body.slice(cursor));
  return <>{nodes.map((node, index) => <Fragment key={index}>{node}</Fragment>)}</>;
}

