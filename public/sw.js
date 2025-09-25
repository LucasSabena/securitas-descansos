// Service Worker para notificaciones push
const CACHE_NAME = 'securitas-descansos-v1';

// Instalar el service worker
self.addEventListener('install', (event) => {
  console.log('Service Worker instalado');
  self.skipWaiting();
});

// Activar el service worker
self.addEventListener('activate', (event) => {
  console.log('Service Worker activado');
  event.waitUntil(self.clients.claim());
});

// Manejar notificaciones push
self.addEventListener('push', (event) => {
  console.log('Notificación push recibida:', event);
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Securitas Descansos';
  const options = {
    body: data.body || 'Tu descanso está por empezar',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'descanso-reminder',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Ver Dashboard',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Cerrar'
      }
    ],
    data: {
      url: data.url || '/dashboard',
      reservaId: data.reservaId || null
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Manejar clics en las notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('Click en notificación:', event);
  
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data;
  
  if (action === 'dismiss') {
    return;
  }
  
  // Abrir o enfocar la aplicación
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Si ya hay una ventana abierta, enfocarla
      for (let client of clients) {
        if (client.url.includes(data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Si no hay ventana abierta, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(data.url);
      }
    })
  );
});

// Manejar mensajes desde la aplicación principal
self.addEventListener('message', (event) => {
  console.log('Mensaje recibido en SW:', event.data);
  
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { delay, title, body, reservaId } = event.data;
    
    // Programar notificación local
    setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: `reminder-${reservaId}`,
        requireInteraction: true,
        data: {
          url: '/dashboard',
          reservaId
        }
      });
    }, delay);
  }
});