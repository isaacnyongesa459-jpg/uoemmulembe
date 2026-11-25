'use strict';

const CACHE_PREFIX = 'uoem-mulembe-';
const CACHE_NAME = `${CACHE_PREFIX}shell-v2`;
const GALLERY_PHOTOS = [
  './1795606862985.jpg',
  './1795606866383.jpg',
  './1795606937436.jpg',
  './1795606939898.jpg',
  './1795606942748.jpg',
  './1795606945117.jpg',
  './1795606947701.jpg',
  './1795606952150.jpg',
  './1795606954161.jpg',
  './1795606961380.jpg',
  './1795606963470.jpg',
  './1795606965964.jpg',
  './1795606968206.jpg',
  './1795606970441.jpg',
  './1795609879513.jpg',
  './1795606869718.jpg',
  './1795606881213.jpg'
];
const APP_SHELL = [
  './index.html',
  './about.html',
  './leadership.html',
  './updates.html',
  './events.html',
  './budget.html',
  './documents.html',
  './members.html',
  './gallery.html',
  './donations.html',
  './contact.html',
  './styles.css',
  './app.js',
  './manifest.json',
  './service-worker.js',
  './IMG-20261124-WA0001.jpg',
  './assets/icons.svg',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './assets/app-icon-maskable-512.png',
  ...GALLERY_PHOTOS,
  './BUDGET%20(1).PDF',
  './data/proposed-budget-2026-27.json',
  './data/proposed-budget-2026-27.csv',
  './data/gallery-manifest.json',
  './data/donation-client-config.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname.endsWith('/data/donation-client-config.json')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(request, response.clone());
        }
        return response;
      } catch {
        return (await caches.match(request))
          || (await caches.match(new URL('./index.html', self.registration.scope)))
          || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
