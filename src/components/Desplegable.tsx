// Selector que despliega sus opciones hacia abajo (no cambia al tocarlo: se elige de la lista).
// Tocar fuera lo cierra sin cambiar nada.
import { ReactNode, useCallback, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';

export interface OpcionDesplegable<T extends string> {
  valor: T;
  etiqueta: string;
  icono?: ReactNode;
}

export default function Desplegable<T extends string>({ titulo, icono, valor, opciones, onElegir }: {
  titulo: string;
  icono?: ReactNode;
  valor: T;
  opciones: OpcionDesplegable<T>[];
  onElegir: (valor: T) => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  useAlTocarFuera(caja, abierto, useCallback(() => setAbierto(false), []));
  const actual = opciones.find(o => o.valor === valor);

  return (
    <div ref={caja} className="relative bg-card rounded-xl border border-border p-3">
      <div className="flex items-center gap-1.5 mb-2">
        {icono}
        <span className="text-xs font-medium text-foreground">{titulo}</span>
      </div>
      <button
        type="button"
        onClick={() => setAbierto(a => !a)}
        className="tap-btn w-full flex items-center justify-between gap-1 rounded-lg bg-muted px-3 py-2 text-xs font-semibold text-foreground"
        aria-expanded={abierto}
      >
        <span className="flex items-center gap-1.5 truncate">{actual?.icono}{actual?.etiqueta}</span>
        <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div className="absolute left-0 right-0 top-full mt-1 z-30 rounded-xl border border-border bg-card shadow-lg p-1 animate-in fade-in slide-in-from-top-1 duration-150">
          {opciones.map(o => (
            <button
              key={o.valor}
              type="button"
              onClick={() => { setAbierto(false); if (o.valor !== valor) onElegir(o.valor); }}
              className={`tap-btn w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-xs ${
                o.valor === valor ? 'bg-muted font-semibold text-foreground' : 'text-foreground hover:bg-accent'
              }`}
            >
              <span className="flex items-center gap-1.5">{o.icono}{o.etiqueta}</span>
              {o.valor === valor && <Check size={14} className="text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
