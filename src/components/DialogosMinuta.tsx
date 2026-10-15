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

export function DialogEspecial({ abierto, nombreInicial, nuevo, onListo, onCerrar }: {
  abierto: boolean; nombreInicial: string; nuevo: boolean; onListo: (nombre: string) => void; onCerrar: () => void;
}) {
  const { t } = useI18n();
  const [nombre, setNombre] = useState(nombreInicial);
  // Se reinicia al ABRIR (nunca al cerrar: no se ve el estado anterior mientras se desvanece).
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) { setAbiertoAntes(abierto); if (abierto) setNombre(nombreInicial); }
  const listo = () => onListo(nombre.trim());
  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o) onCerrar(); }}>
      <DialogContent capa="z-[70]" className="max-w-[340px] rounded-2xl gap-3">
        <DialogHeader>
          <DialogTitle className="text-base text-especial">{t.especial}</DialogTitle>
          <DialogDescription className="sr-only">{t.especial_nombre}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg bg-[hsl(var(--campo))] border-[0.5px] border-input px-3 h-11">
          <span className="text-especial font-semibold text-sm shrink-0">{t.especial}</span>
          <input autoFocus value={nombre} onChange={e => setNombre(e.target.value.slice(0, 40))} placeholder={t.especial_nombre}
                 onKeyDown={e => { if (e.key === 'Enter') listo(); }}
                 className="flex-1 min-w-0 bg-transparent outline-none text-sm placeholder:text-muted-foreground/55" />
        </div>
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
  const archivo = useRef<HTMLInputElement>(null);
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

  const fallo = (e: any) => toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
  const elegirImagen = async (f: File | undefined) => {
    if (!f) return;
    setSubiendo(true);
    try { setImagen(await subirImagen(f)); } catch (e) { fallo(e); } finally { setSubiendo(false); }
  };
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
        <input ref={archivo} type="file" accept="image/*" className="hidden" onChange={e => { elegirImagen(e.target.files?.[0]); e.target.value = ''; }} />
        {imagen ? (
          <div className="relative rounded-lg border-2 border-dashed border-border p-1">
            <img src={urlImagen(imagen)} alt="" className="block w-full max-h-48 object-contain rounded" />
            <button type="button" onClick={() => setImagen(null)} aria-label={t.fuera_quitar_imagen}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-card/90 border border-border flex items-center justify-center"><X size={14} /></button>
          </div>
        ) : (
          <button type="button" onClick={() => archivo.current?.click()} disabled={subiendo}
                  className="h-11 rounded-lg border border-dashed border-border text-sm text-muted-foreground flex items-center justify-center gap-2">
            {subiendo ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}{t.fuera_elegir_imagen}
          </button>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" className="h-9 px-4 text-sm text-muted-foreground" onClick={onCerrar}>{t.minutas_cancel}</Button>
          <Button className="h-9 px-4 text-sm" onClick={listo} disabled={subiendo}>{nuevo ? t.editor_add : t.editor_done}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
