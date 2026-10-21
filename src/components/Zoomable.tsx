// Contenedor con zoom: pellizcar con dos dedos o doble toque amplía TODO su contenido como una sola imagen;
// ampliado, se puede mover con un dedo. Sin zoom, deja pasar el deslizamiento horizontal (cambiar de canto).
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

export type EstadoZoom = { escala: number; x: number; y: number };

export default function Zoomable({ children, className = '', reiniciarCon, onAmpliado, activo = true, inicial, onCambio }: {
  /** (1.21.0) false = sin zoom ni gestos (vuelve a 1). La lista del himnario lo activa con su botón "Z". */
  activo?: boolean;
  /** (1.21.1) Zoom con que aparece (la lista del himnario lo recupera al volver de un himno). */
  inicial?: EstadoZoom;
  /** (1.21.1) Avisa cada cambio de zoom/posición (para guardarlo). */
  onCambio?: (e: EstadoZoom) => void;
  /** (1.17.2) Avisa si está ampliado (para usar la imagen nítida). */
  onAmpliado?: (ampliado: boolean) => void;
  children: ReactNode;
  className?: string;
  /** Cuando cambia este valor (p. ej. el canto mostrado) el zoom vuelve a 1. */
  reiniciarCon?: unknown;
}) {
  const contenedor = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(inicial?.escala ?? 1);
  const [mover, setMover] = useState({ x: inicial?.x ?? 0, y: inicial?.y ?? 0 });
  const pellizco = useRef<{ distancia: number; escala: number } | null>(null);
  const arrastre = useRef<{ x: number; y: number } | null>(null);
  const [gesto, setGesto] = useState(false);

  // Al aparecer conserva `inicial`; vuelve a 1 solo cuando CAMBIA reiniciarCon o activo.
  const primera = useRef(true);
  useEffect(() => {
    if (primera.current) { primera.current = false; return; }
    setEscala(1); setMover({ x: 0, y: 0 });
  }, [reiniciarCon, activo]);
  useEffect(() => { onCambio?.({ escala, x: mover.x, y: mover.y }); }, [escala, mover]); // eslint-disable-line react-hooks/exhaustive-deps
  const ampliado = escala > 1.15;
  useEffect(() => { onAmpliado?.(ampliado); }, [ampliado]); // eslint-disable-line react-hooks/exhaustive-deps

  const limitar = useCallback((x: number, y: number, s: number) => {
    const el = contenedor.current;
    if (!el || s <= 1) return { x: 0, y: 0 };
    const maxX = (el.clientWidth * (s - 1)) / 2;
    const maxY = (el.clientHeight * (s - 1)) / 2;
    return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
  }, []);

  const distancia = (a: React.Touch, b: React.Touch) => Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);

  const alTocar = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      pellizco.current = { distancia: distancia(e.touches[0], e.touches[1]), escala };
      setGesto(true);
    } else if (e.touches.length === 1 && escala > 1) {
      e.stopPropagation();
      arrastre.current = { x: e.touches[0].clientX - mover.x, y: e.touches[0].clientY - mover.y };
      setGesto(true);
    }
  };

  const alMover = (e: React.TouchEvent) => {
    if (pellizco.current && e.touches.length === 2) {
      e.stopPropagation();
      const s = Math.min(4, Math.max(1, pellizco.current.escala * (distancia(e.touches[0], e.touches[1]) / pellizco.current.distancia)));
      setEscala(s);
      setMover(m => limitar(m.x, m.y, s));
    } else if (arrastre.current && e.touches.length === 1 && escala > 1) {
      e.stopPropagation();
      setMover(limitar(e.touches[0].clientX - arrastre.current.x, e.touches[0].clientY - arrastre.current.y, escala));
    }
  };

  const alSoltar = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pellizco.current = null;
    if (e.touches.length === 0) {
      arrastre.current = null;
      setGesto(false);
      if (escala <= 1.05) { setEscala(1); setMover({ x: 0, y: 0 }); }
    }
  };

  const dobleToque = () => {
    if (escala > 1) { setEscala(1); setMover({ x: 0, y: 0 }); } else setEscala(2.5);
  };

  return (
    <div
      ref={contenedor}
      className={`overflow-hidden ${className}`}
      style={{ touchAction: escala > 1 ? 'none' : 'pan-y' }}
      onTouchStart={activo ? alTocar : undefined}
      onTouchMove={activo ? alMover : undefined}
      onTouchEnd={activo ? alSoltar : undefined}
      onDoubleClick={activo ? dobleToque : undefined}
    >
      <div
        className="h-full w-full"
        style={{
          transform: `translate(${mover.x}px, ${mover.y}px) scale(${escala})`,
          transformOrigin: 'center center',
          transition: gesto ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
