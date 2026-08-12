const CACHE_NAME = "bs-ofis-v3";

const APP_SHELL = [
  "/bs-ofis-yonetim-sistemi/",
  "/bs-ofis-yonetim-sistemi/index.html",
  "/bs-ofis-yonetim-sistemi/manifest.webmanifest",
  "/bs-ofis-yonetim-sistemi/bs-app-icon-192.png",
  "/bs-ofis-yonetim-sistemi/bs-app-icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_SHELL);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function (name) {
            return name.startsWith("bs-ofis-") && name !== CACHE_NAME;
          })
          .map(function (name) {
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Supabase ve diğer harici servis yanıtları asla önbelleğe alınmaz.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cached) {
          if (cached) return cached;
          if (event.request.mode === "navigate") {
            return caches.match("/bs-ofis-yonetim-sistemi/index.html");
          }
          return Response.error();
        });
      })
  );
});
