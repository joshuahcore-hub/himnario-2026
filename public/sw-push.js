// Notificaciones (1.11.0, Josué). Lo carga el service worker de la app (workbox importScripts en vite.config.ts).
// El servidor manda un "despertar" SIN contenido; aquí se piden los avisos pendientes de este celular (identificado
// por su suscripción) y se muestran. "Marcar como vista" lo marca en el servidor sin abrir la app; tocar la
// notificación abre la app donde corresponde (Administración o la minuta) y también la marca como vista.

async function suscripcionActual() {
  try { return await self.registration.pushManager.getSubscription(); } catch { return null; }
}

async function marcarVista(ids) {
  const s = await suscripcionActual();
  if (!s) return;
  await fetch('/api/notificaciones/vista', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-endpoint': s.endpoint },
    body: JSON.stringify({ ids }),
  }).catch(() => {});
}

self.addEventListener('push', evento => {
  evento.waitUntil((async () => {
    const s = await suscripcionActual();
    let avisos = [];
    try {
      const r = await fetch('/api/notificaciones/pendientes', { headers: { 'x-endpoint': s ? s.endpoint : '' }, cache: 'no-store' });
      if (r.ok) avisos = await r.json();
    } catch { /* sin internet: no hay nada que mostrar */ }
    for (const a of avisos) {
      await self.registration.showNotification(a.titulo, {
        body: a.texto,
        tag: `aviso-${a.id}`,
        icon: '/icono-v5-192.png',
        badge: '/aviso-v1-96.png',
        vibrate: [180, 90, 180],
        data: { id: a.id, url: a.url },
        actions: [{ action: 'vista', title: a.accion }],
      });
    }
  })());
});

self.addEventListener('notificationclick', evento => {
  const { id, url } = evento.notification.data || {};
  evento.notification.close();
  evento.waitUntil((async () => {
    if (id) await marcarVista([id]);
    if (evento.action === 'vista') return; // marcada desde afuera, sin abrir la app
    const destino = new URL(url || '/', self.location.origin).href;
    const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const v of ventanas) {
      if ('focus' in v) {
        await v.focus();
        if ('navigate' in v) await v.navigate(destino).catch(() => {});
        return;
      }
    }
    await self.clients.openWindow(destino);
  })());
});
