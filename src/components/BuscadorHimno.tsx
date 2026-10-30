// (1.23.0, Josué) Buscador dentro del himno abierto (vertical y girado): lupa arriba → panel con la lista completa y
// la búsqueda arriba; tocar un himno lleva a él. Como el buscador de cantos de la minuta: sin foco automático (el
// teclado aparece solo al tocar la búsqueda), sin autocorrector, y el himno actual marcado y a la vista al abrir.
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import BotonSeguro from '@/components/BotonSeguro';
import { ConBarra } from '@/components/BarraDesplazamiento';
import { getHymns, normalizar } from '@/lib/hymnCache';
import { useAtrasCierra } from '@/lib/atras';
import { useI18n } from '@/lib/i18n/index';

export default function BuscadorHimno({ actual, onElegir, onCerrar }: {
  actual: number;
  onElegir: (numero: number) => void;
  onCerrar: () => void;
}) {
  const { t } = useI18n();
  const { hymns } = getHymns();
  const [q, setQ] = useState('');
  useAtrasCierra(true, onCerrar);

  const resultados = useMemo(() => {
    const n = normalizar(q);
    if (!n) return hymns;
    const exacto = hymns.filter(h => String(h.hymn_number) === n);
    const resto = hymns.filter(h => String(h.hymn_number) !== n && (h.search_text.includes(n) || String(h.hymn_number).startsWith(n)));
    return [...exacto, ...resto];
  }, [q, hymns]);

  // Al abrir, el himno actual queda a la vista (centrado en la lista).
  const actualRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { actualRef.current?.scrollIntoView({ block: 'center' }); }, []);
  // El click que llega tras el toque de la lupa caía en la búsqueda (está justo debajo) y abría el teclado solo:
  // el panel no recibe toques durante su aparición.
  const [listo, setListo] = useState(false);
  useEffect(() => { const t = setTimeout(() => setListo(true), 350); return () => clearTimeout(t); }, []);

  // En el body (portal): dentro del himno quedaba bajo la barra de pestañas (el himno vertical es una capa z-40).
  return createPortal(
    // z-[70]: por encima del himno girado (z-[55]) y de la barra de pestañas (z-50).
    <div className="fixed inset-0 z-[70] bg-background flex flex-col animate-in fade-in duration-150"
         style={{ paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)', pointerEvents: listo ? 'auto' : 'none' }}>
      <div className="flex items-center gap-2 px-4 pb-3 border-b border-border"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t.hymnal_search_placeholder}
            className="pl-9 h-10 text-sm"
            inputMode="search"
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
          />
        </div>
        <BotonSeguro onClick={onCerrar} className="tap-btn p-2 text-muted-foreground" aria-label={t.minutas_cancel}>
          <X size={20} />
        </BotonSeguro>
      </div>
      <div className="relative flex-1 min-h-0">
      <ConBarra>{ref => (
      <div ref={ref} className="h-full overflow-y-auto scrollbar-hide px-3 pt-2 pb-8 space-y-0.5">
        {resultados.map(h => {
          const esActual = h.hymn_number === actual;
          return (
            <button
              key={h.id}
              ref={esActual ? actualRef : undefined}
              type="button"
              onClick={() => onElegir(h.hymn_number)}
              className={`flex items-center gap-2 py-2.5 px-2 rounded-lg w-full text-left ${esActual ? 'bg-primary/10' : ''}`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <span className="text-hymn-number font-semibold text-xs w-7 shrink-0 text-center">{h.hymn_number}</span>
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-sm font-medium">{h.title}</span>
                {h.first_line && <p className="text-muted-foreground text-[11px] truncate italic">{h.first_line}</p>}
              </div>
              {h.key && <span translate="no" className="text-hymn-key font-semibold text-xs w-7 text-center">{h.key}</span>}
            </button>
          );
        })}
      </div>
      )}</ConBarra>
      </div>
    </div>,
    document.body,
  );
}
