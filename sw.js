// Наша вселенная — офлайн-помощник (хранит только зашифрованные файлы).
// • Новая версия включается только когда скачана целиком и проверена — прошлая открывается, даже если интернет плохой.
// • Картинки, сцены и обои хранятся по отпечатку и не скачиваются заново после обновлений.
// • Шрифты берутся из сохранённой копии, без интернета.
const V = 'mwd9v2qp', C = 'nv-' + V, F = 'nv-files', FONTS = 'nv-fonts';
const SZ = {"img.bin":[1047636,"3be9047d8c69ac54d998"],"w_cloud.bin":[433431,"c993cebf106a2e37e4f1"],"w_fore.bin":[127961,"92d9f947109aa6eff1ae"],"w_hug.bin":[128103,"f5e8b95b7f8f7fdfe7fb"],"w_meet.bin":[471853,"c4f6067e4101431b57db"],"w_moon.bin":[431601,"b05aa268940648aeb3b5"],"w_ny.bin":[558924,"3b4357dad9417934728b"],"w_spring.bin":[478213,"aa56ac0f0d7466ea9af8"],"w_summer.bin":[424732,"5d50b730bbdf134b549e"],"w_winter.bin":[515192,"abc7db22f88c7bc2c667"],"s_heart.bin":[104168,"8fde667f5d6eb151686a"],"s_home.bin":[222024,"dbbc845c1956283fc339"],"s_meet.bin":[146408,"06d267177da3b3307007"],"s_moon.bin":[116354,"198cf9c03dd48edd21db"],"s_moon2.bin":[114830,"f36388ba5c1e98d50896"],"s_spring.bin":[150624,"16c19862c49da0aab478"],"s_summer.bin":[123386,"e9d0f9fc7f5a6b9d22e1"]}, APP = {"app.bin":122986,"appu.bin":389981};
const REPO = 'rahxdkdo-coder/rahxdkdo-coder.github.io';
const MSHA = '930a259eca9316aae9070cf2f6f08a209e66a6b6', MP = MSHA + '/v/' + V + '/';
// запасные серверы — файлы этой версии лежат в закреплённой версии репозитория
const MIR = /^[0-9a-f]{40}$/.test(MSHA) ? ['https://cdn.jsdelivr.net/gh/' + REPO + '@' + MP, 'https://rawcdn.githack.com/' + REPO + '/' + MP, 'https://raw.githubusercontent.com/' + REPO + '/' + MP] : [];
const AN = (typeof DecompressionStream !== 'undefined') ? 'app.bin' : 'appu.bin';
const EXTRA = ['./manifest.webmanifest', './pwa/icon-192.png', './pwa/icon-512.png'];
const scope = () => self.registration.scope;
const abs = p => new URL(p, scope()).href;
const appKey = (n, v) => abs(n + '?v=' + (v || V));
const fileKey = (n, h) => abs(n + '?h=' + h);
const idxKey = () => abs('./index.html');
const hex = b => Array.from(new Uint8Array(b), x => (x < 16 ? '0' : '') + x.toString(16)).join('');
const binResp = b => new Response(b, { headers: { 'Content-Type': 'application/octet-stream' } });

