const SHELL_CACHE = 'aba-shell-v1';
const PRECACHE = ['/offline.html', '/pwa/icon-192.png', '/pwa/icon-512.png', '/pwa/maskable-512.png'];
const OFFLINE_WORKSPACE = '/offline-workspace';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('aba-shell-') && key !== SHELL_CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname === OFFLINE_WORKSPACE) {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) void caches.open(SHELL_CACHE).then((cache) => cache.put(OFFLINE_WORKSPACE, response.clone()));
      return response;
    }).catch(() => caches.match(OFFLINE_WORKSPACE).then((cached) => cached || caches.match('/offline.html'))));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('/offline.html')));
    return;
  }

  const safeStaticAsset = url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/pwa/');
  if (!safeStaticAsset) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      void caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  })));
});
