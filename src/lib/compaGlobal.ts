// Modo Compañerismo GLOBAL (1.30.0, Josué 14-11-2026): lo pone SOLO el administrador y a todos les sale lo mismo
// («para que ellos no tengan que estar apretando ese botón»). El valor vive en el servidor (/api/ajustes); cada equipo
// guarda la última copia (compa.ts) para usarla sin internet. Se pregunta al abrir, al volver a la app y cada 5 min.
// El himno que se está viendo no cambia de imagen: el cambio se nota al abrir el siguiente (regla: no cambiar lo visible).
import { api } from '@/lib/api';
import { compaActivo } from '@/lib/compa';
import { fijarCompa } from '@/lib/hymnCache';

const oyentes = new Set<(v: boolean) => void>();

function aplicar(v: boolean) {
  if (v === compaActivo()) return;
  fijarCompa(v);
  oyentes.forEach(f => f(v));
}

export async function refrescarCompa(): Promise<void> {
  try { aplicar((await api<{ compa: boolean }>('ajustes')).compa); } catch { /* sin internet: la última copia */ }
}

/** Solo el administrador: lo cambia para todos. Si falla (sin internet), se lanza el error y no cambia nada. */
export async function cambiarCompaGlobal(v: boolean): Promise<boolean> {
  const r = await api<{ compa: boolean }>('ajustes', { metodo: 'PUT', datos: { compa: v } });
  aplicar(r.compa);
  return r.compa;
}

export function alCambiarCompa(f: (v: boolean) => void): () => void {
  oyentes.add(f);
  return () => { oyentes.delete(f); };
}

let iniciado = false;
/** Se llama una vez al arrancar la app. */
export function iniciarCompaGlobal(): void {
  if (iniciado) return;
  iniciado = true;
  refrescarCompa();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refrescarCompa(); });
  setInterval(() => { if (document.visibilityState === 'visible') refrescarCompa(); }, 5 * 60 * 1000);
}
