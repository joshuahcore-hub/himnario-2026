// Modo Compañerismo (provisorio, pedido de Josué 09-11-2026): con el interruptor de Ajustes encendido, los himnos que
// tienen imagen alternativa (public/himnos-compa, recortes-compa.json) la muestran. Apagado, todo vuelve a lo normal.
// Se guarda en este equipo. Para sumar himnos: ver ../companerismo/LEEME.txt.
import recortesCompa from '@/datos/recortes-compa.json';

const CLAVE = 'modo_companerismo';
type Recorte = [number, number, number, number];
const TABLA = recortesCompa as unknown as Record<string, Recorte>;

let activo = false;
try { activo = localStorage.getItem(CLAVE) === '1'; } catch { /* sin almacenamiento: apagado */ }

export const HIMNOS_COMPA = Object.keys(TABLA).map(Number);

export function compaActivo(): boolean { return activo; }

/** ¿Este himno se muestra ahora con su imagen alternativa? */
export function usaCompa(n: number): boolean { return activo && String(n) in TABLA; }

export function recorteCompa(n: number): Recorte | undefined { return activo ? TABLA[String(n)] : undefined; }

export function guardarCompa(v: boolean) {
  activo = v;
  try { localStorage.setItem(CLAVE, v ? '1' : '0'); } catch { /* queda solo para esta sesión */ }
}
