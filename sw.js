const CACHE_NAME = 'odr-timer-v3';
const urlsToCache = [
    './',
    'index.html',
    'styles.css',
    'app.js',
    'manifest.json',
    'icons/icon-192.svg',
    'icons/icon-512.svg'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
            .catch(error => {
                console.error('Service worker cache failed:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
