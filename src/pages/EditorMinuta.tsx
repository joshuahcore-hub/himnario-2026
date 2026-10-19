import { useMemo, useRef, useState } from 'react';
import { espacioActual, useEspacios } from '@/lib/espacios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast } from '@/lib/aviso';
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, FolderOpen, Globe, Link2, Loader2, Plus, Search, Unlink, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SelectorFecha from '@/components/SelectorFecha';
import FilaDeslizable from '@/components/FilaDeslizable';
import { useReordenar } from '@/hooks/useReordenar';
import { useSalidaProtegida } from '@/hooks/useSalidaProtegida';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import type { MinutaData, ParsedSong } from '@/lib/types';
import { getHymns, normalizar } from '@/lib/hymnCache';
import { armarCadena, cadena, cantoDesdeHimno, cantoFuera, esMarcador, especial, ORACION, PALABRA, renumerar, textoLibre } from '@/lib/minutaUtils';
import { DialogEspecial, DialogFuera, DialogTexto, type DatosFuera } from '@/components/DialogosMinuta';
import { buscarCancionExtra, useCancionesExtra, normalizarTitulo } from '@/lib/cancionesExtra';
import { useAtrasCierra } from '@/lib/atras';
import { getMinuta, guardarMinutaLocal, marcarParaEnfocar, tengoMinutaEn, marcarEspacioPorPreguntar } from '@/lib/minutaCache';
import { api, ErrorDeRed } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';
import PanelIA, { useEstadoIA } from '@/components/PanelIA';
import type { LecturaMinuta } from '@/lib/leerMinuta';
import BotonSeguro from '@/components/BotonSeguro';
import { ConBarra } from '@/components/BarraDesplazamiento';

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
/** Duración del cambio a verde al marcar un canto en el buscador (1.18.2, Josué: más ágil; antes 180). */
const MARCAR_MS = 110;

/** Círculo + / ✓ del buscador (cambia de color y de ícono en un solo cambio suave). */
function Circulo({ marcado }: { marcado: boolean }) {
  return (
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
  );
}

/** Distintivo de una alabanza que no está en el himnario (Josué eligió la etiqueta). */
export function EtiquetaFuera() {
  const { t } = useI18n();
  return <span className="shrink-0 rounded-md border border-border px-1.5 py-px text-[10px] text-muted-foreground whitespace-nowrap">{t.fuera_etiqueta}</span>;
}

