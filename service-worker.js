const CACHE_NAME = "kenc-ui-2-0-1-0-6";
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
  './app/pages/drawing/scripts/cad-model.js',
  './app/pages/drawing/scripts/output-3d-renderer.js',
  './app/pages/drawing/scripts/webgl-cad-viewer.js',
  './app/pages/drawing/styles/webgl-cad-viewer.css',
  './assets/ground/iron_up.png',
  './assets/ground/iron_down.png',
  './assets/ground/iron_left.png',
  './assets/ground/iron_right.png',
  './assets/ground/copper_up.png',
  './assets/ground/copper_down.png',
  './assets/ground/copper_left.png',
  './assets/ground/copper_right.png'
,
  './app/pages/drawing/engine/object-definitions.js',
  './app/pages/drawing/engine/object-library.js',
  './app/pages/drawing/engine/object-renderer-bridge.js',
  './app/pages/drawing/engine/object-engine.js',
  './app/pages/drawing/engine/attach-engine.js',
  './app/pages/drawing/engine/scene-engine.js',
  './app/pages/drawing/engine/preview-engine.js',
  './app/pages/drawing/engine/export-engine.js',
  './app/pages/drawing/engine/legacy-adapter.js',
  './app/pages/drawing/engine/constants.js',
  './app/pages/drawing/engine/object-registry.js',
  './app/pages/drawing/engine/engine-diagnostics.js',
  './app/pages/drawing/objects/manifest.js',
  './app/pages/drawing/objects/Vent/vent/definition.js',
  './app/pages/drawing/objects/Vent/vent/model2d.js',
  './app/pages/drawing/objects/Vent/vent/model3d.js',
  './app/pages/drawing/objects/Vent/vent/export.js',
  './app/pages/drawing/objects/Keys/key/definition.js',
  './app/pages/drawing/objects/Keys/key/model2d.js',
  './app/pages/drawing/objects/Keys/key/model3d.js',
  './app/pages/drawing/objects/Keys/key/export.js',
  './app/pages/drawing/objects/Ground/groundBar/definition.js',
  './app/pages/drawing/objects/Ground/groundBar/model2d.js',
  './app/pages/drawing/objects/Ground/groundBar/model3d.js',
  './app/pages/drawing/objects/Ground/groundBar/export.js',
  './app/pages/drawing/objects/CableHook/cableHook/definition.js',
  './app/pages/drawing/objects/CableHook/cableHook/model2d.js',
  './app/pages/drawing/objects/CableHook/cableHook/model3d.js',
  './app/pages/drawing/objects/CableHook/cableHook/export.js',
  './app/pages/drawing/objects/Plates/plate/definition.js',
  './app/pages/drawing/objects/Plates/plate/model2d.js',
  './app/pages/drawing/objects/Plates/plate/model3d.js',
  './app/pages/drawing/objects/Plates/plate/export.js',
  './app/pages/drawing/objects/Covers/cover/definition.js',
  './app/pages/drawing/objects/Covers/cover/model2d.js',
  './app/pages/drawing/objects/Covers/cover/model3d.js',
  './app/pages/drawing/objects/Covers/cover/export.js',
  './app/pages/drawing/objects/Windows/acrylicWindow/definition.js',
  './app/pages/drawing/objects/Windows/acrylicWindow/model2d.js',
  './app/pages/drawing/objects/Windows/acrylicWindow/model3d.js',
  './app/pages/drawing/objects/Windows/acrylicWindow/export.js',
  './app/pages/drawing/objects/Holes/cut/definition.js',
  './app/pages/drawing/objects/Holes/cut/model2d.js',
  './app/pages/drawing/objects/Holes/cut/model3d.js',
  './app/pages/drawing/objects/Holes/cut/export.js',
  './app/pages/drawing/objects/Holes/emboss/definition.js',
  './app/pages/drawing/objects/Holes/emboss/model2d.js',
  './app/pages/drawing/objects/Holes/emboss/model3d.js',
  './app/pages/drawing/objects/Holes/emboss/export.js',
  './app/pages/drawing/objects/Holes/anchor/definition.js',
  './app/pages/drawing/objects/Holes/anchor/model2d.js',
  './app/pages/drawing/objects/Holes/anchor/model3d.js',
  './app/pages/drawing/objects/Holes/anchor/export.js',
  './app/pages/drawing/objects/Labels/nameplate/definition.js',
  './app/pages/drawing/objects/Labels/nameplate/model2d.js',
  './app/pages/drawing/objects/Labels/nameplate/model3d.js',
  './app/pages/drawing/objects/Labels/nameplate/export.js',
  './app/pages/drawing/objects/Locks/doubleLock/definition.js',
  './app/pages/drawing/objects/Locks/doubleLock/model2d.js',
  './app/pages/drawing/objects/Locks/doubleLock/model3d.js',
  './app/pages/drawing/objects/Locks/doubleLock/export.js'
,
  "app/pages/drawing/engine/selection-engine.js",
  "app/pages/drawing/engine/history-engine.js",
  "app/pages/drawing/engine/object-inspector.js",
  "app/pages/drawing/styles/object-inspector.css"];

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
