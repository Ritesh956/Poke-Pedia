/** Ignore delayed page actions once navigation has left their owning route. */
export function mergeRouteParams(
  hash: string,
  ownerRoute: string,
  values: Record<string, string | null>,
): string | null {
  const [route, search] = hash.replace(/^#/, '').split('?');
  if ((route || '/') !== ownerRoute) return null;
  const updated = new URLSearchParams(search);
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === '') updated.delete(key);
    else updated.set(key, value);
  }
  return `${route || '/'}${updated.size ? '?' + updated.toString() : ''}`;
}