// проверка файла: размер и (для картинок) отпечаток
async function fits(name, buf, h) {
  if (h) { const z = SZ[name]; if (z && z[1] === h && buf.byteLength !== z[0]) return false; return hex(await crypto.subtle.digest('SHA-256', buf)).slice(0, 20) === h; }
  return !APP[name] || buf.byteLength === APP[name];
}
// скачать файл, бросая попытку, если данные перестали идти
async function grab(url, idle) {
  const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
  let t = 0; const arm = () => { clearTimeout(t); t = setTimeout(() => ac && ac.abort(), idle); };
  arm();
  try {
    const res = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit', signal: ac ? ac.signal : undefined });
    if (!res.ok) throw new Error('status ' + res.status);
    if (res.body && res.body.getReader) {
      const rd = res.body.getReader(), parts = []; let n = 0;
      for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); n += value.length; arm(); }
      const buf = new Uint8Array(n); let o = 0; for (const p of parts) { buf.set(p, o); o += p.length; } return buf.buffer;
    }
    return await res.arrayBuffer();
  } finally { clearTimeout(t); }
}
// файл с сайта, а если не идёт — с запасных серверов (только файлы текущей версии)
async function grabAny(name, q, h) {
  const mine = h ? (SZ[name] && SZ[name][1] === h) : q === V;
  const urls = [abs(name + '?' + (h ? 'h=' + h : 'v=' + q) + '&nosw=1&r=' + Date.now())].concat(mine ? MIR.map(m => m + name) : []);
  let last;
  for (const u of urls) { try { const b = await grab(u, 15000); if (!(mine ? await fits(name, b, h) : true)) throw new Error('mismatch'); return b; } catch (e) { last = e; } }
  throw last || new Error('fail');
}
// уже скачанный файл с тем же отпечатком мог остаться от прошлой версии
async function adopt(name, h) {
  for (const k of await caches.keys()) {
    const c = await caches.open(k);
    for (const r of await c.keys()) {
      if (new URL(r.url).pathname.split('/').pop() !== name) continue;
      const m = await c.match(r); if (!m) continue; const b = await m.arrayBuffer();
      if (await fits(name, b, h)) return b;
    }
  }
  return null;
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(C), f = await caches.open(F);
    // страница входа должна быть именно этой версии
    let html = null;
    for (let i = 0; i < 3 && !html; i++) {
      try {
        const r = await fetch(abs('./index.html?r=' + Date.now() + i), { cache: 'no-store' });
        const t = r.ok ? await r.text() : '';
        if (t.indexOf("VER='" + V + "'") >= 0) html = t; else await new Promise(z => setTimeout(z, 4000));
      } catch (_) { await new Promise(z => setTimeout(z, 3000)); }
    }
    if (!html) throw new Error('index');
    // код сайта этой версии
    const ak = appKey(AN); let am = await c.match(ak);
    if (!(am && await fits(AN, await am.clone().arrayBuffer()))) await c.put(ak, binResp(await grabAny(AN, V)));
    // картинки: из сохранённого (в том числе от прошлой версии) или скачать
    const ih = SZ['img.bin'][1], ik = fileKey('img.bin', ih);
    let im = await f.match(ik);
    if (!(im && await fits('img.bin', await im.clone().arrayBuffer(), ih))) { const b = (await adopt('img.bin', ih)) || (await grabAny('img.bin', null, ih)); await f.put(ik, binResp(b)); }
    // сцены и обои, которые уже были скачаны прошлой версией, — переносим без интернета
    for (const n of Object.keys(SZ)) { if (n === 'img.bin') continue; const k = fileKey(n, SZ[n][1]); if (await f.match(k)) continue; try { const b = await adopt(n, SZ[n][1]); if (b) await f.put(k, binResp(b)); } catch (_) {} }
    const h = { headers: { 'Content-Type': 'text/html; charset=utf-8' } };
    await c.put(idxKey(), new Response(html, h));
    await c.put(scope(), new Response(html, h));
    await Promise.all(EXTRA.map(u => fetch(u, { cache: 'no-store' }).then(r => r.ok && c.put(u, r)).catch(() => {})));
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keep = [C, F, FONTS];
    await Promise.all((await caches.keys()).filter(k => k.indexOf('nv-') === 0 && keep.indexOf(k) < 0).map(k => caches.delete(k)));
    // убираем из хранилища файлы, которых больше нет на сайте
    const f = await caches.open(F), want = new Set(Object.keys(SZ).map(n => fileKey(n, SZ[n][1])));
    for (const r of await f.keys()) if (!want.has(r.url)) await f.delete(r);
    await self.clients.claim();
  })());
});
self.addEventListener('message', e => { if (e.data === 'nv-ver' && e.source) e.source.postMessage({ nvVer: V }); });

self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return;
  const u = new URL(r.url), same = u.origin === self.location.origin;
  if (same && u.searchParams.has('nosw')) return;
  // шрифты не меняются — из сохранённой копии, без ожидания интернета
  if (!same) {
    if (!/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return;
    e.respondWith(caches.open(FONTS).then(c => c.match(r).then(m => m || fetch(r).then(res => { if (res && res.ok && res.type !== 'opaque') c.put(r, res.clone()); return res; }))));
    return;
  }
  // открытие сайта — из сохранённой целой версии
  if (r.mode === 'navigate') {
    e.respondWith(caches.open(C).then(c => c.match(idxKey())).then(m => m || fetch(r).catch(() => caches.match(idxKey(), { ignoreSearch: true }).then(x => x || caches.match(scope())))));
    return;
  }
  const name = u.pathname.split('/').pop();
  // картинки, сцены, обои — по отпечатку, навсегда
  if (u.searchParams.has('h') && /\.bin$/.test(name)) {
    const h = u.searchParams.get('h'), k = fileKey(name, h);
    e.respondWith(caches.open(F).then(f => f.match(k).then(m => m || grabAny(name, null, h).then(b => { f.put(k, binResp(b.slice(0))).catch(() => {}); return binResp(b); }))));
    return;
  }
  // код сайта и прочие файлы с версией
  if (u.searchParams.has('v') && /\.(bin|enc)$/.test(name)) {
    const v = u.searchParams.get('v'), k = appKey(name, v);
    e.respondWith(caches.open(C).then(c => c.match(k).then(m => m || grabAny(name, v).then(b => { c.put(k, binResp(b.slice(0))).catch(() => {}); return binResp(b); }))));
    return;
  }
  if (/\.html?$|\/$/.test(u.pathname)) { e.respondWith(fetch(r).catch(() => caches.match(idxKey()))); return; }
  e.respondWith(fetch(r).then(res => { if (res && res.ok) { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true })));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => { for (const c of cs) { if ('focus' in c) return c.focus(); } return self.clients.openWindow(url); }));
});
