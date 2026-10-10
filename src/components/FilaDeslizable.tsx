// Fila que se borra deslizándola hacia cualquier lado: sigue el dedo, deja ver un fondo rojo con el
// basurero y, si se desliza lo suficiente, sale de la pantalla y la fila se cierra suavemente.
// Si se suelta antes, vuelve a su lugar.
import { ReactNode, useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';

const SALIDA_MS = 180;
const CIERRE_MS = 170;

export default function FilaDeslizable({ children, onBorrar }: { children: ReactNode; onBorrar: () => void }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const [dx, setDx] = useState(0);
  const [suave, setSuave] = useState(false);
  const [alto, setAlto] = useState<number | null>(null);
  const [cerrando, setCerrando] = useState(false);

  const alTocar = (e: React.TouchEvent) => {
    if (cerrando) return;
    toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, horizontal: null };
  };

  const alMover = (e: React.TouchEvent) => {
    const t = toque.current;
    if (!t) return;
    const mx = e.touches[0].clientX - t.x;
    const my = e.touches[0].clientY - t.y;
    if (t.horizontal === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) t.horizontal = Math.abs(mx) > Math.abs(my);
    if (t.horizontal) {
      setSuave(false);
      setDx(mx);
    }
  };

  const alSoltar = () => {
    const t = toque.current;
    toque.current = null;
    if (!t?.horizontal) return;
    const ancho = contenedor.current?.offsetWidth ?? 320;
    setSuave(true);
    if (Math.abs(dx) > Math.max(80, ancho * 0.35)) {
      // Sale hacia el lado deslizado, luego la fila se cierra y se borra.
      setDx(Math.sign(dx) * ancho * 1.1);
      setTimeout(() => {
        setAlto(contenedor.current?.offsetHeight ?? 0);
        setTimeout(() => setCerrando(true), 20);
        setTimeout(onBorrar, 20 + CIERRE_MS);
      }, SALIDA_MS);
    } else {
      setDx(0);
    }
  };

  const progreso = Math.min(1, Math.abs(dx) / 120);

  return (
    <div
      ref={contenedor}
      className="relative overflow-hidden pb-1.5"
      style={
        alto === null
          ? undefined
          : {
              height: cerrando ? 0 : alto,
              paddingBottom: cerrando ? 0 : undefined,
              opacity: cerrando ? 0 : 1,
              transition: `height ${CIERRE_MS}ms ease-out, padding ${CIERRE_MS}ms ease-out, opacity ${CIERRE_MS}ms ease-out`,
            }
      }
    >
      {/* Fondo rojo con el basurero, se ve al deslizar */}
      <div
        className="absolute inset-x-0 top-0 bottom-1.5 rounded-lg bg-destructive/80 flex items-center px-4 text-white"
        style={{ justifyContent: dx < 0 ? 'flex-end' : 'flex-start', opacity: progreso }}
        aria-hidden="true"
      >
        <Trash2 size={18} />
      </div>
      <div
        className="relative"
        style={{
          transform: `translateX(${dx}px)`,
          transition: suave ? `transform ${SALIDA_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
          touchAction: 'pan-y',
        }}
        onTouchStart={alTocar}
        onTouchMove={alMover}
        onTouchEnd={alSoltar}
        onTouchCancel={alSoltar}
      >
        {children}
      </div>
    </div>
  );
}
