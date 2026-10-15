import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { getHymns, preloadHymnImageBoth, normalizar } from '@/lib/hymnCache';
import {
  getFilters, setFilters as saveFilters,
  getScrollTop, setScrollTop as saveScrollTop,
  setFilteredNumbers,
  type TempoFilter,
} from '@/lib/hymnalState';
import { FAST_HYMNS } from '@/lib/hymnConstants';
import { useI18n } from '@/lib/i18n/index';
import TonalityPicker from '@/components/TonalityPicker';
import TempoPicker from '@/components/TempoPicker';
import BotonSeguro from '@/components/BotonSeguro';

function keyMatchesFilter(hymnKey: string, filterKey: string): boolean {
  return hymnKey.toUpperCase() === filterKey.toUpperCase();
}

export default function HymnalPage() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const persisted = getFilters();
  const [search, setSearch] = useState(persisted.search);
  const [selectedKey, setSelectedKey] = useState<string | null>(persisted.selectedKey);
  const [selectedTempo, setSelectedTempo] = useState<TempoFilter>(persisted.selectedTempo);
  const [showFilters, setShowFilters] = useState(false);

  const { hymns, ready } = getHymns();

  useEffect(() => {
    if (hymns.length > 0) {
      hymns.slice(0, 20).forEach(h => preloadHymnImageBoth(h.hymn_number));
    }
  }, [hymns]);

  useEffect(() => {
    saveFilters(selectedKey, selectedTempo, search);
  }, [selectedKey, selectedTempo, search]);

  const filtered = useMemo(() => {
    let list = hymns;

    if (selectedKey) {
      list = list.filter(h => h.key && keyMatchesFilter(h.key, selectedKey));
    }

    if (selectedTempo === 'fast') {
      list = list.filter(h => FAST_HYMNS.has(h.hymn_number));
    } else if (selectedTempo === 'slow') {
      list = list.filter(h => !FAST_HYMNS.has(h.hymn_number));
    }

    const q = normalizar(search);
    if (q) {
      list = list.filter(h =>
        h.hymn_number.toString() === q ||
        h.search_text.includes(q) ||
        (h.key && h.key.toLowerCase() === q)
      );
    }

    return list;
  }, [hymns, search, selectedKey, selectedTempo]);

  useEffect(() => {
    setFilteredNumbers(filtered.map(h => h.hymn_number));
  }, [filtered]);

  // Vuelve justo donde estaba (Josué, 1.7.6): la posición se guarda al desplazar (no solo al abrir un himno), así
  // que ir a Minutas o Crear y volver la conserva. useLayoutEffect: se pone ANTES de dibujar, sin verse arriba primero.
  useLayoutEffect(() => {
    const savedScroll = getScrollTop();
    if (savedScroll > 0 && scrollRef.current) scrollRef.current.scrollTop = savedScroll;
  }, [ready]);

  const [tappedId, setTappedId] = useState<string | null>(null);

  const handleClick = useCallback((hymnNumber: number, id: string) => {
    if (scrollRef.current) {
      saveScrollTop(scrollRef.current.scrollTop);
    }
    preloadHymnImageBoth(hymnNumber);
    setTappedId(id);
    requestAnimationFrame(() => {
      setTimeout(() => navigate(`/hymnal/${hymnNumber}`), 80);
    });
  }, [navigate]);

  const handleFilterTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowFilters(prev => !prev);
  }, []);

  const handleTonalityChange = useCallback((key: string | null) => {
    setSelectedKey(key);
  }, []);

  const tempoLabels: Record<string, string> = {
    all: t.hymnal_tempo_all,
    fast: t.hymnal_tempo_fast,
    slow: t.hymnal_tempo_slow,
  };

  if (!ready) {
    return (
      <div className="px-5 pt-4 pb-4">
        <h1 className="text-xl font-bold text-foreground mb-4">{t.hymnal_title}</h1>
        <p className="text-muted-foreground animate-pulse text-center py-10 text-sm">{t.hymnal_loading}</p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={e => saveScrollTop(e.currentTarget.scrollTop)}
      className="px-5 pt-4 pb-4 overflow-y-auto"
      style={{ height: 'calc(100dvh - var(--barra))' }}
    >
      {/* Computador: más abierto que el celular pero sin llegar a los bordes (max-w-3xl) y la lista en 2 columnas. */}
      <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-bold text-foreground mb-3">{t.hymnal_title}</h1>

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.hymnal_search_placeholder}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs"
          />
        </div>
        <BotonSeguro
          onClick={handleFilterTap}
          className={`tap-btn h-10 w-10 flex items-center justify-center rounded-md border transition-colors shrink-0 ${
            selectedKey || selectedTempo !== 'all' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border text-muted-foreground'
          }`}
        >
          <SlidersHorizontal size={16} />
        </BotonSeguro>
      </div>

      {showFilters && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-150"
          onClick={() => setShowFilters(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border p-5 w-[calc(100%-2.5rem)] max-w-sm shadow-xl max-h-[85vh] overflow-y-auto animate-in zoom-in-95 fade-in duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-semibold text-sm">{t.hymnal_filters}</h3>
              <BotonSeguro onClick={() => setShowFilters(false)} className="text-muted-foreground p-1">
                <X size={18} />
              </BotonSeguro>
            </div>

            {/* Tempo picker */}
            <p className="text-[11px] text-muted-foreground font-medium mb-2">{t.hymnal_tempo}</p>
            <div className="mb-5">
              <TempoPicker value={selectedTempo} onChange={setSelectedTempo} />
            </div>

            {/* Tonality picker */}
            <p className="text-[11px] text-muted-foreground font-medium mb-2">
              {t.hymnal_key_major.split(' ')[0] === 'Tonalidad' ? 'Tonalidad' : 'Key'}
            </p>
            <TonalityPicker
              selectedKey={selectedKey}
              onChange={handleTonalityChange}
            />
          </div>
        </div>
      )}

      {(selectedKey || selectedTempo !== 'all') && !showFilters && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {selectedTempo !== 'all' && (
            <BotonSeguro
              onClick={() => setSelectedTempo('all')}
              className="tap-btn flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1 rounded-full"
            >
              {tempoLabels[selectedTempo]}
              <span className="text-primary/60">{filtered.length}</span>
              <X size={10} />
            </BotonSeguro>
          )}
          {selectedKey && (
            <BotonSeguro
              onClick={() => setSelectedKey(null)}
              className="tap-btn flex items-center gap-1 bg-primary/10 text-primary text-[11px] font-semibold px-2.5 py-1 rounded-full"
            >
              <span translate="no">{selectedKey}</span>
              <span className="text-primary/60">{filtered.length}</span>
              <X size={10} />
            </BotonSeguro>
          )}
        </div>
      )}

      <div className="space-y-0.5 md:space-y-0 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-0.5">
        {filtered.map(h => (
          <button
            key={h.id}
            onClick={() => handleClick(h.hymn_number, h.id)}
            className={`tap-btn flex items-center gap-2 py-2 px-2.5 rounded-lg transition-colors duration-100 w-full text-left ${
              tappedId === h.id ? 'bg-accent' : ''
            }`}
          >
            <span className="text-hymn-number font-semibold text-xs w-5 shrink-0 text-center">
              {h.hymn_number}
            </span>
            <div className="flex-1 min-w-0">
              <span className="text-foreground text-xs font-medium">{h.title}</span>
              {h.first_line && (
                <p className="text-muted-foreground text-[11px] truncate italic">{h.first_line}</p>
              )}
            </div>
            {h.key && (
              <span translate="no" className="text-hymn-key font-semibold text-xs w-7 shrink-0 text-center">{h.key}</span>
            )}
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="text-muted-foreground text-xs text-center py-8">
            {t.hymnal_no_results}
          </p>
        )}
      </div>
      </div>
    </div>
  );
}
