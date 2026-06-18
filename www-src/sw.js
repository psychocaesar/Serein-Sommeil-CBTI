const CACHE_VERSION = "serein-cbti-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/fonts/bricolage-grotesque-latin.woff2",
  "/fonts/bricolage-grotesque-latin-ext.woff2",
  "/fonts/hanken-grotesk-latin.woff2",
  "/fonts/hanken-grotesk-latin-ext.woff2",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then(cache => cache.addAll(ASSETS))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first pour tous les assets de l'app (réseau en fallback)
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return; // ne cache pas Google Fonts ou autre externe
  event.respondWith(
    caches.open(CACHE_VERSION).then(cache =>
      cache.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(res => {
          if (res && res.ok) cache.put(event.request, res.clone());
          return res;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    )
  );
});
