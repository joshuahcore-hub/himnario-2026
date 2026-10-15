import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trash2, Pin, WifiOff, RefreshCw, Pencil, Globe, Lock, Copy, Loader2 } from 'lucide-react';
import Portada from '@/components/Portada';
import type { MinutaData } from '@/lib/types';
import { useMinutas, quitarMinutaLocal, guardarMinutaLocal, tomarParaEnfocar } from '@/lib/minutaCache';
import { tituloVisible } from '@/lib/minutaUtils';
import { api, ErrorDeRed } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';
import { cargarRecordatorios } from '@/lib/recordatorios';
import BotonSeguro from '@/components/BotonSeguro';

/** Dónde quedó la lista de minutas (se conserva al cambiar de pestaña mientras la app esté abierta). */
let posicionMinutas: number | null = null;

export default function Minutas() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { puedeEditar, esAdmin } = useAcceso();
  const { minutas, sinConexion, cargando, refrescar } = useMinutas();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPress = useRef<ReturnType<typeof setTimeout>>();
  // El toque que termina un "mantener presionado" no debe desmarcar la minuta recién seleccionada.
  const ignorarSiguienteToque = useRef(false);

  // Fijadas primero; el resto por fecha. Se abre mostrando la más reciente (a la derecha).
  const ordenadas = useMemo(
    // Fijadas AL FRENTE: al final de la lista (derecha), donde se abre; las más antiguas quedan a la izquierda.
    () => [...minutas.filter(m => !m.fijada), ...minutas.filter(m => m.fijada)],
    [minutas],
  );

  // Minuta a dejar al centro: la que se acaba de editar (al volver del editor) o la copia recién duplicada.
  // Si no hay ninguna, se muestra la más reciente.
  const enfocar = useRef<string | null>(null);
  if (enfocar.current === null) enfocar.current = tomarParaEnfocar();
  // Si no hay que centrar ninguna, queda donde la persona la dejó (Josué, 1.7.6: ir a otra pestaña y volver no debe
  // devolverla al final). Solo la primera vez (o sin posición guardada) se muestra la más reciente.
  const ubicada = useRef(false);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || ordenadas.length === 0) return;
    const tarjeta = enfocar.current && el.querySelector<HTMLElement>(`[data-minuta="${enfocar.current}"]`);
    if (tarjeta) { el.scrollLeft = tarjeta.offsetLeft - (el.clientWidth - tarjeta.offsetWidth) / 2; enfocar.current = ''; }
    else if (!ubicada.current) el.scrollLeft = posicionMinutas ?? el.scrollWidth;
    ubicada.current = true;
  }, [ordenadas.length]);

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const salirSeleccion = () => { setSelectMode(false); setSelected(new Set()); };

  // El basurero primero pregunta (Josué): "¿Eliminar…?" con Eliminar / Cancelar; tocar fuera cancela.
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  // Cantidad fijada al abrir el aviso: al eliminar se vacía la selección y, si no, el título cambiaría a
  // "¿Eliminar 0 minutas?" justo mientras el aviso se desvanece.
  const [cantidadABorrar, setCantidadABorrar] = useState(0);
  const [borrando, setBorrando] = useState(false);
  const borrar = async () => {
    const ids = [...selected];
    setBorrando(true);
    try {
      for (const id of ids) {
        await api(`minutas/${id}`, { metodo: 'DELETE' });
        quitarMinutaLocal(id);
      }
      toast.success(t.minutas_deleted(ids.length));
      setConfirmarBorrar(false);
      salirSeleccion();
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : (e.message || t.minutas_error_delete));
    } finally {
      setBorrando(false);
    }
  };

  // Publicar (la ven todos) o volver a privada (solo quien la creó): SOLO en las minutas propias, también para el
  // administrador (Josué: en una ajena el candado la escondía para todos menos su autor, y era confuso).
  const unaSeleccionada = selected.size === 1 ? minutas.find(m => m.id === [...selected][0]) : undefined;
  const puedeCambiarVisibilidad = !!unaSeleccionada?.mia;
  // Editar y borrar SOLO las propias, también el administrador (Josué, 1.5.4). En las ajenas: ver y duplicar.
  const puedeEditar1 = !!unaSeleccionada?.mia;
  const todasPropias = selected.size > 0 && [...selected].every(id => minutas.find(m => m.id === id)?.mia);
  const cambiarVisibilidad = async () => {
    if (!unaSeleccionada) return;
    const publicar = !unaSeleccionada.publicada;
    try {
      guardarMinutaLocal(await api<MinutaData>(`minutas/${unaSeleccionada.id}`, { metodo: 'PATCH', datos: { publicada: publicar } }));
      toast.success(publicar ? t.minuta_published_toast : t.minuta_private_toast);
      salirSeleccion();
    } catch (e: any) {
      toast.error(e.message || t.minutas_error_rename);
    }
  };

  // Duplicar: crea una copia privada de quien duplica (la puede editar y dejar solo para sí).
  const [duplicando, setDuplicando] = useState(false);
  const duplicar = async () => {
    if (!unaSeleccionada || duplicando) return;
    setDuplicando(true);
    try {
      const copia = await api<MinutaData>(`minutas/${unaSeleccionada.id}/duplicar`, { metodo: 'POST' });
      enfocar.current = copia.id; // al aparecer en la lista, queda al centro (junto a la original, misma fecha)
      guardarMinutaLocal(copia);
      cargarRecordatorios(true, true); // la copia trae los recordatorios "solo en esta minuta" de quien duplica
      toast.success(t.minuta_duplicated_toast);
      salirSeleccion();
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : (e.message || t.create_error_save));
    } finally {
      setDuplicando(false);
    }
  };

  const fijar = async (m: MinutaData) => {
    try {
      guardarMinutaLocal(await api<MinutaData>(`minutas/${m.id}`, { metodo: 'PATCH', datos: { fijada: !m.fijada } }));
      toast.success(m.fijada ? t.minutas_unpinned : t.minutas_pinned);
      salirSeleccion(); // fijar es una acción completa: sale de la selección
      // Queda a la vista donde quedó (las fijadas van al frente, a la derecha).
      setTimeout(() => scrollRef.current?.querySelector(`[data-minuta="${m.id}"]`)
        ?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }), 80);
    } catch (e: any) {
      toast.error(e.message || t.minutas_error_rename);
    }
  };

  return (
    <>
    {/* Tocar en cualquier parte fuera de una minuta sale del modo selección (igual que la X). */}
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100dvh - var(--barra))', overscrollBehavior: 'none' }}
         onClick={() => { if (selectMode) salirSeleccion(); }}>
      <div className="flex items-center justify-between px-5 pt-4 gap-2 w-full max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-foreground">{t.minutas_title}</h1>
        {/* Al seleccionar, esto y la ayuda de abajo se desvanecen SIN quitar su espacio: si se quitaran,
            la lista (centrada en la pantalla) saltaría hacia arriba justo al mantener presionada una minuta. */}
        <BotonSeguro onClick={refrescar} disabled={selectMode} aria-hidden={selectMode}
          className={`tap-btn p-2 text-muted-foreground transition-opacity duration-200 ${selectMode ? 'opacity-0 pointer-events-none' : ''}`}
          aria-label={t.minutas_refresh}>
          <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
        </BotonSeguro>
      </div>

      {sinConexion && (
        <div className="mx-5 mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">
          <WifiOff size={13} className="shrink-0" />
          {t.minutas_offline}
        </div>
      )}
      {puedeEditar && ordenadas.length > 0 && (
        <p className={`px-5 pt-2 text-[10px] text-muted-foreground/70 transition-opacity duration-200 w-full max-w-5xl mx-auto ${selectMode ? 'opacity-0' : ''}`}>
          {t.minutas_hint_select}
        </p>
      )}

      {ordenadas.length === 0 ? (
        <div className="flex-1 flex items-center justify-center px-5">
          <p className="text-muted-foreground text-sm text-center">
            {cargando ? t.minutas_loading : t.minutas_empty}
          </p>
        </div>
      ) : (
        <div className="flex-1 flex items-center overflow-hidden">
          <div
            ref={scrollRef}
            // Computador: a todo el ancho (se ven varias minutas a los lados) y tarjetas más grandes (340 px);
            // la rueda del mouse las mueve hacia los lados. El relleno lateral deja la primera y la última al centro.
            className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory w-full py-4 px-[calc(50%-140px)] md:px-[calc(50%-170px)]"
            // Solo hacia los lados: sin desplazamiento vertical (antes se podía correr arriba/abajo sin sentido).
            // Con una minuta seleccionada la lista queda quieta: no se desliza a los lados (Josué, 1.5.6).
            style={{ overflowY: 'hidden', overflowX: selectMode ? 'hidden' : 'auto', touchAction: selectMode ? 'none' : 'pan-x', overscrollBehavior: 'contain' }}
            onScroll={e => { posicionMinutas = e.currentTarget.scrollLeft; }}
            onWheel={e => {
              if (!selectMode && Math.abs(e.deltaY) > Math.abs(e.deltaX)) scrollRef.current?.scrollBy({ left: e.deltaY, behavior: 'smooth' });
            }}
          >
            {ordenadas.map(m => (
              <div key={m.id} data-minuta={m.id} className="snap-center shrink-0 w-[280px] md:w-[340px]" onContextMenu={e => e.preventDefault()} onClick={e => e.stopPropagation()}>
                <div className="mb-2 flex items-center justify-center gap-1.5 h-6">
                  {m.fijada && <Pin size={10} className="text-primary rotate-45" />}
                  <p className="text-xs font-semibold text-foreground/80 text-center truncate">{tituloVisible(m)}</p>
                  {/* Solo en las minutas propias: si la ven todos o solo quien la creó. Los visores no ven esto. */}
                  {m.mia && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${
                      m.publicada ? 'bg-green-600/15 text-green-700 dark:text-green-400' : 'bg-muted text-muted-foreground'
                    }`}>
                      {m.publicada ? <Globe size={10} /> : <Lock size={10} />}
                      {m.publicada ? t.minuta_badge_public : t.minuta_badge_private}
                    </span>
                  )}
                </div>
                <div
                  className={`relative cursor-pointer ${m.fijada ? 'ring-2 ring-primary/40 rounded-xl' : ''}`}
                  onTouchStart={() => {
                    // Gesto nuevo: el "ignorar" de un mantener-presionado anterior ya no vale (1.7.5: si al soltar no
                    // llegaba el click, quedaba pendiente y se tragaba el siguiente toque de verdad).
                    ignorarSiguienteToque.current = false;
                    if (!puedeEditar) return;
                    longPress.current = setTimeout(() => {
                      ignorarSiguienteToque.current = true;
                      setSelectMode(true);
                      toggleSelect(m.id);
                    }, 500);
                  }}
                  onTouchEnd={() => clearTimeout(longPress.current)}
                  onTouchMove={() => clearTimeout(longPress.current)}
                  onClick={() => {
                    if (ignorarSiguienteToque.current) { ignorarSiguienteToque.current = false; return; }
                    if (selectMode) toggleSelect(m.id); else navigate(`/minuta/${m.id}`);
                  }}
                >
                  {selectMode && (
                    <>
                      <div className={`absolute top-2 right-2 z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                        selected.has(m.id) ? 'bg-destructive border-destructive text-destructive-foreground' : 'border-muted-foreground/30 bg-card'
                      }`}>
                        {selected.has(m.id) && <span className="text-xs">✓</span>}
                      </div>
                      {/* Fijar: solo en las propias. */}
                      {/* Alfiler ARRIBA del recuadro (misma esquina izquierda): así no tapa "Minuta" (Josué, 1.5.7). */}
                      {m.mia && <BotonSeguro
                        className={`absolute -top-8 left-1 z-10 w-7 h-7 rounded-full flex items-center justify-center shadow-sm animate-in fade-in zoom-in-95 duration-150 ${
                          m.fijada ? 'bg-primary text-primary-foreground' : 'bg-card/80 border border-border text-muted-foreground'
                        }`}
                        onClick={e => { e.stopPropagation(); fijar(m); }}
                        aria-label={t.minutas_pin}
                      >
                        <Pin size={13} />
                      </BotonSeguro>}
                    </>
                  )}
                  {/* Quién la creó/editó: solo el administrador, y solo aquí en la lista (no dentro de la minuta). */}
                  <Portada date={m.fecha} songs={m.cantos} compact
                    creador={m.creador} editor={m.editor} duplicada={!!m.duplicada} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Acciones de la selección: abajo, al alcance del pulgar. Solo íconos. Copiar = duplicar (copia privada
          propia; con una sola minuta, propia o ajena). Lápiz (editar), globo/candado (publicar/privada) y basurero
          SOLO si son propias: en las ajenas ni aparecen, tampoco para el administrador (1.5.4). */}
      {selectMode && (
        <div
          className="fixed left-0 right-0 z-40 flex justify-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-200"
          style={{ bottom: 'calc(var(--barra) + 1rem)' }}
          onClick={e => e.stopPropagation()}
        >
          {puedeEditar1 && (
            <BotonSeguro
              onClick={() => { const [id] = [...selected]; salirSeleccion(); navigate(`/editar/${id}`); }}
              className="tap-btn w-14 h-14 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground animate-in fade-in zoom-in-95 duration-200"
              aria-label={t.create_edit}
            >
              <Pencil size={22} />
            </BotonSeguro>
          )}
          <BotonSeguro
            onClick={duplicar}
            disabled={selected.size !== 1 || duplicando}
            className="tap-btn w-14 h-14 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground disabled:opacity-30 transition-opacity"
            aria-label={t.minuta_duplicate}
          >
            {duplicando ? <Loader2 size={22} className="animate-spin" /> : <Copy size={22} />}
          </BotonSeguro>
          {puedeCambiarVisibilidad && (
            <BotonSeguro
              onClick={cambiarVisibilidad}
              className="tap-btn w-14 h-14 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-foreground animate-in fade-in zoom-in-95 duration-200"
              aria-label={unaSeleccionada?.publicada ? t.minuta_make_private : t.minuta_publish}
            >
              {unaSeleccionada?.publicada ? <Lock size={22} /> : <Globe size={22} className="text-green-600 dark:text-green-400" />}
            </BotonSeguro>
          )}
          {todasPropias && (
            <BotonSeguro
              onClick={() => { setCantidadABorrar(selected.size); setConfirmarBorrar(true); }}
              className="tap-btn w-14 h-14 rounded-full bg-card border border-border shadow-lg flex items-center justify-center text-destructive animate-in fade-in zoom-in-95 duration-200"
              aria-label={t.minutas_delete}
            >
              <Trash2 size={22} />
            </BotonSeguro>
          )}
        </div>
      )}
    </div>

    {/* Confirmar eliminación. Fuera del contenedor: si no, tocar el diálogo saldría del modo selección. */}
    <Dialog open={confirmarBorrar} onOpenChange={abierto => { if (!abierto && !borrando) setConfirmarBorrar(false); }}>
      <DialogContent className="max-w-[320px] rounded-2xl gap-3">
        <DialogHeader>
          <DialogTitle className="text-base">{t.minutas_delete_confirm_title(cantidadABorrar)}</DialogTitle>
          <DialogDescription className="text-xs">{t.minutas_delete_confirm_text}</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1 h-10 text-sm" disabled={borrando} onClick={() => setConfirmarBorrar(false)}>
            {t.minutas_cancel}
          </Button>
          <Button variant="destructive" className="flex-1 h-10 text-sm gap-1.5" disabled={borrando} onClick={borrar}>
            {borrando ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {t.minutas_delete}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
