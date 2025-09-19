// MyKitchen Recipe Finder - Service Worker
// This service worker helps improve performance by caching resources

const CACHE_NAME = 'mykitchen-v1';
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/sitemap.xml',
  '/robots.txt',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js',
  'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'
];

// Cache popular API endpoints
const API_CACHE_URLS = [
  'https://www.themealdb.com/api/json/v1/1/categories.php',
  'https://www.themealdb.com/api/json/v1/1/list.php?c=list',
  'https://www.themealdb.com/api/json/v1/1/list.php?a=list'
];

// Install event - cache static resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle API requests with network-first strategy
  if (event.request.url.includes('themealdb.com/api')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response because it's a stream
          const responseClone = response.clone();
          
          // Cache successful API responses
          if (response.status === 200) {
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseClone);
              });
          }
          
          return response;
        })
        .catch(() => {
          // If network fails, try to serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Handle other requests with cache-first strategy
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        
        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not a successful response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response
            const responseToCache = response.clone();
            
            // Add to cache
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          });
      })
  );
});

// Background sync for offline functionality (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle background sync tasks
      console.log('Background sync triggered')
    );
  }
});

// Push notification handler (future enhancement)
self.addEventListener('push', (event) => {
  if (event.data) {
    const notificationData = event.data.json();
    
    const options = {
      body: notificationData.body || 'New recipe available!',
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: 'recipe-notification',
      data: notificationData.data
    };
    
    event.waitUntil(
      self.registration.showNotification(
        notificationData.title || 'MyKitchen Recipe Finder',
        options
      )
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});