// Movimiento de las ruedas de selección (tonalidad y tempo), como las ruedas del celular:
// - la rueda sigue el dedo y se pueden pasar varias opciones en un mismo gesto;
// - al soltar se acomoda suave en la opción más cercana (un deslizamiento rápido avanza más);
// - las opciones deshabilitadas se saltan.
// Devuelve "posicion" (índice con decimales, para escalar y atenuar cada opción según su distancia al centro).
import { useCallback, useRef, useState } from 'react';

export const RUEDA_MS = 220;
export const RUEDA_CURVA = 'cubic-bezier(0.22, 1, 0.36, 1)';

export function useRueda({ cantidad, indice, onCambio, tamano, eje, deshabilitado = () => false }: {
  cantidad: number;
  indice: number;
  onCambio: (indice: number) => void;
  /** Alto (vertical) o ancho (horizontal) de cada opción, en px. */
  tamano: number;
  eje: 'x' | 'y';
  deshabilitado?: (indice: number) => boolean;
}) {
  const [arrastre, setArrastre] = useState(0); // px que el dedo movió la rueda (positivo = hacia opciones siguientes)
  const [animando, setAnimando] = useState(false);
  const toque = useRef<{ inicio: number; otroEje: number; t: number; eje: boolean | null; ultimos: { p: number; t: number }[] } | null>(null);
  const rueda = useRef(false);

  const habilitadoMasCercano = useCallback((objetivo: number) => {
    const limitado = Math.max(0, Math.min(cantidad - 1, objetivo));
    for (let d = 0; d < cantidad; d++) {
      for (const c of [limitado + d, limitado - d]) if (c >= 0 && c < cantidad && !deshabilitado(c)) return c;
    }
    return indice;
  }, [cantidad, deshabilitado, indice]);

  const irA = useCallback((objetivo: number) => {
    const destino = habilitadoMasCercano(objetivo);
    setAnimando(true);
    setArrastre(0);
    if (destino !== indice) onCambio(destino);
    setTimeout(() => setAnimando(false), RUEDA_MS);
  }, [habilitadoMasCercano, indice, onCambio]);

  const coord = (e: React.TouchEvent) => (eje === 'y' ? e.touches[0].clientY : e.touches[0].clientX);
  const otra = (e: React.TouchEvent) => (eje === 'y' ? e.touches[0].clientX : e.touches[0].clientY);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const p = coord(e);
    toque.current = { inicio: p, otroEje: otra(e), t: performance.now(), eje: null, ultimos: [{ p, t: performance.now() }] };
    setAnimando(false);
  }, [eje]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const t0 = toque.current;
    if (!t0) return;
    const p = coord(e);
    const delta = t0.inicio - p;
    if (t0.eje === null && (Math.abs(delta) > 6 || Math.abs(otra(e) - t0.otroEje) > 6)) {
      t0.eje = Math.abs(delta) >= Math.abs(otra(e) - t0.otroEje);
    }
    if (!t0.eje) return; // (el desplazamiento de la página lo frena touch-action en el contenedor)
    // Más allá del primer/último valor: tope elástico. La rueda cede cada vez menos y nunca pasa de ~media opción
    // (Josué, 1.5.2: antes la resistencia era proporcional y, si seguía deslizando, la rueda se iba lejos).
    const posicion = indice + delta / tamano;
    const tope = Math.max(0, Math.min(cantidad - 1, posicion));
    const excesoPx = (posicion - tope) * tamano;
    const maximo = tamano * 0.55;
    const elastico = Math.sign(excesoPx) * maximo * Math.abs(excesoPx) / (Math.abs(excesoPx) + maximo);
    setArrastre((tope - indice) * tamano + elastico);
    t0.ultimos = [...t0.ultimos.slice(-4), { p, t: performance.now() }];
  }, [eje, indice, tamano, cantidad]);

  const onTouchEnd = useCallback(() => {
    const t0 = toque.current;
    toque.current = null;
    if (!t0?.eje) { setArrastre(0); return; }
    const [a, b] = [t0.ultimos[0], t0.ultimos[t0.ultimos.length - 1]];
    const velocidad = b.t > a.t ? (a.p - b.p) / (b.t - a.t) : 0; // px/ms hacia opciones siguientes
    const proyectado = arrastre + velocidad * 90;               // un deslizamiento rápido avanza más
    irA(Math.round(indice + proyectado / tamano));
  }, [arrastre, indice, tamano, irA]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    if (rueda.current) return;
    rueda.current = true;
    const dir = (eje === 'y' ? e.deltaY : e.deltaX || e.deltaY) > 0 ? 1 : -1;
    let destino = indice + dir;
    while (destino >= 0 && destino < cantidad && deshabilitado(destino)) destino += dir;
    if (destino >= 0 && destino < cantidad) irA(destino);
    setTimeout(() => { rueda.current = false; }, RUEDA_MS);
  }, [eje, indice, cantidad, deshabilitado, irA]);

  return {
    posicion: indice + arrastre / tamano,
    transicion: animando ? `transform ${RUEDA_MS}ms ${RUEDA_CURVA}` : 'none',
    animando,
    irA,
    manejadores: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd, onWheel },
  };
}

/** Escala y opacidad de una opción según su distancia al centro (continuo, sin recalcular el texto). */
export function estiloOpcion(distancia: number, transicion: string) {
  const d = Math.min(1, Math.abs(distancia));
  return {
    transform: `scale(${1.22 - d * 0.22})`,
    opacity: 1 - d * 0.55,
    transition: transicion === 'none' ? 'none' : `transform ${RUEDA_MS}ms ${RUEDA_CURVA}, opacity ${RUEDA_MS}ms ${RUEDA_CURVA}`,
  };
}
