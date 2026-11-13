// Service worker mínimo: la app abre sin señal (interior mina). Red primero; caché si no hay red. No guarda datos del maestro.
const V = 'sam-v21', ARCHIVOS = ['./', 'index.html', 'app/styles.css', 'app/app.js', 'app/maestro.js', 'app/vendor/xlsx.full.min.js',
  'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => c.addAll(ARCHIVOS).catch(() => {}))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x))))));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(V).then(ca => ca.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request)));
});
