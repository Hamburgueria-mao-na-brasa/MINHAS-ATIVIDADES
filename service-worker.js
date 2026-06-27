const CACHE_NAME = 'minhas-atividades-v8';
const FILES = ['./','index.html','styles.css','script.js','manifest.json','assets/app-icon.png','assets/logo-horizontal.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(FILES)));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(resp => resp || fetch(event.request)));
});
