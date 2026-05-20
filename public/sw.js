self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icon.png', 
      badge: '/icon.png',
      vibrate: [200, 100, 200, 100, 200, 100, 200], // Pattern di vibrazione aggressivo per richiamare l'attenzione
      data: {
        dateOfArrival: Date.now(),
        url: data.url || '/dashboard'
      }
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Se l'app è già aperta, la mette in primo piano
      for (var i = 0; i < windowClients.length; i++) {
        var client = windowClients[i];
        if (client.url.indexOf(event.notification.data.url) !== -1 && 'focus' in client) {
          return client.focus();
        }
      }
      // Altrimenti apre una nuova finestra
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});