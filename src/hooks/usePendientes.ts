// Solicitudes de creador pendientes de aprobar y notificaciones sin ver (solo el administrador). Se muestra un punto en la pestaña Ajustes,
// en el menú ⋮ y en "Administración", para saber que hay algo por revisar sin tener que entrar (Josué, 1.5.6).
// Un solo contador compartido: se consulta al abrir, al volver a la app y cada minuto.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAcceso } from '@/hooks/useAcceso';

let cantidad = 0;
const oyentes = new Set<(n: number) => void>();
let consultando = false;

export async function revisarPendientes() {
  if (consultando) return;
  consultando = true;
  try {
    // (1.11.0) También las notificaciones que el administrador aún no vio (p. ej. las borró de la bandeja sin abrirlas).
    const [lista, sinVer] = await Promise.all([
      api<{ estado: string }[]>('admin/dispositivos'),
      api<{ n: number }>('notificaciones/sin-ver').catch(() => ({ n: 0 })),
    ]);
    cantidad = lista.filter(d => d.estado === 'pendiente').length + sinVer.n;
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
