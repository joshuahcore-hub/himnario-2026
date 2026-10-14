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
