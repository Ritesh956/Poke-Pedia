import { readFile, writeFile, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
export async function cachedGet(
  url: string,
  cache: string,
  refresh = false,
): Promise<unknown> {
  const parsed = new URL(url);
  if (
    parsed.origin !== 'https://pokeapi.co' ||
    !parsed.pathname.startsWith('/api/v2/')
  )
    throw new Error('Unexpected upstream URL');
  const file = path.join(
    cache,
    createHash('sha256').update(url).digest('hex') + '.json',
  );
  if (!refresh) {
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch {}
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (!res.ok)
        throw new Error(
          `${res.status !== 429 && res.status < 500 ? 'Permanent' : 'Transient'} upstream error ${res.status}: ${url}`,
        );
      const data: unknown = await res.json();
      await writeFile(file + '.tmp', JSON.stringify(data));
      await rename(file + '.tmp', file);
      return data;
    } catch (err) {
      if (
        attempt === 2 ||
        (err instanceof Error && err.message.startsWith('Permanent'))
      )
        throw err;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
  throw new Error('Resource unavailable');
}
