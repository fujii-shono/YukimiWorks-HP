export const MAX_X_POST_CHARACTERS = 280;
export const X_SHORTENED_URL_CHARACTERS = 23;

const URL_PATTERN = /https?:\/\/[^\s<>"']+/giu;
const TRAILING_URL_PUNCTUATION = /[.,!?;:、。！？）】」』〉》]+$/u;

function countTextCharacters(text: string) {
  const Segmenter = Intl.Segmenter;
  if (!Segmenter) return Array.from(text).length;

  const segmenter = new Segmenter('ja', { granularity: 'grapheme' });
  return Array.from(segmenter.segment(text)).reduce(
    (count, { segment }) => count + (/\p{Extended_Pictographic}/u.test(segment) ? 2 : 1),
    0,
  );
}

/** X converts every URL to a t.co URL, which occupies 23 characters. */
export function getXPostCharacterCount(text: string) {
  let count = 0;
  let cursor = 0;

  for (const match of text.matchAll(URL_PATTERN)) {
    const url = match[0];
    const matchIndex = match.index ?? cursor;
    const trailingPunctuation = url.match(TRAILING_URL_PUNCTUATION)?.[0] ?? '';
    count += countTextCharacters(text.slice(cursor, matchIndex));
    count += X_SHORTENED_URL_CHARACTERS;
    count += countTextCharacters(trailingPunctuation);
    cursor = matchIndex + url.length;
  }

  return count + countTextCharacters(text.slice(cursor));
}

export function isXPostTooLong(text: string) {
  return getXPostCharacterCount(text) > MAX_X_POST_CHARACTERS;
}
