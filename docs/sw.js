const CACHE_PREFIX = 'trade-layout:' + self.registration.scope + ':';
const CACHE = CACHE_PREFIX + 'v4';
const ASSETS = ['./', './index.html', './style.css', './app.bundle.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', event => {
  if (event.data === 'OFFLINE_READY') event.waitUntil(caches.open(CACHE).then(async cache => {
    const complete = (await Promise.all(ASSETS.map(path => cache.match(new URL(path, self.registration.scope).href)))).every(Boolean);
    event.ports[0]?.postMessage({ ready: complete });
  }));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: event.request.mode === 'navigate' });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return await cache.match(new URL('./index.html', self.registration.scope).href) || Response.error();
      return Response.error();
    }
  }));
});
