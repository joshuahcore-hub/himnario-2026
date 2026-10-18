// Notificaciones del celular (1.11.0, Josué): llegan aunque la app esté cerrada (Web Push; ver public/sw-push.js y la
// sección "Notificaciones" de la API). Para recibirlas hay que estar registrado; vienen ACTIVADAS por defecto: el
// celular pide permiso una vez (al registrarse o al encenderlas en ⋮ → Notificaciones).
// En iPhone solo funcionan con la app instalada en la pantalla de inicio.
import { api } from '@/lib/api';

export type EstadoPermiso = 'no-soportado' | 'pedir' | 'permitido' | 'bloqueado';

export function permisoActual(): EstadoPermiso {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'no-soportado';
  return Notification.permission === 'granted' ? 'permitido' : Notification.permission === 'denied' ? 'bloqueado' : 'pedir';
}

function claveABytes(b64u: string): Uint8Array {
  const b64 = b64u.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (b64u.length % 4)) % 4);
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

const idiomaApp = () => {
  try { return localStorage.getItem('himnario_locale') || 'es'; } catch { return 'es'; }
};

/** Deja este celular suscrito y avisado al servidor. `pedir` = puede mostrar la pregunta del sistema (solo tras un
 *  toque de la persona). Devuelve el estado del permiso al terminar. */
export async function suscribir(pedir: boolean): Promise<EstadoPermiso> {
  let estado = permisoActual();
  if (estado === 'no-soportado' || estado === 'bloqueado') return estado;
  if (estado === 'pedir') {
    if (!pedir) return estado;
    estado = (await Notification.requestPermission()) === 'granted' ? 'permitido' : permisoActual();
    if (estado !== 'permitido') return estado;
  }
  const registro = await navigator.serviceWorker.ready;
  let sub = await registro.pushManager.getSubscription();
  if (!sub) {
    const { clave } = await api<{ clave: string | null }>('notificaciones/clave');
    if (!clave) return estado;
    sub = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(clave) as BufferSource });
  }
  await api('notificaciones/suscripcion', { metodo: 'POST', datos: { endpoint: sub.endpoint, idioma: idiomaApp() } });
  return estado;
}

/** Al abrir la app (registrado, con notificaciones activas y permiso ya dado): renueva la suscripción en silencio. */
export async function mantenerSuscripcion() {
  if (permisoActual() !== 'permitido') return;
  try { await suscribir(false); } catch { /* sin internet: la próxima vez */ }
}

/** Apagar en este celular: se quita la suscripción (el servidor deja de despertarlo). */
export async function desuscribir() {
  if (permisoActual() === 'no-soportado') return;
  const registro = await navigator.serviceWorker.ready;
  const sub = await registro.pushManager.getSubscription();
  if (!sub) return;
  await api('notificaciones/suscripcion', { metodo: 'DELETE', datos: { endpoint: sub.endpoint } }).catch(() => {});
  await sub.unsubscribe().catch(() => {});
}

export interface Preferencias {
  activas: boolean;
  tipos: { tipo: string; activo: boolean }[];
}

export const leerPreferencias = () => api<Preferencias>('notificaciones/preferencias');
export const cambiarPreferencias = (cambios: { activas?: boolean; tipo?: string; activo?: boolean }) =>
  api<Preferencias>('notificaciones/preferencias', { metodo: 'PATCH', datos: cambios });

/** (1.20.3, Josué) Lo que ya se vio en la app también se quita de la barra del celular: se cierran las notificaciones
 *  mostradas cuyo aviso ya no está "sin ver" en el servidor. `sinVer` = ids sin ver (si ya se tienen). */
export async function cerrarVistasDeLaBandeja(sinVer?: number[]) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const mostradas = (await reg?.getNotifications()) ?? [];
    if (!mostradas.length) return;
    const ids = sinVer ?? (await api<{ ids?: number[] }>('notificaciones/sin-ver')).ids;
    if (!ids) return;
    for (const n of mostradas) if (typeof n.data?.id === 'number' && !ids.includes(n.data.id)) n.close();
  } catch { /* sin service worker o sin internet: queda como está */ }
}
const yLimpiar = (p: Promise<unknown>) => p.then(() => cerrarVistasDeLaBandeja(), () => {});

/** (1.20.2) Esta minuta se vio (al frente en Minutas o abierta): sus avisos quedan vistos. */
export const marcarMinutaVista = (id: string) => yLimpiar(api('notificaciones/vista', { metodo: 'POST', datos: { minuta: id } }));
/** (1.20.2) Se entró a la pantalla de esos avisos (Administración → "registro"). */
export const marcarTiposVistos = (tipos: string[]) => yLimpiar(api('notificaciones/vista', { metodo: 'POST', datos: { tipos } }));

/** Marca como vistas todas las notificaciones de esta persona (al entrar a Minutas, los que no son admin). */
export const marcarTodasVistas = () => yLimpiar(api('notificaciones/vista', { metodo: 'POST', datos: { todas: true } }));
