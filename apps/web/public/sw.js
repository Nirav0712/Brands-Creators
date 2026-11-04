// Brands & Creators - Web Push Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) {
    return;
  }

  let payload = {
    title: 'Brands & Creators Notification',
    message: 'You have a new notification on Brands & Creators.',
    url: '/',
    icon: '/favicon.ico',
  };

  try {
    const json = event.data.json();
    payload = { ...payload, ...json };
  } catch (e) {
    payload.message = event.data.text() || payload.message;
  }

  const notificationOptions = {
    body: payload.message,
    icon: payload.icon || '/favicon.ico',
    badge: '/favicon.ico',
    data: {
      url: payload.url || payload.link || '/',
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, notificationOptions)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
