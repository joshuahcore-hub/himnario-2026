// Minutas: se piden al servidor cuando hay internet y se guarda una copia en el celular,
// así las ya cargadas se pueden ver sin internet (por ejemplo, en el culto).
import { useCallback, useEffect, useState } from 'react';
import type { MinutaData } from '@/lib/types';
import { api, ErrorDeRed } from '@/lib/api';
import { preloadHymnImageBoth } from '@/lib/hymnCache';

const CACHE_KEY = 'himnario_minutas_v2';

let memoria: MinutaData[] | null = null;
const oyentes = new Set<(m: MinutaData[]) => void>();

function leerLocal(): MinutaData[] {
  if (memoria) return memoria;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    memoria = raw ? JSON.parse(raw) : [];
  } catch {
    memoria = [];
  }
  return memoria!;
}

function guardar(minutas: MinutaData[]) {
  memoria = minutas;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(minutas)); } catch {}
  oyentes.forEach(f => f(minutas));
}

/** Pide las minutas al servidor. Devuelve false si no hay internet (se siguen mostrando las guardadas). */
export async function refrescarMinutas(): Promise<boolean> {
  try {
    const lista = await api<MinutaData[]>('minutas');
    guardar(lista);
    return true;
  } catch (e) {
    if (e instanceof ErrorDeRed) return false;
    throw e;
  }
}

export function getMinuta(id: string): MinutaData | undefined {
  return leerLocal().find(m => m.id === id);
}

// Minuta que la lista debe mostrar al centro la próxima vez que se abra (p. ej. al volver de editarla).
let enfocarAlVolver: string | null = null;
export const marcarParaEnfocar = (id: string) => { enfocarAlVolver = id; };
export function tomarParaEnfocar(): string | null {
  const id = enfocarAlVolver;
  enfocarAlVolver = null;
  return id;
}

export function guardarMinutaLocal(m: MinutaData) {
  const lista = leerLocal().filter(x => x.id !== m.id);
  guardar([...lista, m].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creada.localeCompare(b.creada)));
}

export function quitarMinutaLocal(id: string) {
  guardar(leerLocal().filter(m => m.id !== id));
}

export function useMinutas() {
  const [minutas, setMinutas] = useState<MinutaData[]>(leerLocal);
  const [sinConexion, setSinConexion] = useState(false);
  const [cargando, setCargando] = useState(true);

  const refrescar = useCallback(async () => {
    setCargando(true);
    const ok = await refrescarMinutas().catch(() => false);
    setSinConexion(!ok);
    setCargando(false);
  }, []);

  useEffect(() => {
    oyentes.add(setMinutas);
    refrescar();
    return () => { oyentes.delete(setMinutas); };
  }, [refrescar]);

  // Deja guardadas en el celular las imágenes de los cantos de las minutas (ya vienen en la app, esto solo las adelanta).
  useEffect(() => {
    minutas.slice(-4).forEach(m => m.cantos.forEach(c => {
      if (c.hymnNumber) preloadHymnImageBoth(c.hymnNumber);
      if (c.groupedWith?.hymnNumber) preloadHymnImageBoth(c.groupedWith.hymnNumber);
    }));
  }, [minutas]);

  return { minutas, sinConexion, cargando, refrescar };
}
