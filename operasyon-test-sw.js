const CACHE_NAME = 'bs-ofis-operasyon-test-v206';
const APP_SHELL = [
  '/bs-ofis-yonetim-sistemi/operasyon-test.html?v=206',
  '/bs-ofis-yonetim-sistemi/index.html?v=206&pwa_test=1',
  '/bs-ofis-yonetim-sistemi/operasyon-test.webmanifest?v=206',
  '/bs-ofis-yonetim-sistemi/bs-app-icon-192.png',
  '/bs-ofis-yonetim-sistemi/bs-app-icon-512.png',
  '/bs-ofis-yonetim-sistemi/apple-touch-icon.png',
  '/bs-ofis-yonetim-sistemi/favicon-32x32.png'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(names => Promise.all(
    names.filter(name => name.startsWith('bs-ofis-operasyon-test-') && name !== CACHE_NAME).map(name => caches.delete(name))
  )));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
    }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || Response.error())));
});