// Наша вселенная — офлайн-помощник (хранит только зашифрованные файлы).
// Новая версия включается только когда она скачана целиком и проверена,
// поэтому прошлая версия продолжает открываться, даже если интернет плохой.
const V = 'mw901xuh', C = 'nv-' + V, SZ = {"app.bin":301471,"img.bin":1047636,"w_cloud.bin":433431,"w_fore.bin":127961,"w_hug.bin":128103,"w_meet.bin":471853,"w_moon.bin":431601,"w_ny.bin":558924,"w_spring.bin":478213,"w_summer.bin":424732,"w_winter.bin":515192,"s_heart.bin":104168,"s_home.bin":222024,"s_meet.bin":146408,"s_moon.bin":116354,"s_moon2.bin":114830,"s_spring.bin":150624,"s_summer.bin":123386};
const REPO = 'rahxdkdo-coder/rahxdkdo-coder.github.io';
const MIR = [
  v => 'https://cdn.jsdelivr.net/gh/' + REPO + '@v-' + v + '/',
  v => 'https://rawcdn.githack.com/' + REPO + '/v-' + v + '/',
  v => 'https://raw.githubusercontent.com/' + REPO + '/v-' + v + '/'
];
const MUST = ['app.bin', 'img.bin'];
const EXTRA = ['./manifest.webmanifest', './pwa/icon-192.png', './pwa/icon-512.png'];
const scope = () => self.registration.scope;
const binKey = (n, v) => new URL(n + '?v=' + (v || V), scope()).href;
const idxKey = () => new URL('./index.html', scope()).href;

// скачать файл, бросая попытку, если данные перестали идти
async function grab(url, want, idle) {
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let t = 0; const arm = () => { clearTimeout(t); t = setTimeout(() => ac && ac.abort(), idle); };
  arm();
  try {
    const res = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit', signal: ac ? ac.signal : undefined });
    if (!res.ok) throw new Error('status ' + res.status);
    let buf;
    if (res.body && res.body.getReader) {
      const rd = res.body.getReader(), parts = []; let n = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); n += value.length; arm(); }
      buf = new Uint8Array(n); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; }
    } else buf = new Uint8Array(await res.arrayBuffer());
    if (want && buf.byteLength !== want) throw new Error('size ' + buf.byteLength);
    return buf;
  } finally { clearTimeout(t); }
}
// файл с сайта, а если не идёт — с запасных серверов
async function grabAny(name, v) {
  const want = v === V ? SZ[name] : 0;
  const urls = [new URL(name + '?v=' + v + '&nosw=1&r=' + Date.now(), scope()).href].concat(MIR.map(m => m(v) + name));
  let last;
  for (const u of urls) { try { return await grab(u, want, 15000); } catch (e) { last = e; } }
  throw last || new Error('fail');
}
const binResp = b => new Response(b, { headers: { 'Content-Type': 'application/octet-stream' } });
async function validIn(c, name) {
  const m = await c.match(binKey(name)); if (!m) return false;
  const b = await m.clone().arrayBuffer(); return b.byteLength === SZ[name];
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(C);
    // страница входа должна быть именно этой версии
    let html = null;
    for (let i = 0; i < 3 && !html; i++) {
      try {
        const r = await fetch(new URL('./index.html?r=' + Date.now() + i, scope()).href, { cache: 'no-store' });
        const t = r.ok ? await r.text() : '';
        if (t.indexOf("VER='" + V + "'") >= 0) html = t; else await new Promise(z => setTimeout(z, 4000));
      } catch (_) { await new Promise(z => setTimeout(z, 3000)); }
    }
    if (!html) throw new Error('index');
    for (const n of MUST) if (!(await validIn(c, n))) await c.put(binKey(n), binResp(await grabAny(n, V)));
    const h = { headers: { 'Content-Type': 'text/html; charset=utf-8' } };
    await c.put(idxKey(), new Response(html, h));
    await c.put(scope(), new Response(html, h));
    await Promise.all(EXTRA.map(u => fetch(u, { cache: 'no-store' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C && k.indexOf('nv-') === 0).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'nv-ver' && e.source) e.source.postMessage({ nvVer: V }); });

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url), same = u.origin === self.location.origin;
  if (same && u.searchParams.has('nosw')) return;
  if (!same && !u.hostname.includes('fonts.g')) return;
  // открытие сайта — из сохранённой целой версии, без ожидания интернета
  if (same && r.mode === 'navigate') {
    e.respondWith(caches.open(C).then(c => c.match(idxKey())).then(m => m || fetch(r).catch(() => caches.match(idxKey(), { ignoreSearch: true }).then(x => x || caches.match(scope())))));
    return;
  }
  // зашифрованные файлы с версией не меняются
  if (same && u.searchParams.has('v') && /\.(bin|enc)$/.test(u.pathname)) {
    const name = u.pathname.split('/').pop(), v = u.searchParams.get('v'), k = binKey(name, v);
    e.respondWith(caches.open(C).then(c => c.match(k).then(m => m || grabAny(name, v).then(b => { c.put(k, binResp(b.slice(0))).catch(() => {}); return binResp(b); }))));
    return;
  }
  if (same && /\.html?$|\/$/.test(u.pathname)) { e.respondWith(fetch(r).catch(() => caches.match(idxKey()))); return; }
  e.respondWith(fetch(r).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true })));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) return c.focus(); } return self.clients.openWindow(url); }));
});
