// Toque "seguro" (1.7.4, Josué): el botón se activa al SOLTAR el dedo si bajó y subió sobre él sin moverse, sin
// depender del "click" del navegador.
// Por qué: justo después de deslizar (cambiar de canción, mover una lista) el navegador sigue "en movimiento" un
// instante y usa el primer toque solo para frenarlo: NO genera el click. Por eso el botón de recordatorio no
// respondía al primer toque tras deslizar (el segundo sí). Los eventos pointer sí llegan siempre.
import { useRef } from 'react';

const MOVIMIENTO_MAX = 12; // px: más que esto ya es un deslizamiento, no un toque
const DURACION_MAX = 1000; // ms: más que esto es "mantener presionado"

export function useToque<E extends HTMLElement = HTMLButtonElement>(accion: (e: React.PointerEvent<E> | React.MouseEvent<E>) => void) {
  const inicio = useRef<{ x: number; y: number; t: number; id: number } | null>(null);
  const hecho = useRef(0);
  const accionRef = useRef(accion);
  accionRef.current = accion;
  return {
    // stopPropagation: un botón dentro de otro tocable (opciones dentro de una nota) no activa también al de afuera.
    onPointerDown: (e: React.PointerEvent<E>) => {
      e.stopPropagation();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      inicio.current = { x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId };
    },
    onPointerUp: (e: React.PointerEvent<E>) => {
      e.stopPropagation();
      const i = inicio.current;
      inicio.current = null;
      if (!i || i.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - i.x, e.clientY - i.y) > MOVIMIENTO_MAX || Date.now() - i.t > DURACION_MAX) return;
      hecho.current = Date.now();
      accionRef.current(e);
    },
    onPointerCancel: () => { inicio.current = null; },
    // El click que llega después del toque se ignora (ya se hizo). Sirve igual para teclado u otros casos.
    onClick: (e: React.MouseEvent<E>) => {
      e.stopPropagation();
      if (Date.now() - hecho.current < 700) return;
      accionRef.current(e);
    },
  };
}
