// Cuadros del editor de minutas (1.13.0, Josué):
//  - Especial: "Especial" fijo + el nombre (p. ej. "Javiera"). Se abre AL INSTANTE al tocar "Especial" y al tocar la
//    fila (toque corto; mantener presionado sigue siendo mover).
//  - Alabanza fuera del himnario: título, tonalidad y tempo (obligatorios desde 1.18.2) e imagen (opcional, de la galería: sustituto
//    provisorio de la letra). Se abre al instante desde el buscador y al tocar la fila. Queda guardada para volver a
//    usarla (Himnario → "Canciones que no están en el himnario").
// Aquí el teclado SÍ se abre solo (excepción pedida: se agrega para escribir el nombre "al tiro").
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/aviso';
import { ImagePlus, Loader2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TonalityPicker from '@/components/TonalityPicker';
import { useI18n } from '@/lib/i18n/index';
import { ErrorDeRed } from '@/lib/api';
import { buscarCancionExtra, editarCancionExtra, guardarCancionExtra, subirImagen, urlImagen, type DatosCancionExtra, type Tempo } from '@/lib/cancionesExtra';
import { MAX_TEXTO } from '@/lib/minutaUtils';
import { MAX_IMAGENES, imagenesDe, unirImagenes } from '@/components/ImagenesSubidas';

/** Elegir imágenes de la galería (opcional, hasta 10; 1.13.4): se achican y se suben. Vista previa en miniaturas con
 *  su X; el valor es el mismo campo `imagen` con los ids separados por coma. */
function ElegirImagen({ imagen, onCambiar, onSubiendo }: {
  imagen: string | null; onCambiar: (ids: string | null) => void; onSubiendo?: (s: boolean) => void;
}) {
  const { t } = useI18n();
  const [subiendo, setSubiendo] = useState(0);
  const archivo = useRef<HTMLInputElement>(null);
  const ids = imagenesDe(imagen);
  const actuales = useRef(ids);
  actuales.current = ids;
  const elegir = async (lista: File[]) => {
    const libres = MAX_IMAGENES - actuales.current.length;
    if (lista.length > libres) toast.error(t.fuera_max_imagenes(MAX_IMAGENES));
    const usar = lista.slice(0, Math.max(0, libres));
    if (!usar.length) return;
    setSubiendo(usar.length); onSubiendo?.(true);
    try {
      for (const f of usar) {
        const id = await subirImagen(f);
        actuales.current = [...actuales.current, id];
        onCambiar(unirImagenes(actuales.current));
        setSubiendo(n => n - 1);
      }
    } catch (e: any) { toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message); }
    finally { setSubiendo(0); onSubiendo?.(false); }
  };
  const quitar = (id: string) => onCambiar(unirImagenes(ids.filter(x => x !== id)));
  return (<>
    <input ref={archivo} type="file" accept="image/*" multiple className="hidden"
           onChange={e => { elegir(Array.from(e.target.files ?? [])); e.target.value = ''; }} />
    {ids.length > 0 && (
      <div className="grid grid-cols-3 gap-2">
        {ids.map(id => (
          <div key={id} className="relative aspect-square rounded-lg border-2 border-dashed border-border p-0.5">
            <img src={urlImagen(id)} alt="" className="w-full h-full object-cover rounded" />
            <button type="button" onClick={() => quitar(id)} aria-label={t.fuera_quitar_imagen}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-card/90 border border-border flex items-center justify-center"><X size={12} /></button>
          </div>
        ))}
      </div>
    )}
    {ids.length < MAX_IMAGENES && (
      <button type="button" onClick={() => archivo.current?.click()} disabled={subiendo > 0}
              className="h-11 rounded-lg border border-dashed border-border text-sm text-muted-foreground flex items-center justify-center gap-2">
        {subiendo > 0 ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
        {ids.length ? t.fuera_otra_imagen(ids.length, MAX_IMAGENES) : t.fuera_elegir_imagen}
      </button>
    )}
  </>);
}

export function DialogEspecial({ abierto, nombreInicial, imagenInicial = null, nuevo, onListo, onCerrar }: {
  abierto: boolean; nombreInicial: string; imagenInicial?: string | null; nuevo: boolean;
  onListo: (nombre: string, imagen: string | null) => void; onCerrar: () => void;
}) {
  const { t } = useI18n();
  const [nombre, setNombre] = useState(nombreInicial);
  const [imagen, setImagen] = useState<string | null>(imagenInicial);
  // Se reinicia al ABRIR (nunca al cerrar: no se ve el estado anterior mientras se desvanece).
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) { setAbiertoAntes(abierto); if (abierto) { setNombre(nombreInicial); setImagen(imagenInicial); } }
  const listo = () => onListo(nombre.trim(), imagen);
  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o) onCerrar(); }}>
      <DialogContent capa="z-[70]" className="max-w-[340px] rounded-2xl gap-3 max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base text-especial">{t.especial}</DialogTitle>
          <DialogDescription className="sr-only">{t.especial_nombre}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--campo))] border-[0.5px] border-input px-3 h-11">
          <span className="text-especial font-semibold text-sm shrink-0">{t.especial}</span>
          <input autoFocus value={nombre} onChange={e => setNombre(e.target.value.slice(0, 40))} placeholder={t.especial_nombre}
                 onKeyDown={e => { if (e.key === 'Enter') listo(); }}
                 className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold text-especial placeholder:font-normal placeholder:text-muted-foreground/55" />
        </div>
        {/* (1.13.4, Josué) Imagen opcional: p. ej. la letra de una canción escrita para el especial. */}
        <p className="text-[11px] text-muted-foreground -mb-1">{t.fuera_imagen}</p>
        <ElegirImagen imagen={imagen} onCambiar={setImagen} />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="h-9 px-4 text-sm text-muted-foreground" onClick={onCerrar}>{t.minutas_cancel}</Button>
          <Button className="h-9 px-4 text-sm" onClick={listo}>{nuevo ? t.editor_add : t.editor_done}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export type DatosFuera = DatosCancionExtra;

