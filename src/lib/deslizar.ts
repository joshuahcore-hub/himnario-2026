// Paso de una página a otra al deslizar (himno abierto y lector de minutas), amortiguado como el carrusel de
// minutas: arranca rápido y se frena suave al llegar, en vez de llegar y "chocar" (antes 250 ms ease-out).
export const DURACION_DESLIZAR = 420;
export const CURVA_DESLIZAR = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Movimiento lateral mínimo para tomar el gesto como "cambiar de página". */
export const UMBRAL_LADO = 16;

/**
 * Decide con firmeza hacia dónde va el dedo (Josué, 1.6.3: al recorrer hacia abajo la página no debe mecerse hacia
 * los lados). true = lateral (cambiar de página), false = vertical, null = todavía no se sabe.
 * Lateral solo si avanzó UMBRAL_LADO px y al menos el doble que en vertical; lo demás, en cuanto baja 8 px, vertical.
 */
export function direccionFirme(dx: number, dy: number): boolean | null {
  const ax = Math.abs(dx), ay = Math.abs(dy);
  if (ax >= UMBRAL_LADO && ax > ay * 2) return true;
  if (ay >= 8) return false;
  return null;
}

/**
 * Rueda del mouse en el computador (1.13.4, Josué): UNA canción por muesca. Devuelve 1 / -1 cuando hay que pasar,
 * o 0. Suma los movimientos chicos (panel táctil) hasta lo que mide una muesca y deja un respiro entre pasos, para que
 * un solo giro no salte varias.
 */
export function rueda(e: { deltaX: number; deltaY: number; deltaMode: number }, estado: { acum: number; ultimo: number; paso: number }): 1 | -1 | 0 {
  const ahora = Date.now();
  let delta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  if (e.deltaMode === 1) delta *= 40; // en líneas (Firefox)
  if (ahora - estado.ultimo > 250) estado.acum = 0;
  estado.ultimo = ahora;
  estado.acum += delta;
  if (Math.abs(estado.acum) < 60 || ahora - estado.paso < 160) return 0;
  const d = estado.acum > 0 ? 1 : -1;
  estado.acum = 0;
  estado.paso = ahora;
  return d;
}
