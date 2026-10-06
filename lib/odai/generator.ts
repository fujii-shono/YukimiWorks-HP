export const ODAI_PREFIX = '今週のお題：';

export type OdaiCategory = {
  category: string;
  items: string[];
};

export type GeneratedOdai = {
  topic: string;
  displayText: string;
};

const ALLOWED_CATEGORIES = new Set(['ポーズ', '服装', '小物', 'キャラクター']);
const FORBIDDEN_CATEGORY_PAIRS: [string, string][] = [
  ['服装', '小物'],
  ['ポーズ', '小物'],
];

function pickRandom<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function isForbiddenPair(first: string, second: string) {
  return FORBIDDEN_CATEGORY_PAIRS.some(
    ([left, right]) =>
      (first === left && second === right) || (first === right && second === left),
  );
}

function pickTwoDistinctCategories(
  categories: OdaiCategory[],
  random: () => number,
): [OdaiCategory, OdaiCategory] {
  if (categories.length < 2) throw new Error('有効なカテゴリが2つ未満です。');

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const first = pickRandom(categories, random);
    const second = pickRandom(categories, random);
    if (first === second || isForbiddenPair(first.category, second.category)) continue;
    return [first, second];
  }

  return [categories[0], categories[1]];
}

export function normalizeOdaiCategories(value: unknown): OdaiCategory[] {
  if (!Array.isArray(value)) throw new Error('odai.json の形式が不正です。');

  return value.flatMap((entry): OdaiCategory[] => {
    if (!entry || typeof entry !== 'object') return [];
    const category = 'category' in entry ? String(entry.category ?? '') : '';
    const rawItems = 'items' in entry && Array.isArray(entry.items) ? entry.items : [];
    const items = rawItems.map((item: unknown) => String(item).trim()).filter(Boolean);
    if (!ALLOWED_CATEGORIES.has(category) || items.length === 0) return [];
    return [{ category, items }];
  });
}

export function toOdaiDisplayText(topic: string) {
  return `${ODAI_PREFIX}${topic.trim()}`;
}

export function normalizeOdaiTopic(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith(ODAI_PREFIX) ? trimmed.slice(ODAI_PREFIX.length).trim() : trimmed;
}

export function generateOdai(
  source: unknown,
  pastTexts: string[] = [],
  random: () => number = Math.random,
): GeneratedOdai {
  const categories = normalizeOdaiCategories(source);
  if (categories.length < 1) throw new Error('odai.json に有効なデータがありません。');

  const normalizedHistory = new Set(
    pastTexts.map((text) => toOdaiDisplayText(normalizeOdaiTopic(text))).filter(Boolean),
  );

  for (let attempt = 0; attempt < 20; attempt += 1) {
    let topic: string;
    if (random() < 0.6) {
      const category = pickRandom(categories, random);
      topic = pickRandom(category.items, random);
    } else {
      const [firstCategory, secondCategory] = pickTwoDistinctCategories(categories, random);
      topic = `${pickRandom(firstCategory.items, random)}×${pickRandom(secondCategory.items, random)}`;
    }

    const displayText = toOdaiDisplayText(topic);
    if (!normalizedHistory.has(displayText)) return { topic, displayText };
  }

  const category = pickRandom(categories, random);
  const topic = pickRandom(category.items, random);
  return { topic, displayText: toOdaiDisplayText(topic) };
}

export function buildOdaiHashtags(topic: string) {
  const normalizedTopic = normalizeOdaiTopic(topic)
    .replace(/×/g, 'x')
    .replace(/[^\p{L}\p{N}_]/gu, '');
  return `${normalizedTopic ? `#${normalizedTopic} ` : ''}#お題メーカー`;
}

export function buildWeeklyOdaiXPost(topic: string, siteUrl: string) {
  const toolUrl = `${siteUrl.trim().replace(/\/+$/, '')}/works/odai-maker`;
  return `今週のお題\n${buildOdaiHashtags(topic)}\n${toolUrl}`;
}
