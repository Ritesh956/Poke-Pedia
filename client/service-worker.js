/* VERSION and PRECACHE are injected by the production build. */
const PREFIX = `pokemonpedia:${self.registration.scope}:`;
const CORE = `${PREFIX}${VERSION}:core`,
  DATA = `${PREFIX}${VERSION}:data`,
  MEDIA = `${PREFIX}${VERSION}:media`;
let writes = Promise.resolve();
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CORE).then((cache) =>
      cache.addAll(
        PRECACHE.map(
          (file) =>
            new Request(new URL(file, self.registration.scope), {
              cache:
                file.startsWith('assets/') ||
                /^data\/[a-f0-9]{16}\/catalogue(?:\.compact-v1)?\.json$/.test(
                  file,
                )
                  ? 'force-cache'
                  : 'reload',
            }),
        ),
      ),
    ),
  );
});
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = (await caches.keys()).filter((key) =>
        key.startsWith(PREFIX),
      );
      const versions = [
        ...new Set(keys.map((key) => key.slice(PREFIX.length).split(':')[0])),
      ].filter((version) => version !== VERSION);
      const keep = new Set([VERSION, versions.at(-1)]);
      await Promise.all(
        keys
          .filter((key) => !keep.has(key.slice(PREFIX.length).split(':')[0]))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});
self.addEventListener('message', (event) => {
  if (event.data?.type === 'APPLY_UPDATE') self.skipWaiting();
});
function store(name, request, response, limit) {
  writes = writes
    .catch(() => {})
    .then(async () => {
      const cache = await caches.open(name);
      await cache.delete(request);
      await cache.put(request, response);
      const keys = await cache.keys();
      await Promise.all(
        keys
          .slice(0, Math.max(0, keys.length - limit))
          .map((key) => cache.delete(key)),
      );
    });
  return writes;
}
self.addEventListener('fetch', (event) => {
  const request = event.request,
    url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (request.mode === 'navigate') {
    event.respondWith(
      caches
        .open(CORE)
        .then((cache) =>
          cache.match(self.registration.scope, { ignoreVary: true }),
        )
        .then((cached) => cached || fetch(request)),
    );
    return;
  }
  const ownData =
    url.href.startsWith(`${self.registration.scope}data/`) &&
    url.pathname.endsWith('.json');
  const image =
    request.destination === 'image' && url.origin !== self.location.origin;
  event.respondWith(
    (async () => {
      const core = await caches.open(CORE),
        data = await caches.open(DATA),
        media = await caches.open(MEDIA);
      const cached =
        (await core.match(request, { ignoreVary: true })) ||
        (await data.match(request, { ignoreVary: true })) ||
        (await media.match(request, { ignoreVary: true })) ||
        (await caches.match(request, { ignoreVary: true }));
      if (cached) return cached;
      try {
        const response = image
          ? await fetch(request.url, { mode: 'cors', credentials: 'omit' })
          : await fetch(request);
        if (
          response.ok &&
          ownData &&
          response.headers.get('content-type')?.includes('application/json')
        )
          await store(DATA, request, response.clone(), 40).catch(() => {});
        if (response.ok && image) {
          const copy = response.clone();
          event.waitUntil(
            copy
              .arrayBuffer()
              .then((bytes) =>
                bytes.byteLength <= 1024 * 1024
                  ? store(MEDIA, request, response.clone(), 32)
                  : undefined,
              )
              .catch(() => {}),
          );
        }
        return response;
      } catch {
        if (image) return fetch(request);
        throw new Error('This resource is not saved for offline use.');
      }
    })(),
  );
});
