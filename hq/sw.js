// Redline HQ service worker — enables Add to Home Screen and push notifications.
const CACHE_VERSION = 'hq-v4';
const SHELL = ['./hq.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './favicon.ico'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).catch(() => cached))
  );
});

// --- push notifications ---
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Redline', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Redline';
  const options = {
    body: data.body || '',
    icon: data.icon || 'icons/icon-192.png',
    badge: data.badge || 'icons/badge-96.png',
    data: { link: data.link || './hq.html' },
    tag: data.tag || undefined,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || './hq.html';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if (c.url.includes(link) && 'focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow(link);
    })
  );
});
