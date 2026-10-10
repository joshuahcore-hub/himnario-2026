import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Check, Link2, Loader2, Plus, Search, Unlink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { MinutaData, ParsedSong } from '@/lib/types';
import { getHymns, normalizar } from '@/lib/hymnCache';
import { cantoDesdeHimno, esMarcador, ORACION, PALABRA, renumerar } from '@/lib/minutaUtils';
import { getMinuta, guardarMinutaLocal } from '@/lib/minutaCache';
import { api, ErrorDeRed } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Datos con los que se puede abrir el editor desde otra pantalla (p. ej. la minuta generada por IA). */
export interface BorradorMinuta {
  titulo?: string;
  fecha?: string;
  cantos: ParsedSong[];
  textoOriginal?: string;
}

/** Buscador para añadir cantos: tocar uno lo marca (queda en verde); tocarlo de nuevo lo desmarca y lo quita. */
function BuscadorCantos({ onAdd, onRemove, onClose, seleccionados }: {
  onAdd: (c: ParsedSong) => void;
  onRemove: (hymnNumber: number) => void;
  onClose: () => void;
  seleccionados: number[];
}) {
  const { t } = useI18n();
  const { hymns } = getHymns();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const marcados = new Set(seleccionados);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const resultados = useMemo(() => {
    const n = normalizar(q);
    if (!n) return hymns;
    const exacto = hymns.filter(h => String(h.hymn_number) === n);
    const resto = hymns.filter(h => String(h.hymn_number) !== n && (h.search_text.includes(n) || String(h.hymn_number).startsWith(n)));
    return [...exacto, ...resto];
  }, [q, hymns]);

  return (
    // z-[60]: por encima de la barra de pestañas de abajo (z-50), que si no tapa el botón "Listo".
    <div className="fixed inset-0 z-[60] bg-background flex flex-col animate-in fade-in duration-150">
      <div className="flex items-center gap-2 px-4 pb-3 border-b border-border"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t.hymnal_search_placeholder}
            className="pl-9 h-10 text-sm"
            inputMode="search"
          />
        </div>
        <button onClick={onClose} className="tap-btn p-2 text-muted-foreground" aria-label={t.minutas_cancel}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-28 space-y-0.5">
        {resultados.map(h => {
          const marcado = marcados.has(h.hymn_number);
          return (
            <button
              key={h.id}
              onClick={() => (marcado ? onRemove(h.hymn_number) : onAdd(cantoDesdeHimno(h)))}
              aria-pressed={marcado}
              className={`tap-btn flex items-center gap-2 py-2.5 px-2 rounded-lg w-full text-left transition-colors ${
                marcado ? 'bg-green-600/15 ring-1 ring-green-600/40' : 'active:bg-accent'
              }`}
            >
              <span className="text-hymn-number font-semibold text-xs w-7 shrink-0 text-center">{h.hymn_number}</span>
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-sm font-medium">{h.title}</span>
                {h.first_line && <p className="text-muted-foreground text-[11px] truncate italic">{h.first_line}</p>}
              </div>
              {h.key && <span translate="no" className="text-hymn-key font-semibold text-xs w-7 text-center">{h.key}</span>}
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                marcado ? 'bg-green-600 text-white' : 'bg-primary/10 text-primary'
              }`}>
                {marcado ? <Check size={14} /> : <Plus size={14} />}
              </span>
            </button>
          );
        })}
        {resultados.length === 0 && <p className="text-muted-foreground text-xs text-center py-8">{t.hymnal_no_results}</p>}
      </div>
      {/* "Listo" flotando abajo, al alcance del pulgar */}
      <div className="absolute left-0 right-0 bottom-0 px-5 pt-6 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none"
           style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        <Button onClick={onClose} className="w-full h-12 text-base gap-2 shadow-lg pointer-events-auto rounded-xl">
          <Check size={18} />
          {t.editor_done}{seleccionados.length > 0 ? ` (${seleccionados.length})` : ''}
        </Button>
      </div>
    </div>
  );
}

export default function EditorMinuta() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { puedeEditar } = useAcceso();
  const borrador = (location.state as { borrador?: BorradorMinuta } | null)?.borrador;
  const existente: MinutaData | undefined = id ? getMinuta(id) : undefined;

  const [titulo, setTitulo] = useState(existente?.titulo ?? borrador?.titulo ?? '');
  const [fecha, setFecha] = useState(existente?.fecha ?? borrador?.fecha ?? hoy());
  const [cantos, setCantos] = useState<ParsedSong[]>(existente?.cantos ?? borrador?.cantos ?? []);
  const [buscando, setBuscando] = useState(false);
  // Posición de la lista desde donde empiezan los cantos añadidos en la búsqueda abierta (se pueden desmarcar ahí mismo).
  const [inicioBusqueda, setInicioBusqueda] = useState(0);
  const [guardando, setGuardando] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);

  const numerados = renumerar(cantos);

  if (!puedeEditar) {
    return (
      <div className="flex flex-col items-center justify-center px-6 text-center gap-3" style={{ height: 'calc(100vh - 4rem)' }}>
        <p className="text-sm text-muted-foreground">{t.editor_no_access}</p>
        <Button variant="outline" onClick={() => navigate('/settings')}>{t.tab_settings}</Button>
      </div>
    );
  }
  if (id && !existente) {
    return (
      <div className="flex items-center justify-center px-6 text-center" style={{ height: 'calc(100vh - 4rem)' }}>
        <p className="text-sm text-muted-foreground">{t.minuta_not_found}</p>
      </div>
    );
  }

  const agregar = (c: ParsedSong) => {
    setCantos(prev => [...prev, c]);
    setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const mover = (i: number, d: -1 | 1) => setCantos(prev => {
    const j = i + d;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });

  const quitar = (i: number) => setCantos(prev => prev.filter((_, k) => k !== i));

  const seleccionadosEnBusqueda = cantos.slice(inicioBusqueda).flatMap(c => (c.hymnNumber ? [c.hymnNumber] : []));

  const desmarcar = (hymnNumber: number) => setCantos(prev => {
    for (let k = prev.length - 1; k >= inicioBusqueda; k--) {
      if (prev[k].hymnNumber === hymnNumber) return prev.filter((_, j) => j !== k);
    }
    return prev;
  });

  const puedeAgrupar = (i: number) =>
    !esMarcador(cantos[i]) && !cantos[i].groupedWith && i + 1 < cantos.length &&
    !esMarcador(cantos[i + 1]) && !cantos[i + 1].groupedWith;

  const agrupar = (i: number) => setCantos(prev => {
    const next = [...prev];
    next[i] = { ...next[i], groupedWith: { ...next[i + 1], position: 0 } };
    next.splice(i + 1, 1);
    return next;
  });

  const separar = (i: number) => setCantos(prev => {
    const next = [...prev];
    const { groupedWith, ...principal } = next[i];
    next.splice(i, 1, { ...principal, groupedWith: null }, { ...groupedWith!, groupedWith: null });
    return next;
  });

  const guardar = async () => {
    if (cantos.length === 0) { toast.error(t.editor_empty); return; }
    setGuardando(true);
    const datos = {
      titulo: titulo.trim() || 'Minuta',
      fecha,
      cantos: renumerar(cantos),
      ...(borrador?.textoOriginal && !id ? { texto_original: borrador.textoOriginal } : {}),
    };
    try {
      const m = id
        ? await api<MinutaData>(`minutas/${id}`, { metodo: 'PATCH', datos })
        : await api<MinutaData>('minutas', { metodo: 'POST', datos });
      guardarMinutaLocal(m);
      toast.success(t.create_saved);
      navigate(`/minuta/${m.id}`, { replace: true });
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : (e.message || t.create_error_save));
    } finally {
      setGuardando(false);
    }
  };

  const filaCanto = (c: ParsedSong, pos: number) => (
    <div className="flex items-baseline gap-1.5 min-w-0">
      <span className="text-muted-foreground text-xs font-medium w-5 shrink-0 text-right">{pos}</span>
      <span className="text-foreground text-sm font-medium truncate">{c.title}</span>
      {c.key && <span translate="no" className="text-hymn-key text-xs font-semibold shrink-0">{c.key}</span>}
      {c.hymnNumber && <span className="text-hymn-number text-xs shrink-0">#{c.hymnNumber}</span>}
      {c.found === false && <span className="text-destructive text-[10px] italic shrink-0">{t.portada_not_found}</span>}
    </div>
  );

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 4rem)' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{id ? t.editor_title_edit : t.create_title}</h1>
        {id && (
          <button onClick={() => navigate(-1)} className="text-muted-foreground p-1.5" aria-label={t.minutas_cancel}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={t.editor_title_placeholder} className="h-10 text-sm" maxLength={80} />
          <Input type="date" value={fecha} onChange={e => e.target.value && setFecha(e.target.value)} className="h-10 text-sm w-[150px]" />
        </div>

        <div className="space-y-1.5">
          {numerados.map((c, i) => (
            <div key={i} className={`flex items-center gap-1 rounded-lg border px-2 py-1.5 ${
              c.found === false ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'
            }`}>
              <div className="flex-1 min-w-0">
                {c.isPalabra ? (
                  <span className="text-palabra text-sm font-semibold pl-6">{t.portada_palabra}</span>
                ) : c.isOracion ? (
                  <span className="text-oracion text-sm font-semibold pl-6">{t.portada_oracion}</span>
                ) : (
                  <>
                    {filaCanto(c, c.position)}
                    {c.groupedWith && <div className="border-l-2 border-border ml-2 pl-1">{filaCanto(c.groupedWith, c.position + 1)}</div>}
                  </>
                )}
              </div>
              {c.groupedWith ? (
                <button onClick={() => separar(i)} className="tap-btn p-1.5 text-muted-foreground" aria-label={t.editor_ungroup}><Unlink size={14} /></button>
              ) : puedeAgrupar(i) ? (
                <button onClick={() => agrupar(i)} className="tap-btn p-1.5 text-muted-foreground" aria-label={t.editor_group}><Link2 size={14} /></button>
              ) : null}
              <button onClick={() => mover(i, -1)} disabled={i === 0} className="tap-btn p-1.5 text-muted-foreground disabled:opacity-20" aria-label={t.editor_up}><ArrowUp size={14} /></button>
              <button onClick={() => mover(i, 1)} disabled={i === cantos.length - 1} className="tap-btn p-1.5 text-muted-foreground disabled:opacity-20" aria-label={t.editor_down}><ArrowDown size={14} /></button>
              <button onClick={() => quitar(i)} className="tap-btn p-1.5 text-muted-foreground hover:text-destructive" aria-label={t.minutas_delete}><X size={14} /></button>
            </div>
          ))}
          {cantos.length === 0 && <p className="text-muted-foreground text-xs text-center py-6">{t.editor_empty_hint}</p>}
          <div ref={finRef} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => { setInicioBusqueda(cantos.length); setBuscando(true); }} className="gap-1 text-xs h-10">
            <Plus size={14} />{t.editor_add_song}
          </Button>
          <Button variant="outline" onClick={() => agregar({ ...PALABRA })} className="text-xs h-10 text-palabra">{t.portada_palabra}</Button>
          <Button variant="outline" onClick={() => agregar({ ...ORACION })} className="text-xs h-10 text-oracion">{t.portada_oracion}</Button>
        </div>
        {cantos.length > 1 && <p className="text-[10px] text-muted-foreground/70 text-center">{t.editor_group_hint}</p>}
      </div>

      <div className="px-5 py-3 border-t border-border bg-background">
        <Button onClick={guardar} disabled={guardando || cantos.length === 0} className="w-full h-12 text-base gap-2">
          {guardando ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
          {guardando ? t.create_saving : t.minutas_save}
        </Button>
      </div>

      {buscando && (
        <BuscadorCantos
          seleccionados={seleccionadosEnBusqueda}
          onAdd={agregar}
          onRemove={desmarcar}
          onClose={() => setBuscando(false)}
        />
      )}
    </div>
  );
}
