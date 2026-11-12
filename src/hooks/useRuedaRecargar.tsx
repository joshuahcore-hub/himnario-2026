// Recargar deslizando hacia abajo = la RUEDITA de Android (1.29.0, Josué 12-11-2026: "en todas las aplicaciones, siempre
// de esa manera"; igual que Remot 1.42). Un círculo baja desde arriba con el dedo, su arco crece y, al pasar el umbral,
// gira mientras se recarga. Sin texto. Solo cuenta si la lista está arriba del todo y el gesto es vertical hacia abajo.
// Todo el movimiento va DIRECTO al estilo (sin estado de React por cada movimiento), como el resto de los gestos.
import { useRef, useState } from 'react';

const UMBRAL = 64;      // px que hay que bajar la rueda para recargar
const ESCONDIDA = 56;   // la rueda parte escondida sobre el borde de arriba

/** Recarga la app entera (pantallas sin datos propios: Himnario, Ajustes…). Si quedó una versión nueva esperando,
 *  la busca y la usa; la recarga se ve sin destello (ver main.tsx, 1.19.18). */
export async function recargarApp() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    await Promise.race([reg?.update(), new Promise(r => setTimeout(r, 1500))]);
    if (reg?.waiting) {
      navigator.serviceWorker.addEventListener('controllerchange', () => location.reload(), { once: true });
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
      setTimeout(() => location.reload(), 1500); // por si el cambio no avisa
      return;
    }
  } catch { /* sin service worker: recarga simple */ }
  location.reload();
}

/** `accion`: lo que hace al soltar pasado el umbral (traer datos o `recargarApp`). `activo=false` lo apaga
 *  (p. ej. en modo selección o con el zoom puesto). Devuelve los toques para el contenedor que se desplaza
 *  (el que tiene overflow-y) y la rueda para ponerla en cualquier parte de la pantalla (va fija arriba). */
export function useRuedaRecargar(accion: () => unknown, activo = true) {
  const rueda = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ x: number; y: number; vertical: boolean | null; d: number } | null>(null);
  const [girando, setGirando] = useState(false);
  const ocupado = useRef(false);

  const mover = (d: number, animar: boolean) => {
    const el = rueda.current;
    if (!el) return;
    el.style.transition = animar ? 'transform 250ms cubic-bezier(0.22, 1, 0.36, 1), opacity 250ms ease-out' : 'none';
    el.style.transform = `translateY(${d - ESCONDIDA}px)`;
    el.style.opacity = d <= 0 ? '0' : String(Math.min(1, d / 40));
    if (!ocupado.current) {
      const svg = el.firstElementChild as SVGElement | null;
      const arco = svg?.firstElementChild;
      arco?.setAttribute('stroke-dasharray', `${Math.min(78, (d / UMBRAL) * 78).toFixed(1)} 100`);
      if (svg) svg.style.transform = `rotate(${d * 3}deg)`;
    }
  };

  const fin = () => {
    const g = gesto.current;
    gesto.current = null;
    if (!g?.vertical) return;
    if (g.d < UMBRAL) { mover(0, true); return; }
    ocupado.current = true;
    const svg = rueda.current?.firstElementChild as SVGElement | null;
    if (svg) svg.style.transform = '';
    setGirando(true);
    mover(UMBRAL, true);
    // Que alcance a verse girar; al terminar la acción (si trae datos) la rueda vuelve a esconderse.
    const empezo = Date.now();
    setTimeout(() => {
      Promise.resolve()
        .then(accion)
        .catch(() => {})
        .finally(() => setTimeout(() => {
          ocupado.current = false;
          setGirando(false);
          mover(0, true);
        }, Math.max(0, 600 - (Date.now() - empezo))));
    }, 350);
  };

  const toques = {
    onTouchStart: (e: React.TouchEvent<HTMLElement>) => {
      gesto.current = (!activo || ocupado.current || e.currentTarget.scrollTop > 0 || e.touches.length > 1) ? null
        : { x: e.touches[0].clientX, y: e.touches[0].clientY, vertical: null, d: 0 };
    },
    onTouchMove: (e: React.TouchEvent<HTMLElement>) => {
      const g = gesto.current;
      if (!g) return;
      if (e.touches.length > 1) { gesto.current = null; mover(0, true); return; } // pellizco: no es recargar
      const dx = e.touches[0].clientX - g.x, dy = e.touches[0].clientY - g.y;
      if (g.vertical === null) {
        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) g.vertical = dy > 0 && Math.abs(dy) > Math.abs(dx) * 1.5;
        return;
      }
      if (!g.vertical) return;
      g.d = Math.max(0, Math.min(120, dy * 0.5));
      mover(g.d, false);
    },
    onTouchEnd: fin,
    onTouchCancel: fin,
  };

  const elemento = (
    <div ref={rueda} aria-hidden
         className="pointer-events-none fixed left-1/2 -ml-5 z-[70] w-10 h-10 rounded-full bg-card border border-border shadow-md flex items-center justify-center text-primary"
         style={{ top: 'max(10px, env(safe-area-inset-top, 0px))', opacity: 0, transform: `translateY(-${ESCONDIDA}px)` }}>
      <svg viewBox="0 0 24 24" width={24} height={24} className={girando ? 'animate-spin' : ''}
           style={{ animationDuration: '900ms' }}>
        <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                pathLength={100} strokeDasharray={girando ? '70 100' : '0 100'} />
      </svg>
    </div>
  );

  return { toques, rueda: elemento, girando };
}
