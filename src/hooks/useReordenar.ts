// Reordenar una lista manteniendo presionada una fila y arrastrándola (como los íconos del celular).
// - Mantener presionada ~0,38 s sin mover: vibra un poco y la fila "se levanta".
// - Arrastrar arriba/abajo: la fila sigue el dedo y las demás se apartan para mostrar dónde caerá.
// - Soltar: la fila encaja en su lugar y se llama onMover(desde, hasta).
// Si el dedo se mueve antes de tiempo, no se activa (deja pasar el desplazamiento normal o el deslizar para borrar).
// Las filas deben tener el atributo data-fila={índice}. Los toques que empiezan en un botón no activan el arrastre.
import { CSSProperties, useEffect, useRef, useState } from 'react';

const ESPERA_MS = 380;
const APARTAR_MS = 200;
const ENCAJAR_MS = 160;

interface Arrastre {
  desde: number;
  hasta: number;
  dy: number;
  alto: number;
  soltando: boolean;
}

export function useReordenar(onMover: (desde: number, hasta: number) => void) {
  // Ref por función: si la lista aparece después (p. ej. al confirmarse el acceso), igual se engancha.
  const [el, contenedorRef] = useState<HTMLDivElement | null>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);
  const onMoverRef = useRef(onMover);
  onMoverRef.current = onMover;

  useEffect(() => {
    if (!el) return;
    const desplazable = el.closest('.overflow-y-auto') as HTMLElement | null;
    let temporizador: ReturnType<typeof setTimeout> | undefined;
    let inicio: { x: number; y: number } | null = null;
    let d: {
      desde: number; hasta: number; inicioY: number; inicioScroll: number;
      centros: number[]; tops: number[]; altos: number[];
    } | null = null;

    const filas = () => [...el.querySelectorAll<HTMLElement>('[data-fila]')];

    const alTocar = (e: TouchEvent) => {
      const objetivo = e.target as HTMLElement;
      const fila = objetivo.closest<HTMLElement>('[data-fila]');
      if (!fila || objetivo.closest('button')) return;
      const t = e.touches[0];
      inicio = { x: t.clientX, y: t.clientY };
      const desde = Number(fila.dataset.fila);
      clearTimeout(temporizador);
      temporizador = setTimeout(() => {
        if (!inicio) return;
        const rects = filas().map(f => f.getBoundingClientRect());
        d = {
          desde, hasta: desde, inicioY: inicio.y, inicioScroll: desplazable?.scrollTop ?? 0,
          centros: rects.map(r => r.top + r.height / 2), tops: rects.map(r => r.top), altos: rects.map(r => r.height),
        };
        navigator.vibrate?.(15);
        setArrastre({ desde, hasta: desde, dy: 0, alto: rects[desde].height, soltando: false });
      }, ESPERA_MS);
    };

    const alMover = (e: TouchEvent) => {
      const t = e.touches[0];
      if (!d) {
        if (inicio && (Math.abs(t.clientX - inicio.x) > 8 || Math.abs(t.clientY - inicio.y) > 8)) {
          clearTimeout(temporizador);
          inicio = null;
        }
        return;
      }
      e.preventDefault(); // mientras se arrastra, la lista no se desplaza con el dedo
      if (desplazable) {
        const r = desplazable.getBoundingClientRect();
        if (t.clientY < r.top + 50) desplazable.scrollTop -= 10;
        else if (t.clientY > r.bottom - 50) desplazable.scrollTop += 10;
      }
      const dy = t.clientY - d.inicioY + ((desplazable?.scrollTop ?? 0) - d.inicioScroll);
      const centro = d.centros[d.desde] + dy;
      let hasta = d.desde;
      for (let j = d.desde + 1; j < d.centros.length; j++) if (centro > d.centros[j]) hasta = j;
      for (let j = d.desde - 1; j >= 0; j--) if (centro < d.centros[j]) hasta = j;
      d.hasta = hasta;
      setArrastre({ desde: d.desde, hasta, dy, alto: d.altos[d.desde], soltando: false });
    };

    const alSoltar = () => {
      clearTimeout(temporizador);
      inicio = null;
      if (!d) return;
      const { desde, hasta, tops, altos } = d;
      d = null;
      // Llevar la fila justo a su nuevo lugar y luego reordenar la lista.
      const dyFinal = hasta > desde
        ? tops[hasta] + altos[hasta] - (tops[desde] + altos[desde])
        : hasta < desde ? tops[hasta] - tops[desde] : 0;
      setArrastre({ desde, hasta, dy: dyFinal, alto: altos[desde], soltando: true });
      setTimeout(() => {
        if (hasta !== desde) onMoverRef.current(desde, hasta);
        setArrastre(null);
      }, ENCAJAR_MS);
    };

    el.addEventListener('touchstart', alTocar, { passive: true });
    el.addEventListener('touchmove', alMover, { passive: false });
    el.addEventListener('touchend', alSoltar);
    el.addEventListener('touchcancel', alSoltar);
    return () => {
      clearTimeout(temporizador);
      el.removeEventListener('touchstart', alTocar);
      el.removeEventListener('touchmove', alMover);
      el.removeEventListener('touchend', alSoltar);
      el.removeEventListener('touchcancel', alSoltar);
    };
  }, [el]);

  /** Estilo de cada fila durante el arrastre (la levantada sigue el dedo; las demás se apartan). */
  const estiloFila = (i: number): CSSProperties | undefined => {
    if (!arrastre) return undefined;
    const { desde, hasta, dy, alto, soltando } = arrastre;
    if (i === desde) {
      return {
        transform: `translateY(${dy}px) scale(${soltando ? 1 : 1.03})`,
        transition: soltando ? `transform ${ENCAJAR_MS}ms ease-out` : 'transform 120ms ease-out',
        zIndex: 20,
        position: 'relative',
        filter: soltando ? undefined : 'drop-shadow(0 10px 18px rgba(0,0,0,0.28))',
      };
    }
    let mover = 0;
    if (desde < i && i <= hasta) mover = -alto;
    else if (hasta <= i && i < desde) mover = alto;
    return { transform: `translateY(${mover}px)`, transition: `transform ${APARTAR_MS}ms ease-out` };
  };

  return { contenedorRef, arrastrando: arrastre !== null, estiloFila };
}
