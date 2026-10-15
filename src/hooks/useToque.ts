// Toque "seguro" (1.7.4, Josué): el botón se activa al SOLTAR el dedo si bajó y subió sobre él sin moverse, sin
// depender del "click" del navegador.
// Por qué: justo después de deslizar (cambiar de canción, mover una lista) el navegador sigue "en movimiento" un
// instante y usa el primer toque solo para frenarlo: NO genera el click. Por eso el botón de recordatorio no
// respondía al primer toque tras deslizar (el segundo sí). Los eventos pointer sí llegan siempre.
import { useRef } from 'react';

const MOVIMIENTO_MAX = 12; // px: más que esto ya es un deslizamiento, no un toque
const DURACION_MAX = 1000; // ms: más que esto es "mantener presionado"
const CLICK_FANTASMA_MS = 700;

// Click "fantasma" (1.11.0, Josué): como el botón actúa al SOLTAR, si eso cierra lo que estaba encima (p. ej. "Listo"
// cierra el buscador), el click que el navegador manda justo después cae en lo que quedó DEBAJO (la pestaña de abajo:
// "¿Guardar o descartar?"). Durante un instante tras un toque, se anula el click que llega EN EL MISMO PUNTO y no es
// del mismo botón (un toque nuevo en otro lugar sí funciona).
let ultimoToque = 0;
let puntoDelToque = { x: 0, y: 0 };
let botonDelToque: Element | null = null;
if (typeof document !== 'undefined') {
  document.addEventListener('click', e => {
    if (Date.now() - ultimoToque > CLICK_FANTASMA_MS) return;
    if (botonDelToque && e.target instanceof Node && botonDelToque.contains(e.target)) return;
    // Margen amplio: el teléfono puede correr el punto del click hacia el centro del botón más cercano.
    if (Math.hypot(e.clientX - puntoDelToque.x, e.clientY - puntoDelToque.y) > 60) return;
    e.stopPropagation();
    e.preventDefault();
  }, true);
}

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
      ultimoToque = hecho.current;
      puntoDelToque = { x: e.clientX, y: e.clientY };
      botonDelToque = e.currentTarget;
      accionRef.current(e);
    },
    onPointerCancel: () => { inicio.current = null; },
    // El click que llega después del toque se ignora (ya se hizo). Sirve igual para teclado u otros casos.
    onClick: (e: React.MouseEvent<E>) => {
      e.stopPropagation();
      if (Date.now() - hecho.current < CLICK_FANTASMA_MS) return;
      accionRef.current(e);
    },
  };
}
