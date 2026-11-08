// Наша вселенная — офлайн-кэш (хранит только зашифрованные файлы)
const C = 'nv-mw84vws6';
const CORE = ['./', './index.html', './manifest.webmanifest', './pwa/icon-192.png', './pwa/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url), same = u.origin === self.location.origin;
  if (!same && !u.hostname.includes('fonts.g')) return;
  // файлы с версией (?v=...) не меняются — отдаём из кэша мгновенно
  if (same && u.searchParams.has('v') && /\.(bin|enc)$/.test(u.pathname)) {
    e.respondWith(caches.open(C).then(c => c.match(r).then(m => m || fetch(r).then(res => { if (res && res.ok) c.put(r, res.clone()); return res; }))));
    return;
  }
  e.respondWith(fetch(r).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) return c.focus(); } return self.clients.openWindow(url); }));
});
