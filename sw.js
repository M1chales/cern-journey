// Service worker: makes the app work offline after the first visit.
const CACHE = 'cern-journey-v20';
const CORE = [
  './', 'index.html', 'css/style.css', 'manifest.webmanifest',
  'js/config.js', 'js/core.js', 'js/bg.js', 'js/intro.js', 'js/hero.js', 'js/scale.js',
  'js/particles.js', 'js/sc.js', 'js/complex.js', 'js/journey.js', 'js/detector.js', 'js/beyond.js', 'js/stats.js',
  'js/higgs.js', 'js/muon.js', 'js/gallery.js', 'js/cloud.js', 'js/main.js',
  'assets/icons/icon-192.png', 'assets/icons/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// code: network first (so updates show up), photos & fonts: cache first
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isPhotoOrFont = url.pathname.includes('/assets/') || url.hostname.includes('fonts.g');
  if (isPhotoOrFont) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    })));
  } else if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('index.html'))));
  }
});
