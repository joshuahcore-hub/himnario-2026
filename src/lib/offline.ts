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
  guardadas: number;
  total: number;
  listo: boolean;
}

export function useOffline(): EstadoOffline {
  const soportado = 'serviceWorker' in navigator && 'caches' in window;
  const [guardadas, setGuardadas] = useState(0);

  useEffect(() => {
    if (!soportado) return;
    let activo = true;
    let timer: number | undefined;
    const revisar = async () => {
      const n = await contarImagenesGuardadas().catch(() => 0);
      if (!activo) return;
      setGuardadas(n);
      if (n < TOTAL_IMAGENES) timer = window.setTimeout(revisar, 1000);
    };
    revisar();
    return () => { activo = false; window.clearTimeout(timer); };
  }, [soportado]);

  const listo = guardadas >= TOTAL_IMAGENES;
  return { soportado, guardadas: Math.min(guardadas, TOTAL_IMAGENES), total: TOTAL_IMAGENES, listo };
}
