import { it, expect, vi } from 'vitest';
import { parseCollection, collectionStorageKey } from '../shared/collection';
import { createCollectionStore } from '../client/src/lib/collection';
function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
it('persists favorites and caught choices independently and restores them', () => {
  const storage = memoryStorage(),
    store = createCollectionStore(storage);
  const listener = vi.fn(),
    unsubscribe = store.subscribe(listener);
  store.toggle('favorites', 25);
  store.toggle('caught', 25);
  store.toggle('caught', 133);
  expect(createCollectionStore(storage).getSnapshot().collection).toEqual({
    schemaVersion: 1,
    favorites: [25],
    caught: [25, 133],
  });
  store.toggle('favorites', 25);
  expect(store.getSnapshot().collection).toEqual({
    schemaVersion: 1,
    favorites: [],
    caught: [25, 133],
  });
  expect(listener).toHaveBeenCalledTimes(4);
  unsubscribe();
});
it('validates imports without losing existing choices and supports merge and replace', () => {
  const store = createCollectionStore(memoryStorage());
  store.toggle('favorites', 25);
  for (const bad of [
    'not json',
    '{"schemaVersion":2,"favorites":[],"caught":[]}',
    '{"schemaVersion":1,"favorites":[-1],"caught":[]}',
    '{"schemaVersion":1,"favorites":["25"],"caught":[]}',
  ])
    expect(() => store.import(bad, 'replace')).toThrow();
  expect(store.getSnapshot().collection.favorites).toEqual([25]);
  const imported = JSON.stringify({
    schemaVersion: 1,
    favorites: [133, 133],
    caught: [1],
  });
  store.import(imported, 'merge');
  expect(store.getSnapshot().collection.favorites).toEqual([25, 133]);
  store.import(imported, 'replace');
  expect(store.getSnapshot().collection.favorites).toEqual([133]);
  expect(parseCollection(store.export())).toEqual(
    store.getSnapshot().collection,
  );
});
it('keeps the app usable when storage is blocked, full, or malformed', () => {
  const blocked = createCollectionStore(null);
  blocked.toggle('favorites', 25);
  expect(blocked.getSnapshot().collection.favorites).toEqual([25]);
  expect(blocked.getSnapshot().warning).toContain('session only');
  const full = createCollectionStore({
    getItem: () => null,
    setItem: () => {
      throw new Error('Quota exceeded');
    },
  });
  full.toggle('caught', 25);
  expect(full.getSnapshot().collection.caught).toEqual([25]);
  const storage = memoryStorage();
  storage.setItem(collectionStorageKey, 'malformed');
  expect(createCollectionStore(storage).getSnapshot().warning).toContain(
    'could not be read',
  );
});
