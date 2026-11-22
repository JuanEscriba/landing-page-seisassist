/* SeisAssist: caché de recursos cerrada, aislada por URL de proyecto. */
const PREFIX = 'seisassist:' + encodeURIComponent(self.registration.scope) + ':';
const CACHE = PREFIX + 'c5db9e1d9d07';
const PATHS = ["./", "./assets/fonts/Inter-variable.ttf", "./assets/icons/alert.svg", "./assets/icons/check.svg", "./assets/icons/chevron.svg", "./assets/icons/logo-seisassist.svg", "./assets/icons/medical.svg", "./assets/icons/radar.svg", "./assets/icons/shield.svg", "./assets/icons/sos.svg", "./assets/images/ecosistema-seisassist.svg", "./css/styles.css", "./favicon.ico", "./index.html", "./js/main.js", "./pages/index.html"];
const URLS = PATHS.map(path => new URL(path, self.registration.scope).href);
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(URLS.map(url => new Request(url, { cache: 'reload' })))));
  // Sin skipWaiting: una pestaña abierta conserva su versión completa.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  url.search = ''; url.hash = '';
  if (!URLS.includes(url.href)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(url.href);
    return cached || fetch(event.request);
  }));
});