/** (1.18.2, Josué) Lenta | Rápida, al lado de "Tonalidad" (como el Numérico | Alfabético del himnario). Sin elegir
 *  al principio: es obligatorio elegir uno. */
function SelectorTempo({ valor, onCambiar }: { valor: Tempo | null; onCambiar: (t: Tempo) => void }) {
  const { t } = useI18n();
  return (
    <div role="radiogroup" aria-label={t.fuera_tempo} className="relative grid grid-cols-2 rounded-full bg-muted p-0.5 text-[12px] font-medium">
      <span aria-hidden className="absolute top-0.5 bottom-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-card shadow-sm"
            style={{ transform: valor === 'rapida' ? 'translateX(100%)' : 'none', opacity: valor ? 1 : 0,
                     transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1), opacity 150ms ease' }} />
      {(['lenta', 'rapida'] as const).map(o => (
        <button key={o} type="button" role="radio" aria-checked={valor === o} onClick={() => onCambiar(o)}
                className={`relative px-3 h-7 rounded-full transition-colors duration-200 ${valor === o ? 'text-foreground' : 'text-muted-foreground'}`}>
          {o === 'lenta' ? t.fuera_lenta : t.fuera_rapida}
        </button>
      ))}
    </div>
  );
}

/** Alabanza fuera del himnario: crear o editar (título, tonalidad y tempo OBLIGATORIOS; imágenes opcionales).
 *  - `idGuardada`: es una alabanza ya guardada → se EDITA esa (no se crea otra; 1.18.2).
 *  - `onEliminar`: muestra "Eliminar" (con confirmación en el mismo panel). */
export function DialogFuera({ abierto, inicial, nuevo, idGuardada = null, esperarGuardado = false, onListo, onCerrar, onEliminar }: {
  abierto: boolean; inicial: DatosFuera; nuevo: boolean; idGuardada?: string | null;
  /** Agregar solo a la lista (Himnario): espera al servidor y avisa si falla (en el editor se agrega igual a la minuta). */
  esperarGuardado?: boolean;
  onListo: (d: DatosFuera) => void; onCerrar: () => void; onEliminar?: () => void;
}) {
  const { t } = useI18n();
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [tonalidad, setTonalidad] = useState<string | null>(inicial.tonalidad);
  const [tempo, setTempo] = useState<Tempo | null>(inicial.tempo);
  const [imagen, setImagen] = useState<string | null>(inicial.imagen);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [preguntaBorrar, setPreguntaBorrar] = useState(false);
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (abierto) {
      setTitulo(inicial.titulo); setTonalidad(inicial.tonalidad); setTempo(inicial.tempo); setImagen(inicial.imagen);
      setSubiendo(false); setGuardando(false); setPreguntaBorrar(false);
    }
  }
  // Si ese título ya está guardado, trae su tonalidad, tempo e imagen (sin pisar lo que se haya elegido).
  useEffect(() => {
    if (!abierto || !nuevo) return;
    const c = buscarCancionExtra(titulo);
    if (c) { setTonalidad(v => v ?? c.tonalidad); setTempo(v => v ?? c.tempo ?? null); setImagen(v => v ?? c.imagen); }
  }, [titulo, abierto, nuevo]);

  const listo = async () => {
    const tt = titulo.trim();
    if (!tt) { toast.error(t.fuera_falta_titulo); return; }
    if (!tonalidad) { toast.error(t.fuera_falta_tono); return; }
    if (!tempo) { toast.error(t.fuera_falta_tempo); return; }
    const datos = { titulo: tt, tonalidad, tempo, imagen };
    // Editando una fila de la minuta: la guardada con el título de ANTES (si no venía el id).
    const id = idGuardada ?? (!nuevo ? buscarCancionExtra(inicial.titulo)?.id ?? null : null);
    if (id || esperarGuardado) {
      // Editar la guardada: se reemplaza. Si el servidor no la acepta (p. ej. ya hay otra con ese título), se avisa
      // y el panel sigue abierto.
      setGuardando(true);
      try { await (id ? editarCancionExtra(id, datos) : guardarCancionExtra(datos)); }
      catch (e: any) { toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message); setGuardando(false); return; }
    } else {
      // Queda guardada como canción fuera del himnario (si no hay internet, igual se agrega a la minuta).
      guardarCancionExtra(datos).catch(() => {});
    }
    onListo(datos);
  };

  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent capa="z-[70]" className="max-w-[380px] rounded-2xl gap-3 max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{t.fuera_titulo}</DialogTitle>
          <DialogDescription className="text-xs">{t.fuera_texto}</DialogDescription>
        </DialogHeader>
        <Input autoFocus={nuevo} value={titulo} onChange={e => setTitulo(e.target.value.slice(0, 80))} placeholder={t.fuera_nombre} className="h-10 text-sm" />
        {/* (1.19.5, Josué) Tonalidad a la izquierda y Lenta | Rápida a la derecha, uno al lado del otro y centrados
            (sin la palabra "Tonalidad"). */}
        <div className="flex items-center justify-center gap-6 py-1">
          <TonalityPicker selectedKey={tonalidad} onChange={setTonalidad} />
          <SelectorTempo valor={tempo} onCambiar={setTempo} />
        </div>
        <p className="text-[11px] text-muted-foreground -mb-1">{t.fuera_imagen}</p>
        <ElegirImagen imagen={imagen} onCambiar={setImagen} onSubiendo={setSubiendo} />
        {/* Botones de abajo; con "Eliminar" la pregunta aparece en el mismo lugar (el panel no cambia de alto). */}
        <div className="grid pt-1">
          <div className="[grid-area:1/1] flex items-center justify-end gap-2 transition-opacity duration-150"
               style={{ opacity: preguntaBorrar ? 0 : 1, pointerEvents: preguntaBorrar ? 'none' : 'auto' }}>
            {onEliminar && (
              <Button variant="ghost" className="h-9 px-3 text-sm text-destructive mr-auto gap-1.5" onClick={() => setPreguntaBorrar(true)}>
                <Trash2 size={15} />{t.fuera_eliminar}
              </Button>
            )}
            <Button variant="ghost" className="h-9 px-4 text-sm text-muted-foreground" onClick={onCerrar} disabled={guardando}>{t.minutas_cancel}</Button>
            <Button className="h-9 px-4 text-sm" onClick={listo} disabled={subiendo || guardando}>
              {guardando ? <Loader2 size={16} className="animate-spin" /> : nuevo ? t.editor_add : t.editor_done}
            </Button>
          </div>
          {onEliminar && (
            <div className="[grid-area:1/1] flex items-center justify-end gap-2 transition-opacity duration-150"
                 style={{ opacity: preguntaBorrar ? 1 : 0, pointerEvents: preguntaBorrar ? 'auto' : 'none' }} aria-hidden={!preguntaBorrar}>
              <span className="mr-auto text-sm font-medium text-foreground">{t.fuera_eliminar_pregunta}</span>
              <Button variant="ghost" className="h-9 px-3 text-sm text-muted-foreground" onClick={() => setPreguntaBorrar(false)}>{t.minutas_cancel}</Button>
              <Button variant="destructive" className="h-9 px-3 text-sm" onClick={onEliminar}>{t.fuera_eliminar}</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** (1.18.2, Josué) Texto libre: lo que se quiera escribir entre medio (una oportunidad, una acotación…). */
export function DialogTexto({ abierto, textoInicial, nuevo, onListo, onCerrar }: {
  abierto: boolean; textoInicial: string; nuevo: boolean; onListo: (texto: string) => void; onCerrar: () => void;
}) {
  const { t } = useI18n();
  const [texto, setTexto] = useState(textoInicial);
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) { setAbiertoAntes(abierto); if (abierto) setTexto(textoInicial); }
  const listo = () => { if (texto.trim()) onListo(texto.trim()); else onCerrar(); };
  const quedan = MAX_TEXTO - texto.length;
  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o) onCerrar(); }}>
      <DialogContent capa="z-[70]" className="max-w-[340px] rounded-2xl gap-3">
        <DialogHeader>
          <DialogTitle className="text-base text-nota">{t.texto_titulo}</DialogTitle>
          <DialogDescription className="sr-only">{t.texto_placeholder}</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <textarea autoFocus value={texto} rows={3} placeholder={t.texto_placeholder}
                    onChange={e => setTexto(e.target.value.replace(/\n/g, ' ').slice(0, MAX_TEXTO))}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); listo(); } }}
                    className="w-full resize-none rounded-lg bg-[hsl(var(--campo))] border-[0.5px] border-input px-3 py-2.5 text-sm font-medium text-nota outline-none placeholder:font-normal placeholder:text-muted-foreground/55" />
          {/* Cuenta regresiva solo cerca del límite (como en los post-it). */}
          <span className="absolute right-2 bottom-2 text-[10px] text-muted-foreground transition-opacity"
                style={{ opacity: quedan <= 30 ? 1 : 0 }}>{quedan}</span>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" className="h-9 px-4 text-sm text-muted-foreground" onClick={onCerrar}>{t.minutas_cancel}</Button>
          <Button className="h-9 px-4 text-sm" onClick={listo}>{nuevo ? t.editor_add : t.editor_done}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
