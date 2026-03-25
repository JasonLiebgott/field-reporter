const CACHE_NAME = 'smis-pwa-v3'
const BASE_PATH = new URL(self.registration.scope).pathname
const baseAsset = path => `${BASE_PATH}${path}`.replace(/\/+/g, '/')
const APP_ASSETS = [
  BASE_PATH,
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

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response && response.status === 200) {
            const responseClone = response.clone()
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone)
              cache.put(BASE_PATH, responseClone.clone())
            })
          }
          return response
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request)
          if (cachedPage) return cachedPage

          return caches.match(BASE_PATH)
        })
    )
    return
  }

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
          return new Response('Offline', { status: 503, statusText: 'Offline' })
        })
    })
  )
})
