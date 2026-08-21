/* 查字典大挑戰 — 離線快取
 * 題庫與程式碼都打包在 assets 裡，precache 後就能完全離線遊玩。
 */
const CACHE_NAME = 'dictionary-race-v1';

const PRECACHE_PATHS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/index.js',
  './assets/index.css',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await Promise.all(
        PRECACHE_PATHS.map(async (path) => {
          const url = new URL(path, self.registration.scope).toString();
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch {
            // 少數檔案不存在時不要讓整個安裝失敗
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  // 導覽請求：離線時回 index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(new URL('./index.html', self.registration.scope).toString());
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // 其他同源資源：cache first，抓到新的就順手更新快取
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })(),
  );
});
