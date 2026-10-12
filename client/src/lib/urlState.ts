import { useCallback, useSyncExternalStore } from 'react';
import { mergeRouteParams } from '@shared/url-params';
const subscribe = (callback: () => void) => {
  window.addEventListener('hashchange', callback);
  window.addEventListener('popstate', callback);
  return () => {
    window.removeEventListener('hashchange', callback);
    window.removeEventListener('popstate', callback);
  };
};
export function useUrlState(ownerRoute: string) {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => '#/',
  );
  const params = new URLSearchParams(hash.split('?')[1] ?? '');
  const setParams = useCallback(
    (values: Record<string, string | null>, replace = false) => {
      const updated = mergeRouteParams(
        window.location.hash,
        ownerRoute,
        values,
      );
      if (updated === null) return;
      const url = `${window.location.pathname}${window.location.search}#${updated}`;
      window.history[replace ? 'replaceState' : 'pushState'](null, '', url);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    },
    [ownerRoute],
  );
  return [params, setParams] as const;
}
