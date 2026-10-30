// (1.19.10, Josué) Barra para recorrer una lista larga (Himnario): una píldora visible a la derecha que aparece al
// desplazar y se puede TOMAR y arrastrar (hasta arriba o abajo de un tirón). Se mueve directo con style (sin estado de
// React en cada movimiento: fluido) y se esconde sola al rato. La zona que se puede tocar es más ancha que la píldora.
import { useEffect, useRef } from 'react';

const ALTO = 44;       // px mínimos de la píldora (1.20.9: crece si la lista es corta, p. ej. con filtro)
const ESPERA = 1300;   // ms visible después de dejar de moverse
const TRANSICION = 'width 120ms ease-out, background-color 120ms ease-out';

/** (1.20.12) La misma barra para una zona que se crea dentro de un .map o una función de dibujo (sin hooks allí):
 *  `<ConBarra>{ref => <div ref={ref} className="… overflow-y-auto scrollbar-hide">…</div>}</ConBarra>`.
 *  Va dentro de un contenedor posicionado del mismo tamaño que la zona. */
export function ConBarra({ children, arriba, abajo }: { children: (ref: React.RefObject<HTMLDivElement>) => React.ReactNode; arriba?: string; abajo?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  return <><BarraDesplazamiento lista={ref} arriba={arriba} abajo={abajo} />{children(ref)}</>;
}

/** `arriba`: dónde empieza la barra (p. ej. debajo de los botones de un lector); `abajo`: dónde termina (1.22.12: sobre
 *  la barra de himnos del himno girado). */
export default function BarraDesplazamiento({ lista, arriba, abajo }: { lista: React.RefObject<HTMLElement>; arriba?: string; abajo?: string }) {
  const zona = useRef<HTMLDivElement>(null);
  const pildora = useRef<HTMLDivElement>(null);
  const arrastre = useRef<{ y: number; top: number } | null>(null);
  const ocultar = useRef<ReturnType<typeof setTimeout>>();
  const alto = useRef(ALTO);

  useEffect(() => {
    const el = lista.current, z = zona.current, p = pildora.current;
    if (!el || !z || !p) return;
    const recorrido = () => Math.max(0, z.clientHeight - alto.current);
    const ubicar = () => {
      const max = el.scrollHeight - el.clientHeight;
      // (1.20.9, Josué) Alto proporcional a lo que se ve de la lista: con pocos himnos la píldora es grande y no
      // "salta" de arriba abajo con un poquito de desplazamiento. Nunca menos de ALTO ni más del 85 % de la zona.
      if (!arrastre.current) {
        const h = Math.round(Math.min(z.clientHeight * 0.85, Math.max(ALTO, z.clientHeight * el.clientHeight / Math.max(1, el.scrollHeight))));
        if (h !== alto.current) { alto.current = h; p.style.height = `${h}px`; }
      }
      p.style.transform = `translateY(${max > 0 ? (el.scrollTop / max) * recorrido() : 0}px)`;
    };
    const mostrar = () => {
      if (el.scrollHeight - el.clientHeight < 40) return; // lista corta: sin barra
      z.style.opacity = '1'; z.style.pointerEvents = 'auto';
      clearTimeout(ocultar.current);
      ocultar.current = setTimeout(() => {
        if (arrastre.current) return;
        z.style.opacity = '0'; z.style.pointerEvents = 'none';
      }, ESPERA);
    };
    const alDesplazar = () => { ubicar(); mostrar(); };
    // (1.20.11, Josué) Cambia la lista (filtro, búsqueda): la píldora toma su nuevo largo y lugar con una animación
    // corta (solo en ese momento; al desplazar sigue al dedo sin transición).
    let suave: ReturnType<typeof setTimeout> | undefined;
    const alCambiar = () => {
      if (arrastre.current) return;
      p.style.transition = `${TRANSICION}, height 200ms ease-out, transform 200ms ease-out`;
      ubicar();
      if (el.scrollHeight - el.clientHeight < 40) { z.style.opacity = '0'; z.style.pointerEvents = 'none'; }
      clearTimeout(suave);
      suave = setTimeout(() => { p.style.transition = TRANSICION; }, 220);
    };
    const observador = new MutationObserver(alCambiar);
    observador.observe(el, { childList: true, subtree: true });
    ubicar();
    el.addEventListener('scroll', alDesplazar, { passive: true });
    return () => {
      el.removeEventListener('scroll', alDesplazar); observador.disconnect();
      clearTimeout(ocultar.current); clearTimeout(suave);
    };
  }, [lista]);

  const mover = (clientY: number) => {
    const el = lista.current, z = zona.current, a = arrastre.current;
    if (!el || !z || !a) return;
    const recorrido = Math.max(1, z.clientHeight - alto.current);
    const top = Math.min(recorrido, Math.max(0, a.top + clientY - a.y));
    el.scrollTop = (top / recorrido) * (el.scrollHeight - el.clientHeight);
  };

  // (1.20.8, Josué) Al tocarla se agranda un poco y se oscurece (se nota que quedó tomada); al soltar vuelve. Rápido y suave.
  const marcar = (tomada: boolean) => {
    const p = pildora.current;
    if (!p) return;
    p.style.width = tomada ? '12px' : '7px';
    p.style.backgroundColor = tomada ? 'hsl(var(--foreground) / 0.75)' : '';
  };

  return (
    <div ref={zona} aria-hidden
         className="absolute top-2 bottom-2 right-0 w-7 z-20 transition-opacity duration-300"
         style={{ opacity: 0, pointerEvents: 'none', touchAction: 'none', ...(arriba && { top: arriba }), ...(abajo && { bottom: abajo }) }}
         onPointerDown={e => {
           const p = pildora.current;
           if (!p) return;
           e.preventDefault();
           marcar(true);
           e.currentTarget.setPointerCapture(e.pointerId);
           const actual = new DOMMatrix(getComputedStyle(p).transform).m42;
           const yPildora = e.currentTarget.getBoundingClientRect().top + actual;
           // Tocar fuera de la píldora la lleva ahí (centrada en el dedo); tocarla, la toma donde está.
           const dentro = e.clientY >= yPildora && e.clientY <= yPildora + alto.current;
           arrastre.current = { y: e.clientY, top: dentro ? actual : e.clientY - e.currentTarget.getBoundingClientRect().top - alto.current / 2 };
           mover(e.clientY);
         }}
         onPointerMove={e => { if (arrastre.current) mover(e.clientY); }}
         onPointerUp={() => { arrastre.current = null; marcar(false); lista.current?.dispatchEvent(new Event('scroll')); }}
         onPointerCancel={() => { arrastre.current = null; marcar(false); }}>
      <div ref={pildora} className="absolute right-1 top-0 w-[7px] rounded-full bg-foreground/50 shadow-sm"
           style={{ height: ALTO, willChange: 'transform', transition: TRANSICION }} />
    </div>
  );
}
