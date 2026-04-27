const STATIC_CACHE = "dama-static-v1";
const FACILITY_CACHE = "dama-facilities-v1";
const SHELL_ASSETS = ["/", "/index.html", "/manifest.json", "/burkina_provinces.geojson"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, FACILITY_CACHE].includes(key))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/locator/facilities/")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(FACILITY_CACHE).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((networkResponse) => {
          if (!event.request.url.startsWith("http")) return networkResponse;
          const copy = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(event.request, copy));
          return networkResponse;
        })
        .catch(() => caches.match("/index.html"));
    })
  );
});
