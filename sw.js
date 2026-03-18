const CACHE_NAME = 'asturias-cultural-v1';
const JSON_URL = './actividades.json';
const JSON_CACHE_KEY = 'actividades-data';

const STATIC_ASSETS = [
  './',
  './index.html',
  './actividades.json'
];

// Install: cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch strategy:
// - For actividades.json: Network first, fallback to cache
// - For everything else: Cache first, fallback to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  if (url.pathname.endsWith('actividades.json')) {
    // Network first for JSON data
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache first for everything else
    event.respondWith(
      caches.match(event.request).then(cached => {
        return cached || fetch(event.request).then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});

// Background sync: notify clients when new data is available
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    fetch(JSON_URL)
      .then(r => r.json())
      .then(data => {
        self.clients.matchAll().then(clients => {
          clients.forEach(client => client.postMessage({ type: 'DATA_UPDATED', version: data.version }));
        });
      })
      .catch(() => {});
  }
});
