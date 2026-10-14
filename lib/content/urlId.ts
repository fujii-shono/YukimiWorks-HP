export function getNextNumericUrlId(ids: Iterable<string>) {
  const usedIds = new Set(ids);
  let candidate = 1;
  while (usedIds.has(String(candidate))) candidate += 1;
  return String(candidate);
}
