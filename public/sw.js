const STATIC_CACHE = 'nivo-static-v1';
const STATIC_FILES = ['/logo.png', '/offline.html'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('nivo-static-') && key !== STATIC_CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (STATIC_FILES.includes(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(caches.open(STATIC_CACHE).then(async cache => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        await cache.put(request, response.clone());
        const keys = await cache.keys();
        if (keys.length > 100) await cache.delete(keys.find(key => !STATIC_FILES.includes(new URL(key.url).pathname)) || keys[0]);
      }
      return response;
    }));
  } else if (request.mode === 'navigate') {
    // Never cache pages, API responses, profile data, or private conversation media.
    event.respondWith(fetch(request).catch(async () => (await caches.match('/offline.html')) || new Response('Koneksi belum tersedia. Coba buka NIVO lagi setelah terhubung.', { status: 503, headers: { 'Content-Type': 'text/plain;charset=utf-8' } })));
  }
});
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { /* Always show the same neutral reminder. */ }
  event.waitUntil(self.registration.showNotification('NIVO', {
    body: 'Waktu untuk langkah kecil. Buka NIVO saat kamu siap.', icon: '/logo.png', badge: '/logo.png',
    tag: typeof payload.tag === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(payload.tag) ? payload.tag : 'nivo-reminder',
    data: { url: '/notifications' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL('/notifications', self.location.origin).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const client = clients.find(item => new URL(item.url).origin === self.location.origin);
    if (client) { await client.navigate(target); return client.focus(); }
    return self.clients.openWindow(target);
  }));
});
