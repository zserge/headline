const cacheName = 'headline-v1';
const staticFiles = [
  './',
  './index.html',
  './app.js',
  './styles.css',
  './icons/android-chrome-192x192.png',
  './icons/android-chrome-512x512.png',
  './icons/apple-touch-icon.png',
  './icons/browserconfig.xml',
  './icons/favicon-16x16.png',
  './icons/favicon-32x32.png',
  './icons/favicon.ico',
  './icons/mstile-150x150.png',
  './icons/safari-pinned-tab.svg',
];

self.addEventListener('install', e => {
  console.log('[Service Worker] Install');
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      console.log('[Service Worker] Caching all: ', staticFiles);
      return cache.addAll(staticFiles);
    }),
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      console.log('[Service Worker] Fetching resource: ' + e.request.url);
      return r || fetch(e.request);
    }),
  );
});