function BuscadorCantos({ onAdd, onRemove, onClose, onCancel, seleccionados, onFuera, seleccionadosFuera, onRemoveFuera }: {
  /** (1.13.0) Agregar una que no está en el himnario (abre su cuadro). */
  onFuera: () => void;
  /** (1.13.4) Canciones fuera del himnario marcadas en esta búsqueda (títulos normalizados) y desmarcarlas. */
  seleccionadosFuera: string[];
  onRemoveFuera: (titulo: string) => void;
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
  const extras = useCancionesExtra();
  const extrasCoinciden = useMemo(() => {
    const n = normalizarTitulo(q);
    return n ? extras.filter(c => normalizarTitulo(c.titulo).includes(n)) : [];
  }, [q, extras]);
  // (1.13.4, Josué) Subcarpeta "Canciones que no están en el himnario" dentro del buscador.
  const [carpeta, setCarpeta] = useState(false);
  // "Atrás" del celular: dentro de la subcarpeta vuelve a la lista; si no, cierra el buscador sin "Listo" (descarta).
  useAtrasCierra(true, onCancel);
  useAtrasCierra(carpeta, () => setCarpeta(false));
  const marcadosFuera = new Set(seleccionadosFuera);
  const extrasCarpeta = useMemo(() => {
    const n = normalizarTitulo(q);
    return n ? extras.filter(c => normalizarTitulo(c.titulo).includes(n)) : extras;
  }, [q, extras]);
  // Una canción guardada: se marca en verde y se desmarca igual que las del himnario.
  const filaExtra = (c: typeof extras[number]) => {
    const marcado = marcadosFuera.has(normalizarTitulo(c.titulo));
    return (
      <button key={c.id} type="button" aria-pressed={marcado}
              onClick={() => (marcado ? onRemoveFuera(normalizarTitulo(c.titulo)) : onAdd(cantoFuera(c.titulo, c.tonalidad, c.imagen, c.tempo ?? null)))}
              className="flex items-center gap-2 py-2.5 px-2 rounded-lg w-full text-left"
              style={{ WebkitTapHighlightColor: 'transparent', backgroundColor: marcado ? 'rgb(22 163 74 / 0.15)' : 'transparent',
                       transition: `background-color ${MARCAR_MS}ms ease-out` }}>
        <span className="w-7 shrink-0" />
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <span className="text-foreground text-sm font-medium truncate">{c.titulo}</span>
          <EtiquetaFuera />
        </div>
        {c.tonalidad && <span translate="no" className="text-hymn-key font-semibold text-xs w-7 text-center">{c.tonalidad}</span>}
        <Circulo marcado={marcado} />
      </button>
    );
  };

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
        <BotonSeguro onClick={onCancel} className="tap-btn p-2 text-muted-foreground" aria-label={t.minutas_cancel}>
          <X size={20} />
        </BotonSeguro>
      </div>
      {/* (1.20.12, Josué) Misma barrita del Himnario. */}
      <div className="relative flex-1 min-h-0">
      <ConBarra>{ref => (
      <div ref={ref} className="h-full overflow-y-auto scrollbar-hide px-3 pt-2 pb-28 space-y-0.5">
        {carpeta ? (<>
          {/* Dentro de la subcarpeta: volver, crear otra y las guardadas (se marcan en verde). */}
          <button type="button" onClick={() => setCarpeta(false)}
                  className="w-full flex items-center gap-2 py-2.5 px-2 mb-1 rounded-lg text-sm font-semibold text-foreground text-left">
            <ChevronLeft size={16} className="shrink-0" />{t.fuera_seccion}
          </button>
          <button type="button" onClick={onFuera}
                  className="w-full flex items-center gap-2 py-2.5 px-3 mb-1 rounded-lg border border-dashed border-border text-sm text-muted-foreground text-left">
            <Plus size={15} className="shrink-0" />{t.fuera_agregar}
          </button>
          {extrasCarpeta.map(filaExtra)}
        </>) : (<>
        {/* (1.13.0/1.13.4, Josué) Antes de la 1: la subcarpeta con las guardadas (o, si no hay ninguna, crear una). */}
        {extras.length > 0 ? (
          <button type="button" onClick={() => setCarpeta(true)}
                  className="w-full flex items-center gap-2 py-2.5 px-3 mb-1 rounded-lg bg-card border border-border text-sm text-foreground text-left">
            <FolderOpen size={15} className="shrink-0 text-muted-foreground" />
            <span className="flex-1">{t.fuera_seccion}</span>
            <span className="text-xs text-muted-foreground">{extras.length}</span>
            <ChevronRight size={15} className="text-muted-foreground" />
          </button>
        ) : (
          <button type="button" onClick={onFuera}
                  className="w-full flex items-center gap-2 py-2.5 px-3 mb-1 rounded-lg border border-dashed border-border text-sm text-muted-foreground text-left">
            <Plus size={15} className="shrink-0" />{t.fuera_boton}
          </button>
        )}
        {extrasCoinciden.map(filaExtra)}
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
                // Solo el fondo verde, sin el borde fino más oscuro (Josué, 1.8.2: el borde se veía raro).
                backgroundColor: marcado ? 'rgb(22 163 74 / 0.15)' : 'transparent',
                transition: `background-color ${MARCAR_MS}ms ease-out`,
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
        {resultados.length === 0 && extrasCoinciden.length === 0 && <p className="text-muted-foreground text-xs text-center py-8">{t.hymnal_no_results}</p>}
        </>)}
      </div>
      )}</ConBarra>
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
  const { espacios, actual: espacio, siguiente: otroEspacio } = useEspacios();
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();
  const { puedeEditar } = useAcceso();
  useCancionesExtra(); // (1.18.2) trae la lista al día: al editar una alabanza fuera se reemplaza la guardada (no se duplica)
  const borrador = (location.state as { borrador?: BorradorMinuta } | null)?.borrador;
  const existente: MinutaData | undefined = id ? getMinuta(id) : undefined;

  const [titulo, setTitulo] = useState(existente?.titulo ?? borrador?.titulo ?? '');
  const [fecha, setFecha] = useState(existente?.fecha ?? borrador?.fecha ?? hoy());
  // (1.20.14, Josué) Una sola ofrenda: si una minuta trae varias, queda solo la primera.
  const [cantos, setCantos] = useState<Fila[]>(() => {
    let vista = false;
    return (existente?.cantos ?? borrador?.cantos ?? []).map(conClave).map(x => {
      if (!x.ofrenda) return x;
      if (vista) return { ...x, ofrenda: undefined };
      vista = true;
      return x;
    });
  });
  const [buscando, setBuscando] = useState(false);
  // (1.13.0) Cuadros de Especial y de alabanza fuera del himnario: k = fila que se edita (null = nueva).
  const [dlgEspecial, setDlgEspecial] = useState<{ abierto: boolean; k: number | null; nombre: string; imagen?: string | null }>({ abierto: false, k: null, nombre: '' });
  const [dlgFuera, setDlgFuera] = useState<{ abierto: boolean; k: number | null; datos: DatosFuera; idGuardada?: string | null }>({ abierto: false, k: null, datos: { titulo: '', tonalidad: null, tempo: null, imagen: null } });
  // (1.18.2) Texto libre: k = fila que se edita (null = nuevo).
  const [dlgTexto, setDlgTexto] = useState<{ abierto: boolean; k: number | null; texto: string }>({ abierto: false, k: null, texto: '' });
  // Toque corto en una fila = editar (mantener presionado sigue siendo mover la fila).
  const toqueFila = useRef<{ x: number; y: number; t: number } | null>(null);
  const tocarFila = (c: Fila) => ({
    onPointerDown: (e: React.PointerEvent) => { toqueFila.current = { x: e.clientX, y: e.clientY, t: Date.now() }; },
    onPointerUp: (e: React.PointerEvent) => {
      const t0 = toqueFila.current;
      toqueFila.current = null;
      if (!t0 || Date.now() - t0.t > 350 || Math.hypot(e.clientX - t0.x, e.clientY - t0.y) > 8) return;
      if (c.isEspecial) setDlgEspecial({ abierto: true, k: c._k!, nombre: c.nombre ?? '', imagen: c.imagen ?? null });
      else if (c.isTexto) setDlgTexto({ abierto: true, k: c._k!, texto: c.texto ?? '' });
      // (1.18.2, Josué) Si está guardada, se edita ESA (cambiarle el título ya no crea otra en la lista).
      else if (c.fuera) setDlgFuera({ abierto: true, k: c._k!, idGuardada: buscarCancionExtra(c.title)?.id ?? null,
                                      datos: { titulo: c.title, tonalidad: c.key, tempo: c.tempo ?? buscarCancionExtra(c.title)?.tempo ?? null, imagen: c.imagen ?? null } });
    },
  });
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

  // Por clave (no por posición): la fila puede borrarse al terminar su animación, cuando la lista ya cambió.
  const quitar = (clave: number) => {
    setCantos(prev => prev.filter(c => c._k !== clave));
    setSaliendo(prev => prev.filter(k => k !== clave));
  };
  // (1.20.14, Josué) Filas que se están borrando (deslizadas, aún animándose): la lista actúa YA como si no estuvieran
  // (el botón de unir de la de arriba y las ofrendas cambian al soltar, no al terminar la animación).
  const [saliendo, setSaliendo] = useState<number[]>([]);
  const siguiente = (i: number) => {
    for (let j = i + 1; j < cantos.length; j++) if (!saliendo.includes(cantos[j]._k!)) return j;
    return -1;
  };

  const seleccionadosEnBusqueda = cantos.slice(inicioBusqueda).flatMap(c => (c.hymnNumber ? [c.hymnNumber] : []));

  const desmarcar = (hymnNumber: number) => setCantos(prev => {
    for (let k = prev.length - 1; k >= inicioBusqueda; k--) {
      if (prev[k].hymnNumber === hymnNumber) return prev.filter((_, j) => j !== k);
    }
    return prev;
  });

  // (1.18.2, Josué) Unir sin límite: una alabanza (o un grupo) se une con la de abajo (o con su grupo) y quedan todas
  // en el mismo recuadro. Separar deja cada una en su propia fila.
  const puedeAgrupar = (i: number) => {
    const j = siguiente(i);
    return !esMarcador(cantos[i]) && j >= 0 && !esMarcador(cantos[j]);
  };

  const agrupar = (i: number) => {
    const j = siguiente(i);
    if (j < 0) return;
    setCantos(prev => {
      const next = [...prev];
      next[i] = { ...armarCadena([...cadena(next[i]), ...cadena(next[j]).map(x => ({ ...x, position: 0, ofrenda: undefined }))]), _k: next[i]._k };
      next.splice(j, 1);
      return next;
    });
  };

  const separar = (i: number) => setCantos(prev => {
    const next = [...prev];
    const [primera, ...resto] = cadena(next[i]);
    next.splice(i, 1, { ...primera, _k: next[i]._k } as Fila, ...resto.map(x => conClave(x)));
    return next;
  });

  // (1.18.2, Josué) Ofrenda antes de esta alabanza: se marca/desmarca con el cuadradito.
  const hayOfrenda = cantos.some(x => x.ofrenda && !saliendo.includes(x._k!));
  const alternarOfrenda = (clave: number) =>
    setCantos(prev => prev.map(x => (x._k === clave ? { ...x, ofrenda: x.ofrenda ? undefined : true } : x)));
  // (1.20.6, Josué) La PRIMERA vez que se marca una ofrenda en este celular, se explica qué hace; solo "Entendido",
  // que la marca. Cerrar de otra forma (tocar fuera, Atrás) también cuenta como entendido. Después, nunca más.
  const [ayudaOfrenda, setAyudaOfrenda] = useState<number | null>(null);
  const tocarOfrenda = (c: Fila) => {
    let vista = true;
    try { vista = localStorage.getItem('ayuda-ofrenda-vista') === '1'; } catch { /* sin almacenamiento: no molestar */ }
    if (!c.ofrenda && !vista) setAyudaOfrenda(c._k!);
    else alternarOfrenda(c._k!);
  };
  const entenderOfrenda = () => {
    if (ayudaOfrenda === null) return;
    try { localStorage.setItem('ayuda-ofrenda-vista', '1'); } catch { /* nada */ }
    const clave = ayudaOfrenda;
    setAyudaOfrenda(null);
    setCantos(prev => prev.map(x => (x._k === clave ? { ...x, ofrenda: true } : x)));
  };

  // Guardar: la nueva queda privada (solo quien la crea); la existente conserva su visibilidad.
  // Publicar: guarda y la deja visible para todos.
  /** despues: hacia dónde ir tras guardar (por defecto, abrir la minuta guardada). */
  // Descartar cambios (1.13.3): se sale sin guardar, igual que "Descartar" en la pregunta al salir.
  const descartar = () => {
    const hayDondeVolver = id && ((history.state as { idx?: number } | null)?.idx ?? 0) > 0;
    salida.salirHacia(() => (hayDondeVolver ? history.back() : navigate('/minutas', { replace: true })));
  };

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
      const primeraEnEspacio = !id && !tengoMinutaEn(espacioActual());
      const m = id
        ? await api<MinutaData>(`minutas/${id}`, { metodo: 'PATCH', datos })
        : await api<MinutaData>('minutas', { metodo: 'POST', datos: { ...datos, espacio: espacioActual() } });
      if (primeraEnEspacio) marcarEspacioPorPreguntar(m.espacio ?? espacioActual());
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
    const total = lectura.cantos.filter(c => !esMarcador(c)).reduce((n, c) => n + cadena(c).length, 0);
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
      {c.fuera && <EtiquetaFuera />}
      {c.fuera && c.imagen && <ImageIcon size={13} className="text-muted-foreground shrink-0" />}
      {c.found === false && <span className="text-destructive text-[10px] italic shrink-0">{t.portada_not_found}</span>}
    </div>
  );

  return (
    // La pantalla no se desplaza entera (como en Minutas): solo la zona de cantos, y solo si no cabe.
    // min-h-0 en la zona flex-1: sin eso crece con su contenido y empuja la pantalla completa.
    <div className="flex flex-col overflow-hidden w-full max-w-lg mx-auto" style={{ height: 'calc(100% - var(--barra))', overscrollBehavior: 'none' }}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-foreground">{id ? t.editor_title_edit : t.create_title}</h1>
        {/* (1.17.3, Josué) En qué espacio se crea: pequeño, a la derecha del título; tocarlo cambia de espacio. Es el
            MISMO que se ve en Minutas (cambiar uno cambia el otro). */}
        {!id && espacios.length > 1 && (
          <BotonSeguro onClick={otroEspacio} aria-label={t.minutas_cambiar_espacio}
                       className="tap-btn flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-foreground">
            {/* (1.20.18, Josué) Sin desvanecido: el nombre cambia directo. */}
            <span>{espacio.nombre}</span>
            <ArrowLeftRight size={12} className="text-muted-foreground" />
          </BotonSeguro>
        )}
        {id && (
          <BotonSeguro onClick={salida.intentarVolver} className="text-muted-foreground p-1.5" aria-label={t.minutas_cancel}>
            <X size={20} />
          </BotonSeguro>
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
            <BotonSeguro onClick={() => setModo('manual')} className={`relative h-8 transition-colors ${modo === 'manual' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {t.editor_mode_manual}
            </BotonSeguro>
            <BotonSeguro onClick={() => { setModo('ia'); revisarIA(); }} className={`relative h-8 transition-colors ${modo === 'ia' ? 'text-foreground' : 'text-muted-foreground'}`}>
              {t.editor_mode_ai}
            </BotonSeguro>
          </div>
        </div>
      )}

      {modo === 'ia' && !id ? (
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-1 pb-4" style={{ overscrollBehavior: 'contain' }}>
          <PanelIA estado={estadoIA} onListo={usarLectura} onFallo={revisarIA} />
        </div>
      ) : <>
      {/* pt-1: deja aire arriba para que el borde de los campos no quede cortado contra la lista. */}
      {/* (1.20.12, Josué) Misma barrita del Himnario. */}
      <div className="relative flex-1 min-h-0 animate-in fade-in duration-200">
      <ConBarra>{ref => (
      <div ref={ref} className="h-full overflow-y-auto scrollbar-hide px-5 pt-1 pb-4 space-y-4" style={{ overscrollBehavior: 'contain' }}>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={t.editor_title_placeholder} className="h-10 text-sm" maxLength={80} />
          <SelectorFecha valor={fecha} onChange={setFecha} />
        </div>

        {/* Botones fijos arriba; lo que se agrega va apareciendo debajo, así los botones no se mueven. */}
        {/* (1.18.2) Al final, el extra (texto libre, en naranjo). (1.19.13, Josué) Se llama "Extra": el botón dice "+E". */}
        <div className="grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] gap-1.5">
          <Button onClick={() => { setInicioBusqueda(cantos.length); setBuscando(true); }} className="gap-1 text-xs h-10 px-2">
            <Plus size={14} className="shrink-0" />{t.editor_add_song}
          </Button>
          <Button variant="outline" onClick={() => agregar({ ...PALABRA })} className="text-xs h-10 px-1 text-palabra">{t.portada_palabra}</Button>
          <Button variant="outline" onClick={() => agregar({ ...ORACION })} className="text-xs h-10 px-1 text-oracion">{t.portada_oracion}</Button>
          {/* (1.13.0) Especial: se abre al instante el cuadro para el nombre. */}
          <Button variant="outline" onClick={() => setDlgEspecial({ abierto: true, k: null, nombre: '' })} className="text-xs h-10 px-1 text-especial uppercase">{t.especial}</Button>
          <Button variant="outline" onClick={() => setDlgTexto({ abierto: true, k: null, texto: '' })} aria-label={t.texto_boton} title={t.texto_boton}
                  className="h-10 w-10 px-0 text-nota gap-0"><Plus size={11} strokeWidth={2.5} /><span className="text-[15px] font-bold leading-none">E</span></Button>
        </div>

        <div ref={reordenar.contenedorRef}>
          {numerados.map((c, i) => (
            <FilaDeslizable key={c._k} onBorrar={() => quitar(c._k!)} onSaliendo={() => setSaliendo(v => [...v, c._k!])} indice={i}
              estilo={reordenar.estiloFila(i)} bloqueado={reordenar.arrastrando}>
              <div className={`flex items-center gap-0.5 rounded-lg border pl-2 pr-1 py-2.5 animate-in fade-in slide-in-from-bottom-1 duration-200 ${
                c.found === false ? 'border-destructive/50 bg-destructive/5' : 'border-border bg-card'
              }`}>
                {/* (1.19.3, Josué) Todas las filas con el MISMO alto de antes (cuando tenían X y flechas de 32 px): sin
                    esto Palabra/Especial/Texto quedaban más delgadas que las alabanzas. */}
                <span aria-hidden className="h-8 w-0 shrink-0" />
                <div className="flex-1 min-w-0">
                  {c.isPalabra ? (
                    <span className="text-palabra text-sm font-semibold pl-6">{t.portada_palabra}</span>
                  ) : c.isOracion ? (
                    <span className="text-oracion text-sm font-semibold pl-6">{t.portada_oracion}</span>
                  ) : c.isEspecial ? (
                    // "Especial Javiera": un toque abre el cuadro para cambiar el nombre.
                    <div {...tocarFila(c)} className="pl-6 text-sm truncate cursor-pointer">
                      <span className="text-especial font-semibold">{t.especial}</span>
                      {c.nombre && <span className="text-especial font-semibold"> {c.nombre}</span>}
                      {c.imagen && <ImageIcon size={13} className="inline-block ml-1.5 text-muted-foreground align-[-2px]" />}
                    </div>
                  ) : c.isTexto ? (
                    // (1.18.2) Texto libre: un toque lo edita.
                    <div {...tocarFila(c)} className="pl-6 text-sm font-medium text-nota cursor-pointer break-words">{c.texto}</div>
                  ) : (
                    // (1.18.2, Josué) Unidas: todas ALINEADAS en el mismo recuadro (sin raya ni la segunda corrida).
                    <div className="space-y-1">
                      {cadena(c).map((x, k) => (
                        <div key={k} {...(k === 0 && c.fuera ? tocarFila(c) : {})} className={k === 0 && c.fuera ? 'cursor-pointer' : undefined}>
                          {filaCanto(x, c.position + k)}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* (1.18.2, Josué) Sin X ni flechas: se borra deslizando y se ordena manteniendo presionado.
                    (1.19.2) Unir/separar (solo en algunas filas) a la IZQUIERDA y la ofrenda siempre al extremo derecho:
                    así los cuadraditos de ofrenda quedan todos en una misma columna. */}
                {/* (1.20.14, Josué) Unir/separar con alto fijo h-8 (= el de la fila): antes medían 1rem + 16 px del ícono, 1 px
                    más que la fila con la letra de la app, y al desaparecer el botón la fila se achicaba un poco. */}
                {c.groupedWith && (
                  <button onClick={() => separar(i)} className="tap-btn h-8 w-8 shrink-0 flex items-center justify-center text-muted-foreground" aria-label={t.editor_ungroup}><Unlink size={16} /></button>
                )}
                {puedeAgrupar(i) && (
                  <button onClick={() => agrupar(i)} className="tap-btn h-8 w-8 shrink-0 flex items-center justify-center text-muted-foreground" aria-label={t.editor_group}><Link2 size={16} /></button>
                )}
                {!esMarcador(c) && (
                  // (1.20.13, Josué) La ofrenda va UNA vez en el culto: con una marcada, los demás botones se desvanecen
                  // (guardan su lugar: nada se mueve) y vuelven al desmarcarla.
                  <button onClick={() => tocarOfrenda(c)} aria-pressed={!!c.ofrenda} aria-label={t.editor_ofrenda} title={t.editor_ofrenda}
                          aria-hidden={hayOfrenda && !c.ofrenda} tabIndex={hayOfrenda && !c.ofrenda ? -1 : undefined}
                          className="tap-btn p-0.5 shrink-0"
                          style={{ opacity: hayOfrenda && !c.ofrenda ? 0 : 1, pointerEvents: hayOfrenda && !c.ofrenda ? 'none' : undefined,
                                   transition: 'opacity 100ms ease-out' }}>
                    {/* (1.19.20, Josué) Ofrendero (bolsa con aro y mango) en vez de la mano. Marcado: amarillo suave, dibujo en café oscuro. */}
                    <span className={`w-7 h-7 rounded-md border flex items-center justify-center ${
                      c.ofrenda ? 'bg-ofrenda border-ofrenda text-[#4A3800]' : 'border-border text-muted-foreground'}`}
                          style={{ transition: 'background-color 80ms ease-out, border-color 80ms ease-out, color 80ms ease-out' }}>
                      <IconoOfrendero />
                    </span>
                  </button>
                )}
              </div>
            </FilaDeslizable>
          ))}
          {cantos.length === 0 && <p className="text-muted-foreground text-xs text-center py-6">{t.editor_empty_hint}</p>}
          <div ref={finRef} />
        </div>
        {cantos.length > 1 && <p className="text-[10px] text-muted-foreground/70 text-center">{t.editor_group_hint}</p>}
      </div>
      )}</ConBarra>
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
        {/* (1.13.3, Josué) Editando una minuta con cambios: "Descartar cambios" a la IZQUIERDA (sin tener que volver
            atrás para descartar) y lo de guardar/publicar a la derecha. Sale sin guardar nada. */}
        {!!id && hayCambios && (
          <Button variant="ghost" onClick={descartar} disabled={!!guardando}
                  className="h-10 px-3 text-sm text-muted-foreground mr-auto animate-in fade-in duration-200">
            {t.editor_discard}
          </Button>
        )}
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

      {/* (1.20.6) Explicación de la ofrenda la primera vez: un solo botón. */}
      <Dialog open={ayudaOfrenda !== null} onOpenChange={abierto => { if (!abierto) entenderOfrenda(); }}>
        <DialogContent className="max-w-[320px] rounded-2xl gap-3">
          <DialogHeader className="items-center text-center">
            <span className="w-11 h-11 rounded-xl bg-ofrenda text-[#4A3800] flex items-center justify-center mb-1"><IconoOfrendero /></span>
            <DialogTitle className="text-base">{t.ofrenda_ayuda_titulo}</DialogTitle>
            <DialogDescription className="text-xs text-center">{t.ofrenda_ayuda_texto}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center pt-1">
            <Button className="h-10 text-sm px-6" onClick={entenderOfrenda}>{t.entendido}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <DialogEspecial abierto={dlgEspecial.abierto} nombreInicial={dlgEspecial.nombre} imagenInicial={dlgEspecial.imagen ?? null} nuevo={dlgEspecial.k === null}
        onCerrar={() => setDlgEspecial(d => ({ ...d, abierto: false }))}
        onListo={(nombre, imagen) => {
          if (dlgEspecial.k === null) agregar({ ...especial(nombre), imagen });
          else setCantos(prev => prev.map(x => (x._k === dlgEspecial.k ? { ...x, nombre, imagen } : x)));
          setDlgEspecial(d => ({ ...d, abierto: false }));
        }} />
      <DialogFuera abierto={dlgFuera.abierto} inicial={dlgFuera.datos} nuevo={dlgFuera.k === null} idGuardada={dlgFuera.idGuardada}
        onCerrar={() => setDlgFuera(d => ({ ...d, abierto: false }))}
        onListo={d => {
          if (dlgFuera.k === null) agregar(cantoFuera(d.titulo, d.tonalidad, d.imagen, d.tempo));
          else setCantos(prev => prev.map(x => (x._k === dlgFuera.k ? { ...x, title: d.titulo, key: d.tonalidad, imagen: d.imagen, tempo: d.tempo } : x)));
          setDlgFuera(v => ({ ...v, abierto: false }));
        }} />
      <DialogTexto abierto={dlgTexto.abierto} textoInicial={dlgTexto.texto} nuevo={dlgTexto.k === null}
        onCerrar={() => setDlgTexto(d => ({ ...d, abierto: false }))}
        onListo={texto => {
          if (dlgTexto.k === null) agregar(textoLibre(texto));
          else setCantos(prev => prev.map(x => (x._k === dlgTexto.k ? { ...x, texto } : x)));
          setDlgTexto(d => ({ ...d, abierto: false }));
        }} />
      {buscando && (
        <BuscadorCantos
          onFuera={() => setDlgFuera({ abierto: true, k: null, idGuardada: null, datos: { titulo: '', tonalidad: null, tempo: null, imagen: null } })}
          seleccionadosFuera={cantos.slice(inicioBusqueda).filter(c => c.fuera).map(c => normalizarTitulo(c.title))}
          onRemoveFuera={titulo => setCantos(prev => {
            for (let k = prev.length - 1; k >= inicioBusqueda; k--) {
              if (prev[k].fuera && normalizarTitulo(prev[k].title) === titulo) return prev.filter((_, j) => j !== k);
            }
            return prev;
          })}
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

// (1.19.20, Josué) Ofrendero: mango, aro y bolsa, estilo de línea igual a lucide. viewBox corrido 1 a la derecha
// para que el dibujo quede un poco a la izquierda (el peso visual de la bolsa lo hacía ver descentrado).
function IconoOfrendero() {
  return (
    <svg width={15} height={15} viewBox="1 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4.5 10 7.6" />
      <ellipse cx="16" cy="8" rx="6" ry="2.2" />
      <path d="M10 8c0 6 2.6 11.5 6 11.5S22 14 22 8" />
    </svg>
  );
}
