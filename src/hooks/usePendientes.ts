// Solicitudes de creador pendientes de aprobar y notificaciones sin ver (solo el administrador). Se muestra un punto en la pestaña Ajustes,
// en el menú ⋮ y en "Administración", para saber que hay algo por revisar sin tener que entrar (Josué, 1.5.6).
// Un solo contador compartido: se consulta al abrir, al volver a la app y cada minuto.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAcceso } from '@/hooks/useAcceso';
import { cerrarVistasDeLaBandeja } from '@/lib/notificaciones';

let cantidad = 0;
// (1.15.0) Por separado: solicitudes (Administración) y avisos sin ver (Notificaciones).
let detalle = { solicitudes: 0, sinVer: 0 };
const oyentes = new Set<(n: number) => void>();
let consultando = false;

export async function revisarPendientes() {
  if (consultando) return;
  consultando = true;
  try {
    // (1.11.0) También las notificaciones que el administrador aún no vio (p. ej. las borró de la bandeja sin abrirlas).
    const [lista, sinVer] = await Promise.all([
      api<{ estado: string }[]>('admin/dispositivos'),
      api<{ n: number; ids?: number[] }>('notificaciones/sin-ver').catch(() => ({ n: 0, ids: undefined })),
    ]);
    detalle = { solicitudes: lista.filter(d => d.estado === 'pendiente').length, sinVer: sinVer.n };
    if (sinVer.ids) cerrarVistasDeLaBandeja(sinVer.ids); // (1.20.3) lo visto sale también de la barra del celular
    cantidad = detalle.solicitudes + detalle.sinVer;
    oyentes.forEach(f => f(cantidad));
  } catch { /* sin internet o sin permiso: se deja como estaba */ } finally {
    consultando = false;
  }
}

export function usePendientes(): number {
  const { esAdmin } = useAcceso();
  const [n, setN] = useState(cantidad);
  useEffect(() => {
    if (!esAdmin) return;
    oyentes.add(setN);
    revisarPendientes();
    const alVolver = () => { if (document.visibilityState === 'visible') revisarPendientes(); };
    document.addEventListener('visibilitychange', alVolver);
    const t = setInterval(alVolver, 60_000);
    return () => { oyentes.delete(setN); document.removeEventListener('visibilitychange', alVolver); clearInterval(t); };
  }, [esAdmin]);
  return esAdmin ? n : 0;
}

/** (1.15.0) Lo mismo, separado: solicitudes pendientes y avisos sin ver (para marcar cada opción del menú ⋮). */
export function usePendientesDetalle(): { solicitudes: number; sinVer: number } {
  const n = usePendientes();
  return n ? detalle : { solicitudes: 0, sinVer: 0 };
}
