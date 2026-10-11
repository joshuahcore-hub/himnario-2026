// "Con IA" en Crear minuta: pegar el texto de WhatsApp (sin IA, lo lee la app) o subir una foto
// (la IA solo transcribe la foto; el emparejamiento con el himnario lo hace la app).
// Indicador: verde = IA disponible (Gemini o PC); gris = no disponible (pegar texto sigue funcionando).
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, ImageIcon, ListChecks, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { api, ErrorDeRed } from '@/lib/api';
import { leerMinuta, type LecturaMinuta } from '@/lib/leerMinuta';
import { useI18n } from '@/lib/i18n/index';

export interface EstadoIA {
  permitido: boolean;
  gemini: boolean;
  pc: boolean;
  restantes: number | null;
}

/** Estado de la IA (se revisa al abrir y cada minuto mientras la pantalla está visible). */
export function useEstadoIA(activo: boolean) {
  const [estado, setEstado] = useState<EstadoIA | null>(null);
  const revisar = useCallback(async () => {
    try { setEstado(await api<EstadoIA>('ia/estado')); } catch { setEstado(e => (e ? { ...e, gemini: false, pc: false } : null)); }
  }, []);
  useEffect(() => {
    if (!activo) return;
    revisar();
    const t = setInterval(() => { if (document.visibilityState === 'visible') revisar(); }, 60_000);
    return () => clearInterval(t);
  }, [activo, revisar]);
  return { estado, revisar };
}

/** Achica la foto (máx. 1600 px) y la pasa a JPEG en base64 para enviarla rápido. */
async function prepararFoto(archivo: File): Promise<string> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext('2d')!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  const blob: Blob = await new Promise((ok, mal) => lienzo.toBlob(b => (b ? ok(b) : mal(new Error('foto'))), 'image/jpeg', 0.85));
  const datos = new Uint8Array(await blob.arrayBuffer());
  let binario = '';
  for (let i = 0; i < datos.length; i += 0x8000) binario += String.fromCharCode(...datos.subarray(i, i + 0x8000));
  return btoa(binario);
}

export default function PanelIA({ estado, onListo }: {
  estado: EstadoIA | null;
  onListo: (lectura: LecturaMinuta, textoOriginal: string) => void;
}) {
  const { t } = useI18n();
  const [texto, setTexto] = useState('');
  const [leyendo, setLeyendo] = useState(false);
  const camara = useRef<HTMLInputElement>(null);
  const galeria = useRef<HTMLInputElement>(null);

  // La foto (y su indicador) solo para quien tiene permiso; pegar texto es para todos los creadores.
  const conFoto = !!estado?.permitido;
  const disponible = conFoto && (estado!.gemini || estado!.pc);
  const etiqueta = !estado ? t.ia_checking
    : estado.gemini ? t.ia_available_gemini
    : estado.pc ? t.ia_available_pc
    : t.ia_unavailable;

  const generarDesdeTexto = () => {
    const lectura = leerMinuta(texto);
    if (lectura.cantos.length === 0) { toast.error(t.ia_nothing_found); return; }
    onListo(lectura, texto);
  };

  const leerFoto = async (archivo: File | undefined) => {
    if (!archivo) return;
    setLeyendo(true);
    try {
      const imagen = await prepararFoto(archivo);
      const r = await api<{ texto: string; fuente: string }>('ia/leer', { metodo: 'POST', datos: { imagen, mime: 'image/jpeg' } });
      const lectura = leerMinuta(r.texto);
      if (lectura.cantos.length === 0) { toast.error(t.ia_nothing_found); return; }
      onListo(lectura, r.texto);
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : (e.message || t.create_error_read_image));
    } finally {
      setLeyendo(false);
      if (camara.current) camara.current.value = '';
      if (galeria.current) galeria.current.value = '';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Foto: lo único que usa IA (distintivo "IA" + indicador de disponibilidad tipo "en línea") */}
      {conFoto && (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-foreground">{t.ia_photo_title}</p>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-bold text-primary">
            <Sparkles size={9} />{t.ia_badge}
          </span>
          {estado?.restantes != null && <span className="ml-auto text-[10px] text-muted-foreground">{t.ia_remaining(estado.restantes)}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2 shrink-0">
            {disponible && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-50" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full transition-colors ${disponible ? 'bg-green-500' : 'bg-muted-foreground/40'}`} />
          </span>
          <span className="text-[10px] text-muted-foreground">{etiqueta}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-16 flex-col gap-1 text-xs" disabled={!disponible || leyendo} onClick={() => camara.current?.click()}>
            <Camera size={18} />{t.ia_camera}
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-1 text-xs" disabled={!disponible || leyendo} onClick={() => galeria.current?.click()}>
            <ImageIcon size={18} />{t.ia_gallery}
          </Button>
        </div>
        {leyendo && (
          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 animate-in fade-in">
            <Loader2 size={13} className="animate-spin" />{t.ia_reading_photo}
          </p>
        )}
        <input ref={camara} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => leerFoto(e.target.files?.[0])} />
        <input ref={galeria} type="file" accept="image/*" className="hidden" onChange={e => leerFoto(e.target.files?.[0])} />
      </div>
      )}

      {/* Texto pegado (no usa IA: funciona siempre, incluso sin internet) */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-foreground">{t.ia_text_title}</p>
        <Textarea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          placeholder={t.ia_text_placeholder}
          className="min-h-[140px] text-sm"
        />
        <Button className="w-full h-10 text-sm gap-1.5" disabled={!texto.trim() || leyendo} onClick={generarDesdeTexto}>
          <ListChecks size={16} />{t.ia_generate}
        </Button>
        <p className="text-[10px] text-muted-foreground/80 text-center">{t.ia_text_hint}</p>
      </div>
    </div>
  );
}
