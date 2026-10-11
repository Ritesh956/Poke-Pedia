import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
export function OfflineStatus() {
  const client = useQueryClient();
  const [catalogueReady, setCatalogueReady] = useState(
    Boolean(client.getQueryData(['catalogue'])),
  );
  useEffect(
    () =>
      client.getQueryCache().subscribe(() => {
        if (client.getQueryData(['catalogue'])) setCatalogueReady(true);
      }),
    [client],
  );
  const [online, setOnline] = useState(navigator.onLine),
    [ready, setReady] = useState(Boolean(navigator.serviceWorker?.controller)),
    [failed, setFailed] = useState(false),
    [update, setUpdate] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | null>(null),
    applying = useRef(false);
  const controlled = useRef(Boolean(navigator.serviceWorker?.controller));
  useEffect(() => {
    const status = () => setOnline(navigator.onLine);
    window.addEventListener('online', status);
    window.addEventListener('offline', status);
    let disposed = false;
    let firstFrame = 0,
      secondFrame = 0;
    const controller = () => {
      if (applying.current) window.location.reload();
      else {
        setReady(true);
        if (controlled.current) setUpdate(true);
        controlled.current = true;
      }
    };
    if (
      import.meta.env.PROD &&
      'serviceWorker' in navigator &&
      catalogueReady
    ) {
      navigator.serviceWorker.addEventListener('controllerchange', controller);
      firstFrame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          navigator.serviceWorker
            .register(`${import.meta.env.BASE_URL}sw.js`, {
              scope: import.meta.env.BASE_URL,
            })
            .then((reg) => {
              if (disposed) return;
              registration.current = reg;
              setReady(Boolean(navigator.serviceWorker.controller));
              setUpdate(Boolean(reg.waiting));
              reg.addEventListener('updatefound', () => {
                const installing = reg.installing;
                installing?.addEventListener('statechange', () => {
                  if (reg.waiting && navigator.serviceWorker.controller)
                    setUpdate(true);
                  if (installing.state === 'redundant' && !reg.active)
                    setFailed(true);
                });
              });
              navigator.serviceWorker.ready.then(() => {
                if (!disposed) setReady(true);
              });
            })
            .catch(() => {
              if (!disposed) setFailed(true);
            });
        });
      });
    } else if (import.meta.env.PROD && !('serviceWorker' in navigator))
      setFailed(true);
    return () => {
      disposed = true;
      cancelAnimationFrame(firstFrame);
      cancelAnimationFrame(secondFrame);
      window.removeEventListener('online', status);
      window.removeEventListener('offline', status);
      navigator.serviceWorker?.removeEventListener(
        'controllerchange',
        controller,
      );
    };
  }, [catalogueReady]);
  const apply = () => {
    applying.current = true;
    if (registration.current?.waiting)
      registration.current.waiting.postMessage({ type: 'APPLY_UPDATE' });
    else window.location.reload();
  };
  return (
    <div className="offline-status" role="status">
      {!online
        ? ready
          ? 'Offline. Saved catalogue data is available; uncached varieties, families, artwork, and cries may need internet.'
          : 'Offline. This browser has not finished saving the catalogue. Reconnect to prepare offline use.'
        : !import.meta.env.PROD
          ? 'Offline caching is enabled in production builds.'
          : failed
            ? 'Offline caching could not start in this browser.'
            : ready
              ? 'Catalogue saved for offline use.'
              : catalogueReady
                ? 'Preparing the catalogue for offline use…'
                : 'Offline setup after catalogue loads.'}
      {update && (
        <button className="text-action" onClick={apply}>
          Reload to update
        </button>
      )}
    </div>
  );
}
