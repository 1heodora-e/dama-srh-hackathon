// Bump these versions whenever caching behaviour changes — old caches are deleted on activate.
const STATIC_CACHE = "dama-static-v2";
const FACILITY_CACHE = "dama-facilities-v2";
const SHELL_ASSETS = ["/", "/index.html", "/manifest.json", "/burkina_provinces.geojson"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![STATIC_CACHE, FACILITY_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Facilities: network first, cached copy for offline use (Locator works offline).
  if (url.pathname.startsWith("/api/locator/facilities/")) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse.ok) {
            const copy = networkResponse.clone();
            caches.open(FACILITY_CACHE).then((cache) => cache.put(request, copy));
          }
          return networkResponse;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Never intercept other cross-origin requests (backend API, map data, fonts).
  if (url.origin !== self.location.origin) return;

  // Page navigations: always try the network so new deploys show up immediately.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          const copy = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put("/index.html", copy));
          return networkResponse;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Same-origin static files (hashed /assets/*, icons, geojson): cache first.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const copy = networkResponse.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      });
    })
  );
});
