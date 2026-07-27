/* ============================================================
   Service Worker — DAW混音参数智能推荐系统
   提供离线缓存能力，让 PWA 在无网络时也能使用
   ============================================================ */
const CACHE_NAME = 'daw-mix-v2';
const CACHE_FILES = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './apple-touch-icon.png',
  './icon-192.png',
  './icon-512.png',
  './splash-1170x2532.png',
  './splash-1284x2778.png',
  './splash-750x1334.png',
  './splash-1242x2688.png',
  './splash-2048x2732.png'
];

// 安装时预缓存核心文件
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(CACHE_FILES).catch(function(err) {
        // 单个文件缓存失败不阻止安装
        console.warn('SW: 部分文件缓存失败', err);
      });
    })
  );
  self.skipWaiting();
});

// 激活时清理旧缓存
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(names) {
      return Promise.all(
        names.filter(function(name) {
          return name !== CACHE_NAME;
        }).map(function(name) {
          return caches.delete(name);
        })
      );
    })
  );
  self.clients.claim();
});

// 网络优先，失败时回退缓存
self.addEventListener('fetch', function(event) {
  // 仅处理 GET 请求
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // 成功则缓存副本
        if (response.status === 200) {
          var responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // 网络失败，尝试缓存
        return caches.match(event.request).then(function(cached) {
          if (cached) return cached;
          // 如果是导航请求，回退到 index.html
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('离线模式：此资源不可用', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});
