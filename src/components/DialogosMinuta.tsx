// Cuadros del editor de minutas (1.13.0, Josué):
//  - Especial: "Especial" fijo + el nombre (p. ej. "Javiera"). Se abre AL INSTANTE al tocar "Especial" y al tocar la
//    fila (toque corto; mantener presionado sigue siendo mover).
//  - Alabanza fuera del himnario: título, tonalidad (opcional) e imagen (opcional, de la galería: sustituto
//    provisorio de la letra). Se abre al instante desde el buscador y al tocar la fila. Queda guardada para volver a
//    usarla (Himnario → "Canciones que no están en el himnario").
// Aquí el teclado SÍ se abre solo (excepción pedida: se agrega para escribir el nombre "al tiro").
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/aviso';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import TonalityPicker from '@/components/TonalityPicker';
import { useI18n } from '@/lib/i18n/index';
import { ErrorDeRed } from '@/lib/api';
import { buscarCancionExtra, guardarCancionExtra, subirImagen, urlImagen } from '@/lib/cancionesExtra';
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

export interface DatosFuera { titulo: string; tonalidad: string | null; imagen: string | null }

export function DialogFuera({ abierto, inicial, nuevo, onListo, onCerrar }: {
  abierto: boolean; inicial: DatosFuera; nuevo: boolean; onListo: (d: DatosFuera) => void; onCerrar: () => void;
}) {
  const { t } = useI18n();
  const [titulo, setTitulo] = useState(inicial.titulo);
  const [tonalidad, setTonalidad] = useState<string | null>(inicial.tonalidad);
  const [imagen, setImagen] = useState<string | null>(inicial.imagen);
  const [subiendo, setSubiendo] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (abierto) { setTitulo(inicial.titulo); setTonalidad(inicial.tonalidad); setImagen(inicial.imagen); setSubiendo(false); setGuardando(false); }
  }
  // Si ese título ya está guardado, trae su tonalidad e imagen (sin pisar lo que se haya elegido).
  useEffect(() => {
    if (!abierto || !nuevo) return;
    const c = buscarCancionExtra(titulo);
    if (c) { setTonalidad(v => v ?? c.tonalidad); setImagen(v => v ?? c.imagen); }
  }, [titulo, abierto, nuevo]);

  const listo = async () => {
    const tt = titulo.trim();
    if (!tt) { toast.error(t.fuera_falta_titulo); return; }
    setGuardando(true);
    const datos = { titulo: tt, tonalidad, imagen };
    // Queda guardada como canción fuera del himnario (si no hay internet, igual se agrega a la minuta).
    guardarCancionExtra(datos).catch(() => {});
    onListo(datos);
  };

  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o && !guardando) onCerrar(); }}>
      <DialogContent capa="z-[70]" className="max-w-[380px] rounded-2xl gap-3 max-h-[92dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">{t.fuera_titulo}</DialogTitle>
          <DialogDescription className="text-xs">{t.fuera_texto}</DialogDescription>
        </DialogHeader>
        <Input autoFocus value={titulo} onChange={e => setTitulo(e.target.value.slice(0, 80))} placeholder={t.fuera_nombre} className="h-10 text-sm" />
        <p className="text-[11px] text-muted-foreground -mb-1">{t.fuera_tonalidad}</p>
        <TonalityPicker selectedKey={tonalidad} onChange={setTonalidad} />
        <p className="text-[11px] text-muted-foreground -mb-1">{t.fuera_imagen}</p>
        <ElegirImagen imagen={imagen} onCambiar={setImagen} onSubiendo={setSubiendo} />
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" className="h-9 px-4 text-sm text-muted-foreground" onClick={onCerrar}>{t.minutas_cancel}</Button>
          <Button className="h-9 px-4 text-sm" onClick={listo} disabled={subiendo}>{nuevo ? t.editor_add : t.editor_done}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
