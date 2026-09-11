/*
 * Service worker for admin push notifications.
 *
 * Deliberately minimal: it does not cache anything. Its only job is to be
 * alive when the panel is closed so a push can still be shown — offline
 * caching of an admin panel that reads live data would do more harm than good.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let payload = { title: 'نوبت جدید', body: '', url: '/admin/appointments' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    // A push with no JSON body still deserves to be shown.
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/images/profile.jpg',
      badge: '/images/profile.jpg',
      dir: 'rtl',
      lang: 'fa',
      // Collapses repeats rather than stacking a screenful of them.
      tag: 'dr-azhdari-admin',
      renotify: true,
      data: { url: payload.url },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const target = event.notification.data?.url || '/admin'

  // Focus an already-open panel instead of opening a second copy.
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windows) => {
        for (const client of windows) {
          if (client.url.includes('/admin') && 'focus' in client) {
            client.navigate(target)
            return client.focus()
          }
        }
        return self.clients.openWindow(target)
      })
  )
})
