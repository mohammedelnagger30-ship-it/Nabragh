const CACHE_NAME = 'manhatalilm-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  event.respondWith(
    (async () => {
      const request = event.request;
      const cached = await caches.match(request);

      // Pages: دايماً جيب الأحدث من النت، والكاش بس للدورة (offline)
      if (request.mode === 'navigate') {
        try {
          const response = await fetch(request);
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        } catch (err) {
          return cached || Response.error();
        }
      }

      // Static hashed assets (build output /assets/*): كاش أولاً مع تحديث في الخلفية
      if (url.pathname.startsWith('/assets/')) {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      }

      // Everything else (dev modules, /src/, /@vite/...): network-first دايماً
      try {
        const response = await fetch(request);
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      } catch (err) {
        return cached || Response.error();
      }
    })()
  );
});
