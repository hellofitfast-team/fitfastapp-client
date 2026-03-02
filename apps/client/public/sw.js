// FitFast Service Worker
// Native Web Push + offline fallback

const CACHE_NAME = "fitfast-offline-v1";
const OFFLINE_URL = "/offline.html";

// Pre-cache the offline page on install
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)));
  self.skipWaiting();
});

// Clean up old caches on activate
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

// Network-first for navigations -> offline fallback
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches
        .match(OFFLINE_URL)
        .then((cached) => cached || new Response("Offline", { status: 503 })),
    ),
  );
});

// Handle incoming push notifications
self.addEventListener("push", (event) => {
  let data = { title: "FitFast", body: "You have a new notification" };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "FitFast", {
      body: data.body,
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      data: { url: data.url || "/" },
    }),
  );
});

// Handle notification clicks -> open/focus the app
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      // Focus existing window and navigate to the notification's target URL
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open a new window
      return self.clients.openWindow(targetUrl);
    }),
  );
});
