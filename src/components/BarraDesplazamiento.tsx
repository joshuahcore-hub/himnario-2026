// (1.19.10, Josué) Barra para recorrer una lista larga (Himnario): una píldora visible a la derecha que aparece al
// desplazar y se puede TOMAR y arrastrar (hasta arriba o abajo de un tirón). Se mueve directo con style (sin estado de
// React en cada movimiento: fluido) y se esconde sola al rato. La zona que se puede tocar es más ancha que la píldora.
import { useEffect, useRef } from 'react';

const ALTO = 44;       // px mínimos de la píldora (1.20.9: crece si la lista es corta, p. ej. con filtro)
const ESPERA = 1300;   // ms visible después de dejar de moverse

export default function BarraDesplazamiento({ lista }: { lista: React.RefObject<HTMLElement> }) {
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
    ubicar();
    el.addEventListener('scroll', alDesplazar, { passive: true });
    return () => { el.removeEventListener('scroll', alDesplazar); clearTimeout(ocultar.current); };
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
         style={{ opacity: 0, pointerEvents: 'none', touchAction: 'none' }}
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
           style={{ height: ALTO, willChange: 'transform', transition: 'width 120ms ease-out, background-color 120ms ease-out' }} />
    </div>
  );
}
