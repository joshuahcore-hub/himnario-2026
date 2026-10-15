import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, Check, Globe, Link2, Loader2, Plus, Search, Unlink, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SelectorFecha from '@/components/SelectorFecha';
import FilaDeslizable from '@/components/FilaDeslizable';
import { useReordenar } from '@/hooks/useReordenar';
import { useSalidaProtegida } from '@/hooks/useSalidaProtegida';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { MinutaData, ParsedSong } from '@/lib/types';
import { getHymns, normalizar } from '@/lib/hymnCache';
import { cantoDesdeHimno, esMarcador, ORACION, PALABRA, renumerar } from '@/lib/minutaUtils';
import { getMinuta, guardarMinutaLocal, marcarParaEnfocar } from '@/lib/minutaCache';
import { api, ErrorDeRed } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';
import PanelIA, { useEstadoIA } from '@/components/PanelIA';
import type { LecturaMinuta } from '@/lib/leerMinuta';

function hoy(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Canto en el editor, con una clave propia (solo en pantalla, no se guarda) para animar cada fila. */
type Fila = ParsedSong & { _k?: number };
let ultimaClave = 0;
const conClave = (c: ParsedSong): Fila => ({ ...c, _k: ++ultimaClave });
function sinClave({ _k, ...c }: Fila): ParsedSong {
  return c.groupedWith ? { ...c, groupedWith: sinClave(c.groupedWith as Fila) } : c;
}

/** Datos con los que se puede abrir el editor desde otra pantalla (p. ej. la minuta generada por IA). */
export interface BorradorMinuta {
  titulo?: string;
  fecha?: string;
  cantos: ParsedSong[];
  textoOriginal?: string;
}

/** Buscador para añadir cantos: tocar uno lo marca (queda en verde); tocarlo de nuevo lo desmarca y lo quita. */
/** Duración del cambio a verde al marcar un canto en el buscador. */
const MARCAR_MS = 180;

function BuscadorCantos({ onAdd, onRemove, onClose, onCancel, seleccionados }: {
  onAdd: (c: ParsedSong) => void;
  onRemove: (hymnNumber: number) => void;
  onClose: () => void;
  /** Salir sin "Listo": se descarta lo marcado en esta búsqueda. */
  onCancel: () => void;
  seleccionados: number[];
}) {
  const { t } = useI18n();
  const { hymns } = getHymns();
  const [q, setQ] = useState('');
  const marcados = new Set(seleccionados);

  // Sin foco automático: se abre con la lista completa; el teclado aparece solo al tocar la búsqueda.

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
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t.hymnal_search_placeholder}
            className="pl-9 h-10 text-sm"
            inputMode="search"
          />
        </div>
        <button onClick={onCancel} className="tap-btn p-2 text-muted-foreground" aria-label={t.minutas_cancel}>
          <X size={20} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pt-2 pb-28 space-y-0.5">
        {resultados.map(h => {
          const marcado = marcados.has(h.hymn_number);
          return (
            // Marcar = UN solo cambio suave (Josué notaba "dos estados": el gris del toque y luego el verde, con el
            // borde apareciendo de golpe). Sin gris al tocar; fondo, borde, círculo e ícono cambian juntos en 180 ms.
            <button
              key={h.id}
              onClick={() => (marcado ? onRemove(h.hymn_number) : onAdd(cantoDesdeHimno(h)))}
              aria-pressed={marcado}
              className="flex items-center gap-2 py-2.5 px-2 rounded-lg w-full text-left"
              style={{
                WebkitTapHighlightColor: 'transparent',
                backgroundColor: marcado ? 'rgb(22 163 74 / 0.15)' : 'transparent',
                boxShadow: marcado ? 'inset 0 0 0 1px rgb(22 163 74 / 0.4)' : 'inset 0 0 0 1px transparent',
                transition: `background-color ${MARCAR_MS}ms ease-out, box-shadow ${MARCAR_MS}ms ease-out`,
              }}
            >
              <span className="text-hymn-number font-semibold text-xs w-7 shrink-0 text-center">{h.hymn_number}</span>
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-sm font-medium">{h.title}</span>
                {h.first_line && <p className="text-muted-foreground text-[11px] truncate italic">{h.first_line}</p>}
              </div>
              {h.key && <span translate="no" className="text-hymn-key font-semibold text-xs w-7 text-center">{h.key}</span>}
              {/* Círculo: el color cambia con la misma transición y el + se funde en ✓ (los dos íconos superpuestos). */}
              <span className={`relative w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                marcado ? 'bg-green-600 text-white' : 'bg-primary/10 text-primary'
              }`} style={{ transition: `background-color ${MARCAR_MS}ms ease-out, color ${MARCAR_MS}ms ease-out` }}>
                <Plus size={14} className="absolute" style={{
                  opacity: marcado ? 0 : 1, transform: marcado ? 'scale(0.6) rotate(90deg)' : 'none',
                  transition: `opacity ${MARCAR_MS}ms ease-out, transform ${MARCAR_MS}ms ease-out`,
                }} />
                <Check size={14} className="absolute" style={{
                  opacity: marcado ? 1 : 0, transform: marcado ? 'none' : 'scale(0.6)',
                  transition: `opacity ${MARCAR_MS}ms ease-out, transform ${MARCAR_MS}ms ease-out`,
                }} />
              </span>
            </button>
          );
        })}
        {resultados.length === 0 && <p className="text-muted-foreground text-xs text-center py-8">{t.hymnal_no_results}</p>}
      </div>
      {/* "Listo" flotando abajo, al alcance del pulgar */}
      <div className="absolute left-0 right-0 bottom-0 px-5 pt-6 bg-gradient-to-t from-background via-background/90 to-transparent pointer-events-none"
           style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}>
        <Button onClick={onClose} className="mx-auto flex h-11 px-8 text-sm gap-2 shadow-lg pointer-events-auto rounded-full">
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
  const [cantos, setCantos] = useState<Fila[]>(() => (existente?.cantos ?? borrador?.cantos ?? []).map(conClave));
  const [buscando, setBuscando] = useState(false);
  // Posición de la lista desde donde empiezan los cantos añadidos en la búsqueda abierta (se pueden desmarcar ahí mismo).
  const [inicioBusqueda, setInicioBusqueda] = useState(0);
  // Lo marcado en el buscador solo queda si se toca "Listo" (Josué, 1.5.6). Con X o "atrás" se quitan las
  // alabanzas añadidas en ESTA búsqueda; las que ya estaban antes no se tocan.
  const inicioRef = useRef(0);
  inicioRef.current = inicioBusqueda;
  const cancelarBusqueda = () => { setCantos(prev => prev.slice(0, inicioRef.current)); setBuscando(false); };
  const [guardando, setGuardando] = useState<null | 'guardar' | 'publicar'>(null);
  const finRef = useRef<HTMLDivElement>(null);
  // Crear: "Manual" o desde texto/foto ("Con IA"). Lo generado vuelve a Manual para revisarlo antes de guardar.
  const [modo, setModo] = useState<'manual' | 'ia'>('manual');
  const [textoOriginal, setTextoOriginal] = useState(borrador?.textoOriginal ?? '');
  const { estado: estadoIA, revisar: revisarIA } = useEstadoIA(!id && puedeEditar);

  const numerados = renumerar(cantos) as Fila[]; // renumerar copia cada canto, conserva _k

  // ¿Hay cambios sin guardar? Se compara con cómo estaba al abrir el editor.
  const foto = () => JSON.stringify({ titulo: titulo.trim(), fecha, cantos: renumerar(cantos).map(sinClave) });
  const fotoInicial = useRef<string | null>(null);
  if (fotoInicial.current === null) fotoInicial.current = foto();
  const hayCambios = foto() !== fotoInicial.current;
  // Botones de abajo (reglas de Josué):
  //  - Crear: Guardar + Publicar, solo cuando ya hay cantos.
  //  - Editar una privada: sin cambios → solo "Publicar" (centrado); con cambios → Guardar + Publicar.
  //  - Editar una publicada: sin cambios → nada; con cambios → solo "Publicar cambios".
  const yaPublicada = !!existente?.publicada;
  const algoNuevo = hayCambios || (!id && !!borrador); // un borrador traído de otra pantalla cuenta como nuevo
  const mostrarBotonesAhora = cantos.length > 0 && (algoNuevo || (!!id && !yaPublicada));
  // Mientras el buscador está abierto la barra queda como estaba antes de abrirlo: lo marcado ahí aún no está
  // confirmado (solo cuenta con "Listo"). Si no, al volver sin "Listo" la barra asomaba un instante (Josué, 1.5.8).
  const barraAntesDeBuscar = useRef(mostrarBotonesAhora);
  if (!buscando) barraAntesDeBuscar.current = mostrarBotonesAhora;
  const mostrarBotones = buscando ? barraAntesDeBuscar.current : mostrarBotonesAhora;
  // Mientras la barra se va, los botones quedan como estaban (si no, al borrar la última alabanza "Guardar"
  // desaparecía de golpe y "Publicar" se estiraba en plena animación: se veía quebrado).
  const ultimoAlgoNuevo = useRef(algoNuevo);
  if (mostrarBotones) ultimoAlgoNuevo.current = algoNuevo;
  const guardarEnBarra = mostrarBotones ? algoNuevo : ultimoAlgoNuevo.current;
  const salida = useSalidaProtegida(hayCambios, () => {
    if (buscando) { cancelarBusqueda(); return true; } // "atrás" en el buscador: lo descarta (no se tocó "Listo")
    return false;
  });

  // Mantener presionada una fila y arrastrarla para ponerla en otro lugar.
  const reordenar = useReordenar((desde, hasta) => setCantos(prev => {
    const next = [...prev];
    const [fila] = next.splice(desde, 1);
    next.splice(hasta, 0, fila);
    return next;
  }));

  if (!puedeEditar) {
    return (
      <div className="flex flex-col items-center justify-center px-6 text-center gap-3" style={{ height: 'calc(100dvh - var(--barra))' }}>
        <p className="text-sm text-muted-foreground">{t.editor_no_access}</p>
        <Button variant="outline" onClick={() => navigate('/settings')}>{t.tab_settings}</Button>
      </div>
    );
  }
  // Solo quien creó la minuta puede editarla (también el administrador; 1.5.4). Las ajenas se duplican.
  if (id && existente && !existente.mia) {
    return (
      <div className="flex flex-col items-center justify-center px-6 text-center gap-3" style={{ height: 'calc(100dvh - var(--barra))' }}>
        <p className="text-sm text-muted-foreground">{t.minuta_not_yours}</p>
        <Button variant="outline" className="h-10 px-5 text-sm" onClick={() => navigate('/minutas')}>{t.minutas_title}</Button>
      </div>
    );
  }
  if (id && !existente) {
    return (
      <div className="flex items-center justify-center px-6 text-center" style={{ height: 'calc(100dvh - var(--barra))' }}>
        <p className="text-sm text-muted-foreground">{t.minuta_not_found}</p>
      </div>
    );
  }

  const agregar = (c: ParsedSong) => {
    setCantos(prev => [...prev, conClave(c)]);
    setTimeout(() => finRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  };

  const mover = (i: number, d: -1 | 1) => setCantos(prev => {
    const j = i + d;
    if (j < 0 || j >= prev.length) return prev;
    const next = [...prev];
    [next[i], next[j]] = [next[j], next[i]];
    return next;
  });
  // Por clave (no por posición): la fila puede borrarse al terminar su animación, cuando la lista ya cambió.
  const quitar = (clave: number) => setCantos(prev => prev.filter(c => c._k !== clave));

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
    next.splice(i, 1, { ...principal, groupedWith: null }, conClave({ ...groupedWith!, groupedWith: null }));
    return next;
  });

  // Guardar: la nueva queda privada (solo quien la crea); la existente conserva su visibilidad.
  // Publicar: guarda y la deja visible para todos.
  /** despues: hacia dónde ir tras guardar (por defecto, abrir la minuta guardada). */
  const guardar = async (publicar: boolean, despues?: () => void) => {
    if (cantos.length === 0) { toast.error(t.editor_empty); return; }
    setGuardando(publicar ? 'publicar' : 'guardar');
    // Publicar una privada sin cambios: solo cambia la visibilidad (el historial no marca "editada").
    const datos = id && publicar && !hayCambios ? { publicada: true } : {
      titulo: titulo.trim() || 'Minuta',
      fecha,
      cantos: renumerar(cantos).map(sinClave),
      ...(publicar ? { publicada: true } : id ? {} : { publicada: false }),
      ...(textoOriginal && !id ? { texto_original: textoOriginal } : {}),
    };
    try {
      const m = id
        ? await api<MinutaData>(`minutas/${id}`, { metodo: 'PATCH', datos })
        : await api<MinutaData>('minutas', { metodo: 'POST', datos });
      guardarMinutaLocal(m);
      toast.success(publicar && !yaPublicada ? t.minuta_published_toast
        : yaPublicada ? t.minuta_changes_published_toast
        : m.publicada ? t.create_saved : t.minuta_saved_private_toast);
      if (despues) despues();
      else {
        // Tras guardar NO se abre la minuta (Josué): se vuelve a la lista con esa minuta al centro; si quiere, entra.
        marcarParaEnfocar(m.id);
        const hayDondeVolver = id && ((history.state as { idx?: number } | null)?.idx ?? 0) > 0;
        salida.salirHacia(() => (hayDondeVolver ? history.back() : navigate('/minutas', { replace: true })));
      }
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : (e.message || t.create_error_save));
    } finally {
      setGuardando(null);
    }
  };

  const usarLectura = (lectura: LecturaMinuta, texto: string) => {
    setCantos(lectura.cantos.map(conClave));
    if (lectura.fecha) setFecha(lectura.fecha);
    setTextoOriginal(texto);
    setModo('manual');
    const total = lectura.cantos.filter(c => !esMarcador(c)).reduce((n, c) => n + (c.groupedWith ? 2 : 1), 0);
    // Con la conclusión que sacó la app (p. ej. la raya = Oración porque es miércoles), para revisarla.
    (lectura.noEncontrados ? toast.warning : toast.success)(t.ia_review(total, lectura.noEncontrados), {
      description: lectura.notas.map(n => t.ia_note_separator(n.cual, n.dia, n.porCantos)).join(' ') || undefined,
      duration: lectura.notas.length ? 7000 : undefined,
    });
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
    // La pantalla no se desplaza entera (como en Minutas): solo la zona de cantos, y solo si no cabe.
    // min-h-0 en la zona flex-1: sin eso crece con su contenido y empuja la pantalla completa.
    <div className="flex flex-col overflow-hidden w-full max-w-lg mx-auto" style={{ height: 'calc(100dvh - var(--barra))', overscrollBehavior: 'none' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{id ? t.editor_title_edit : t.create_title}</h1>
        {id && (
          <button onClick={salida.intentarVolver} className="text-muted-foreground p-1.5" aria-label={t.minutas_cancel}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Crear: Manual | Automático (pegar texto, sin IA; y foto, con IA, si está habilitada para esta persona) */}
      {!id && (
        <div className="px-5 pb-2">
          <div className="relative grid grid-cols-2 rounded-lg bg-muted p-1 text-xs font-medium">
            <span
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-md bg-background shadow-sm"
              style={{ transform: modo === 'ia' ? 'translateX(100%)' : 'none', transition: 'transform 220ms cubic-bezier(0.22, 1, 0.36, 1)' }}
            />
            <button onClick={() => setModo('manual')} className={`relative h-8 transition-colors ${modo === 'manual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {t.editor_mode_manual}
            </button>
            <button onClick={() => { setModo('ia'); revisarIA(); }} className={`relative h-8 transition-colors ${modo === 'ia' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {t.editor_mode_ai}
            </button>
          </div>
        </div>
      )}

      {modo === 'ia' && !id ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-4" style={{ overscrollBehavior: 'contain' }}>
          <PanelIA estado={estadoIA} onListo={usarLectura} onFallo={revisarIA} />
        </div>
      ) : <>
      {/* pt-1: deja aire arriba para que el borde de los campos no quede cortado contra la lista. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-4 space-y-4 animate-in fade-in duration-200" style={{ overscrollBehavior: 'contain' }}>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={t.editor_title_placeholder} className="h-10 text-sm" maxLength={80} />
          <SelectorFecha valor={fecha} onChange={setFecha} />
        </div>

        {/* Botones fijos arriba; lo que se agrega va apareciendo debajo, así los botones no se mueven. */}
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={() => { setInicioBusqueda(cantos.length); setBuscando(true); }} className="gap-1 text-xs h-10">
            <Plus size={14} />{t.editor_add_song}
          </Button>
          <Button variant="outline" onClick={() => agregar({ ...PALABRA })} className="text-xs h-10 text-palabra">{t.portada_palabra}</Button>
          <Button variant="outline" onClick={() => agregar({ ...ORACION })} className="text-xs h-10 text-oracion">{t.portada_oracion}</Button>
        </div>

        <div ref={reordenar.contenedorRef}>
          {numerados.map((c, i) => (
            <FilaDeslizable key={c._k} onBorrar={() => quitar(c._k!)} indice={i}
              estilo={reordenar.estiloFila(i)} bloqueado={reordenar.arrastrando}>
              <div className={`flex items-center gap-0.5 rounded-lg border pl-2 pr-1 py-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200 ${
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
                      {c.groupedWith && <div className="border-l-2 border-border ml-2 pl-1 mt-1">{filaCanto(c.groupedWith, c.position + 1)}</div>}
                    </>
                  )}
                </div>
                {c.groupedWith ? (
                  <button onClick={() => separar(i)} className="tap-btn p-2 text-muted-foreground" aria-label={t.editor_ungroup}><Unlink size={16} /></button>
                ) : puedeAgrupar(i) ? (
                  <button onClick={() => agrupar(i)} className="tap-btn p-2 text-muted-foreground" aria-label={t.editor_group}><Link2 size={16} /></button>
                ) : null}
                <button onClick={() => mover(i, -1)} disabled={i === 0} className="tap-btn p-2 text-muted-foreground disabled:opacity-20" aria-label={t.editor_up}><ArrowUp size={16} /></button>
                <button onClick={() => mover(i, 1)} disabled={i === cantos.length - 1} className="tap-btn p-2 text-muted-foreground disabled:opacity-20" aria-label={t.editor_down}><ArrowDown size={16} /></button>
                <button onClick={() => quitar(c._k!)} className="tap-btn p-2 text-muted-foreground hover:text-destructive" aria-label={t.minutas_delete}><X size={16} /></button>
              </div>
            </FilaDeslizable>
          ))}
          {cantos.length === 0 && <p className="text-muted-foreground text-xs text-center py-6">{t.editor_empty_hint}</p>}
          <div ref={finRef} />
        </div>
        {cantos.length > 1 && <p className="text-[10px] text-muted-foreground/70 text-center">{t.editor_group_hint}</p>}
      </div>

      {/* Guardar/Publicar aparecen SOLO cuando hay algo que guardar (regla de Josué): se despliegan con suavidad y,
          al irse, la barra baja deslizándose (translateY) mientras se cierra, en vez de recortarse. */}
      <div className="grid" style={{
        gridTemplateRows: mostrarBotones ? '1fr' : '0fr',
        opacity: mostrarBotones ? 1 : 0,
        transition: 'grid-template-rows 300ms cubic-bezier(0.22, 1, 0.36, 1), opacity 240ms ease',
      }} aria-hidden={!mostrarBotones}>
      <div className="overflow-hidden">
      <div className="px-5 py-3 border-t border-border bg-background flex justify-center gap-2" style={{
        transform: mostrarBotones ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        {yaPublicada ? (
          // Ya la ven todos: un solo botón, "Publicar cambios" (solo aparece si hubo cambios).
          <Button onClick={() => guardar(false)} disabled={!!guardando} className="h-10 min-w-[120px] px-5 text-sm gap-1.5">
            {guardando ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            {t.minuta_publish_changes}
          </Button>
        ) : <>
          {/* Guardar (queda privada) solo si hay algo nuevo; Publicar siempre (centrado si va solo). */}
          {guardarEnBarra && (
            <Button onClick={() => guardar(false)} disabled={!!guardando} variant="outline"
              className="h-10 min-w-[120px] px-5 text-sm gap-1.5 animate-in fade-in zoom-in-95 duration-200">
              {guardando === 'guardar' ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {t.minutas_save}
            </Button>
          )}
          <Button onClick={() => guardar(true)} disabled={!!guardando} className="h-10 min-w-[120px] px-5 text-sm gap-1.5">
            {guardando === 'publicar' ? <Loader2 size={16} className="animate-spin" /> : <Globe size={16} />}
            {t.minuta_publish}
          </Button>
        </>}
      </div>
      </div>
      </div>
      </>}

      {/* Salir con cambios sin guardar: descartar, guardar o seguir editando (tocar fuera = seguir editando). */}
      <Dialog open={!!salida.pendiente} onOpenChange={abierto => { if (!abierto) salida.cerrarPregunta(); }}>
        <DialogContent className="max-w-[320px] rounded-2xl gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">{t.editor_unsaved_title}</DialogTitle>
            {/* Minuta nueva: no hay "cambios" que descartar, se descarta la minuta. Existente: "Descartar cambios". */}
            <DialogDescription className="text-xs">{id ? t.editor_unsaved_text : t.editor_unsaved_text_new}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="h-10 text-sm gap-1.5"
              disabled={!!guardando || cantos.length === 0}
              onClick={() => { const ir = salida.pendiente!; salida.cerrarPregunta(); guardar(false, ir); }}
            >
              {guardando ? <Loader2 size={16} className="animate-spin" /> : yaPublicada ? <Globe size={16} /> : <Check size={16} />}
              {yaPublicada ? t.minuta_publish_changes : t.minutas_save}
            </Button>
            <Button
              variant="outline"
              className="h-10 text-sm text-destructive"
              onClick={() => { const ir = salida.pendiente!; salida.cerrarPregunta(); ir(); }}
            >
              {id ? t.editor_discard : t.editor_discard_new}
            </Button>
            <Button variant="ghost" className="h-9 text-sm text-muted-foreground" onClick={salida.cerrarPregunta}>
              {t.editor_keep_editing}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {buscando && (
        <BuscadorCantos
          seleccionados={seleccionadosEnBusqueda}
          onAdd={agregar}
          onRemove={desmarcar}
          onClose={() => setBuscando(false)}
          onCancel={cancelarBusqueda}
        />
      )}
    </div>
  );
}
