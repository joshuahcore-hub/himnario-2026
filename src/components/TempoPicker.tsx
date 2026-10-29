// Rueda horizontal de tempo (Todas / Lentas / Rápidas): misma animación que las ruedas de tonalidad
// (sigue el dedo, varias opciones por gesto, se acomoda suave al soltar; useRueda).
import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n/index';
import type { TempoFilter } from '@/lib/hymnalState';
import { useRueda, estiloOpcion } from '@/hooks/useRueda';

interface TempoPickerProps {
  value: TempoFilter;
  onChange: (value: TempoFilter) => void;
}

const OPTIONS: TempoFilter[] = ['all', 'slow', 'fast'];
const ITEM_WIDTH = 110;

export default function TempoPicker({ value, onChange }: TempoPickerProps) {
  const { t } = useI18n();
  const contenedor = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  useLayoutEffect(() => { setAncho(contenedor.current?.clientWidth ?? 0); }, []);

  const labels: Record<TempoFilter, string> = {
    all: t.hymnal_tempo_all,
    slow: t.hymnal_tempo_slow,
    fast: t.hymnal_tempo_fast,
  };

  const { posicion, transicion, irA, manejadores } = useRueda({
    cantidad: OPTIONS.length,
    indice: OPTIONS.indexOf(value),
    onCambio: i => onChange(OPTIONS[i]),
    tamano: ITEM_WIDTH,
    eje: 'x',
  });

  // Línea fina, tenue y de color sólido (termina en seco, sin degradado): 1px escalado a 0.5px.
  const linea = { background: 'hsl(var(--foreground) / 0.14)', transform: 'scaleY(0.5)' };

  return (
    <div ref={contenedor} className="relative w-full overflow-hidden select-none" style={{ touchAction: 'pan-y' }} {...manejadores}>
      <div className="h-px" style={linea} />
      <div
        className="flex items-center"
        style={{
          transform: `translateX(${ancho / 2 - ITEM_WIDTH / 2 - posicion * ITEM_WIDTH}px)`,
          transition: transicion,
          willChange: 'transform',
        }}
      >
        {OPTIONS.map((op, i) => (
          <button
            key={op}
            type="button"
            onClick={() => irA(i)}
            className={`shrink-0 py-3 text-base text-foreground ${Math.abs(i - posicion) < 0.5 ? 'font-bold' : 'font-normal'}`}
            style={{ width: ITEM_WIDTH, ...estiloOpcion(i - posicion, transicion) }}
          >
            {labels[op]}
          </button>
        ))}
      </div>
      <div className="h-px" style={linea} />
    </div>
  );
}
