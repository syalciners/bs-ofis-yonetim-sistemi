const CACHE_NAME = "bs-ofis-v1";

const APP_FILES = [
  "/bs-ofis-yonetim-sistemi/",
  "/bs-ofis-yonetim-sistemi/index.html",
  "/bs-ofis-yonetim-sistemi/manifest.webmanifest"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(APP_FILES);
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
            return name !== CACHE_NAME;
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
  if (event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then(function (cache) {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(function () {
        return caches.match(event.request).then(function (cachedResponse) {
          return cachedResponse || caches.match(
            "/bs-ofis-yonetim-sistemi/"
          );
        });
      })
  );
});
