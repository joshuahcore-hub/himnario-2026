// Rueda vertical de opciones (nota, alteración, modo): sigue el dedo, varias opciones por gesto,
// se acomoda suave al soltar (useRueda). Las opciones deshabilitadas se ven vacías y se saltan.
import { useRueda, estiloOpcion } from '@/hooks/useRueda';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;

interface ScrollWheelProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: string;
  /** Opciones que no se pueden elegir (se muestran vacías y se saltan). */
  disabled?: (index: number) => boolean;
}

export default function ScrollWheel({ items, selectedIndex, onChange, width = 'w-12', disabled }: ScrollWheelProps) {
  const { posicion, transicion, irA, manejadores } = useRueda({
    cantidad: items.length, indice: selectedIndex, onCambio: onChange, tamano: ITEM_HEIGHT, eje: 'y', deshabilitado: disabled,
  });

  return (
    <div
      className={`relative ${width} overflow-hidden select-none`}
      style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS, touchAction: 'none', overscrollBehavior: 'none' }}
      {...manejadores}
    >
      <div style={{ transform: `translateY(${-posicion * ITEM_HEIGHT}px)`, transition: transicion, willChange: 'transform' }}>
        <div style={{ height: ITEM_HEIGHT }} />
        {items.map((item, idx) => {
          const vacio = disabled?.(idx);
          const cerca = Math.abs(idx - posicion) < 0.5;
          return (
            <div
              key={`${idx}-${item}`}
              onClick={() => { if (!vacio) irA(idx); }}
              className={`flex items-center justify-center cursor-pointer text-base text-foreground ${cerca ? 'font-bold' : 'font-normal'}`}
              style={{ height: ITEM_HEIGHT, ...estiloOpcion(idx - posicion, transicion) }}
              translate="no"
            >
              {vacio ? '' : (item || '—')}
            </div>
          );
        })}
        <div style={{ height: ITEM_HEIGHT }} />
      </div>
    </div>
  );
}
