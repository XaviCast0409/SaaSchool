// Service Worker para Notificaciones Web Push en Segundo Plano (Mobile & Desktop)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Evento PUSH: Se activa en 2do plano cuando el servidor envía una notificación
self.addEventListener('push', (event) => {
  let data = {
    title: 'SaaSchool',
    message: 'Tienes una nueva actualización del colegio',
    link: '/dashboard',
    type: 'GENERAL',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.message = event.data.text();
    }
  }

  const options = {
    body: data.message,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: {
      link: data.link || '/dashboard',
    },
    vibrate: [200, 100, 200],
    tag: `saaschool-${Date.now()}`,
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Evento NOTIFICATIONCLICK: Al tocar la notificación en el celular abre la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.link || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarse y navegar
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Si la app está cerrada en 2do plano, abrir una nueva ventana
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
