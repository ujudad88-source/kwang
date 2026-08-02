const CACHE_NAME = "kenc-ui-2-build-003-3";
const APP_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './assets/cabinet_rack.png',
  './assets/open_rack.png',
  './assets/server_rack.png',
  './assets/gwangtelecom_logo.png',
  './assets/cable_hook_horizontal.png',
  './data/materials_integrated.json',
  './data/materials_optical.json',
  './data/materials_tv.json',
  './data/users.json',
  './js/firebase-config.js',
  './js/firebase-auth.js',
  './assets/ground/iron_up.png',
  './assets/ground/iron_down.png',
  './assets/ground/iron_left.png',
  './assets/ground/iron_right.png',
  './assets/ground/copper_up.png',
  './assets/ground/copper_down.png',
  './assets/ground/copper_left.png',
  './assets/ground/copper_right.png'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html')))
  );
});
