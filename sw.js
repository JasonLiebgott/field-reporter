const CACHE_NAME = 'smis-pwa-v1'
const BASE_PATH = new URL(self.registration.scope).pathname
const baseAsset = path => `${BASE_PATH}${path}`.replace(/\/+/g, '/')
const APP_ASSETS = [
  BASE_PATH,
  baseAsset('manifest.webmanifest'),
  baseAsset('icons/icon.svg'),
  baseAsset('images/body.png')
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)
  if (requestUrl.protocol !== 'http:' && requestUrl.protocol !== 'https:') return
  if (requestUrl.origin !== self.location.origin) return

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached

      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          const responseClone = response.clone()
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone)
          })
          return response
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(BASE_PATH)
          }
          return new Response('Offline', { status: 503, statusText: 'Offline' })
        })
    })
  )
})
