// Наша вселенная — офлайн-кэш (хранит только зашифрованные файлы)
const C = 'nv-mw80w8rm';
const CORE = ['./', './index.html', './manifest.webmanifest', './pwa/icon-192.png', './pwa/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  e.respondWith(fetch(r).then(res => { if (res && res.ok && (r.url.startsWith(self.location.origin) || r.url.includes('fonts.g'))) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html'))));
});
