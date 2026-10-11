import { useSyncExternalStore } from 'react';
import {
  collectionStorageKey,
  emptyCollection,
  parseCollection,
  type Collection,
  type CollectionKind,
} from '@shared/collection';
type StorageAdapter = Pick<Storage, 'getItem' | 'setItem'>;
export interface CollectionSnapshot {
  collection: Collection;
  warning: string | null;
}
export function createCollectionStore(storage: StorageAdapter | null) {
  const listeners = new Set<() => void>();
  let snapshot: CollectionSnapshot = {
    collection: emptyCollection,
    warning: null,
  };
  const emit = () => listeners.forEach((listener) => listener());
  const reload = () => {
    try {
      if (!storage) throw new Error('Storage unavailable');
      const saved = storage.getItem(collectionStorageKey);
      snapshot = {
        collection: saved ? parseCollection(saved) : emptyCollection,
        warning: null,
      };
    } catch {
      snapshot = {
        ...snapshot,
        warning:
          'Saved choices could not be read. Your current choices remain available during this session.',
      };
    }
    emit();
  };
  const save = (collection: Collection) => {
    let warning: string | null = null;
    try {
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(collectionStorageKey, JSON.stringify(collection));
    } catch {
      warning =
        'Your browser could not save these choices. They will remain available during this session only. Export a backup to keep them.';
    }
    snapshot = { collection, warning };
    emit();
  };
  reload();
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reload,
    toggle: (kind: CollectionKind, id: number) => {
      if (!Number.isSafeInteger(id) || id < 1 || id > 100000)
        throw new Error('Invalid Pokémon number');
      const previous = snapshot.collection[kind];
      if (!previous.includes(id) && previous.length >= 5000) {
        snapshot = {
          ...snapshot,
          warning:
            'This collection list is full. Remove a choice before adding another.',
        };
        emit();
        return;
      }
      save({
        ...snapshot.collection,
        [kind]: previous.includes(id)
          ? previous.filter((value) => value !== id)
          : [...previous, id],
      });
    },
    import: (text: string, mode: 'merge' | 'replace') => {
      const imported = parseCollection(text);
      const previous = snapshot.collection;
      const next: Collection =
        mode === 'replace'
          ? imported
          : {
              schemaVersion: 1,
              favorites: [
                ...new Set([...previous.favorites, ...imported.favorites]),
              ],
              caught: [...new Set([...previous.caught, ...imported.caught])],
            };
      if (next.favorites.length > 5000 || next.caught.length > 5000)
        throw new Error('Each collection list supports up to 5,000 choices.');
      save(next);
    },
    export: () => JSON.stringify(snapshot.collection, null, 2),
  };
}
function browserStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
export const collectionStore = createCollectionStore(browserStorage());
if (typeof window !== 'undefined')
  window.addEventListener('storage', (event) => {
    if (event.key === collectionStorageKey || event.key === null)
      collectionStore.reload();
  });
export function useCollection() {
  return useSyncExternalStore(
    collectionStore.subscribe,
    collectionStore.getSnapshot,
    collectionStore.getSnapshot,
  );
}
