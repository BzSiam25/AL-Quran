// Service worker: makes the site installable and usable offline.
// - The app shell (page, manifest, icons) is cached on install.
// - Surah files (data/N.json) are cached the first time they are opened,
//   or all at once when the reader taps "Download for offline".
// - Fonts and the Firebase scripts are cached after first use.
// - /api/* (Gemini, config) is never cached: AI answers and sign-in always go to the server.
// Bump VERSION whenever index.html or the icons change, so phones pick up the update.
const VERSION = 'v2';
const SHELL = `alq-shell-${VERSION}`;
const DATA = 'alq-data-v1';      // surah text rarely changes; kept across app updates
const ASSETS = 'alq-assets-v1';  // fonts, Firebase SDK
const SHELL_FILES = ['/', '/index.html', '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png', '/icons/maskable-192.png', '/icons/maskable-512.png',
  '/icons/apple-touch-icon.png', '/icons/favicon-32.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys())
      if (k.startsWith('alq-shell-') && k !== SHELL) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function cacheFirst(cacheName, req) {
  const c = await caches.open(cacheName);
  const hit = await c.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok || res.type === 'opaque') c.put(req, res.clone());
  return res;
}

async function networkFirstPage(req) {
  const c = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) c.put('/index.html', res.clone());
    return res;
  } catch {
    return (await c.match('/index.html')) || (await c.match('/')) || Response.error();
  }
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === location.origin) {
    if (url.pathname.startsWith('/api/')) return;                       // always live
    if (req.mode === 'navigate') return e.respondWith(networkFirstPage(req));
    if (url.pathname.startsWith('/data/')) return e.respondWith(cacheFirst(DATA, req));
    if (SHELL_FILES.includes(url.pathname)) return e.respondWith(cacheFirst(SHELL, req));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com' ||
      (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/'))) {
    e.respondWith(cacheFirst(ASSETS, req));
  }
});

// "Download for offline": the page asks us to fetch every surah file.
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'cache-all') return;
  const port = e.ports && e.ports[0];
  e.waitUntil((async () => {
    const c = await caches.open(DATA);
    let done = 0, failed = 0;
    const ids = Array.from({ length: 114 }, (_, i) => i + 1);
    const worker = async () => {
      while (ids.length) {
        const n = ids.shift();
        const url = `/data/${n}.json`;
        try {
          if (!(await c.match(url))) { const r = await fetch(url); if (!r.ok) throw 0; await c.put(url, r); }
          done++;
        } catch { failed++; }
        port && port.postMessage({ done, failed, total: 114 });
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  })());
});
