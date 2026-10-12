/* 绵羊 · service worker —— 离线缓存与更新 */
const CACHE = 'mianyang-v4.13';
const CORE = ['./', './index.html', './manifest.json',
              './icon.svg', './icon-maskable.svg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => c.addAll(CORE))
    .then(() => self.skipWaiting())
    .catch(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // 跨域（如 Gist API）不走缓存

  // 页面导航：network-first，保证拿到最新版
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match('./index.html')));
    return;
  }
  // 静态资源：stale-while-revalidate
  e.respondWith(caches.match(req).then(hit => {
    const net = fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
