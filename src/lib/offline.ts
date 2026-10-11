// Estado del guardado sin internet: cuenta cuántas imágenes de himnos ya están en la caché del service worker.
import { useEffect, useState } from 'react';
import { getHymnNumbers } from '@/lib/hymnCache';

export const TOTAL_IMAGENES = getHymnNumbers().length * 2; // claro + oscuro

async function contarImagenesGuardadas(): Promise<number> {
  if (!('caches' in window)) return 0;
  let total = 0;
  for (const nombre of await caches.keys()) {
    if (!nombre.includes('precache')) continue;
    const cache = await caches.open(nombre);
    const claves = await cache.keys();
    total += claves.filter(r => new URL(r.url).pathname.startsWith('/himnos/')).length;
  }
  return total;
}

export interface EstadoOffline {
  soportado: boolean;
  /** false mientras se cuenta por primera vez (no mostrar "0 de N": parpadeaba al abrir Ajustes). */
  revisado: boolean;
  guardadas: number;
  total: number;
  listo: boolean;
}

// Último conteo conocido en esta sesión: al volver a Ajustes se muestra al instante, sin volver a contar desde 0.
let ultimoConteo: number | null = null;

export function useOffline(): EstadoOffline {
  const soportado = 'serviceWorker' in navigator && 'caches' in window;
  const [guardadas, setGuardadas] = useState<number | null>(ultimoConteo);

  useEffect(() => {
    if (!soportado) return;
    let activo = true;
    let timer: number | undefined;
    const revisar = async () => {
      const n = await contarImagenesGuardadas().catch(() => 0);
      if (!activo) return;
      ultimoConteo = n;
      setGuardadas(n);
      if (n < TOTAL_IMAGENES) timer = window.setTimeout(revisar, 1000);
    };
    revisar();
    return () => { activo = false; window.clearTimeout(timer); };
  }, [soportado]);

  const n = guardadas ?? 0;
  return { soportado, revisado: guardadas !== null, guardadas: Math.min(n, TOTAL_IMAGENES), total: TOTAL_IMAGENES, listo: n >= TOTAL_IMAGENES };
}
