import { useCallback, useSyncExternalStore } from 'react';
const subscribe = (callback: () => void) => {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
};
export function useUrlState() {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '#/',
  );
  const params = new URLSearchParams(hash.split('?')[1] ?? '');
  const setParams = useCallback(
    (values: Record<string, string | null>, replace = false) => {
      const current = window.location.hash.slice(1),
        [route, search] = current.split('?');
      const updated = new URLSearchParams(search);
      for (const [key, value] of Object.entries(values)) {
        if (value === null || value === '') updated.delete(key);
        else updated.set(key, value);
      }
      const url = `${window.location.pathname}${window.location.search}#${route || '/'}${updated.size ? '?' + updated.toString() : ''}`;
      window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    },
    [],
  );
  return [params, setParams] as const;
}
