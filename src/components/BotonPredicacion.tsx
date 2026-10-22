// "Añadir PowerPoint" (1.22.0, Josué 22-10-2026): en el computador (el notebook del culto), abajo a la derecha. Se
// arrastra ahí el PowerPoint que el hermano usa al predicar (fondo negro, con acotaciones) y queda listo para proyectar
// (fondo claro, sin acotaciones; ver src/lib/predicacion.ts).
// (1.22.3, Josué) Guardar: se abre la ventana de GUARDAR ya en el Escritorio, con el nombre puesto; "Guardar" y listo, o
// se cambia la carpeta (la próxima vez parte en la última usada). Sin tocar la configuración de Chrome. OJO: la ventana
// de ELEGIR CARPETA no sirve, Chrome no deja el Escritorio ("contiene archivos del sistema"); la de guardar archivo sí.
// Soltar un archivo no cuenta como toque, por eso la ventana se abre al tocar "Guardar".
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilePlus2, Loader2, Save } from 'lucide-react';
import { toast } from '@/lib/aviso';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';
import { useI18n } from '@/lib/i18n/index';
import { guardarArchivo } from '@/lib/proyeccion';

const MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export default function BotonPredicacion() {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [listo, setListo] = useState<{ blob: Blob; nombre: string; diapos: number } | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useAlTocarFuera(caja, abierto, useCallback(() => setAbierto(false), []));

  // Al arrastrar un archivo sobre la ventana aparece la zona para soltarlo; soltarlo en otro lado no abre el archivo
  // en el navegador.
  useEffect(() => {
    let dentro = 0;
    const conArchivo = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files');
    const entra = (e: DragEvent) => { if (conArchivo(e)) { dentro++; setArrastrando(true); } };
    const sale = (e: DragEvent) => { if (conArchivo(e) && --dentro <= 0) { dentro = 0; setArrastrando(false); } };
    const encima = (e: DragEvent) => { if (conArchivo(e)) e.preventDefault(); };
    const suelta = (e: DragEvent) => { if (conArchivo(e)) { e.preventDefault(); dentro = 0; setArrastrando(false); } };
    window.addEventListener('dragenter', entra);
    window.addEventListener('dragleave', sale);
    window.addEventListener('dragover', encima);
    window.addEventListener('drop', suelta);
    return () => {
      window.removeEventListener('dragenter', entra);
      window.removeEventListener('dragleave', sale);
      window.removeEventListener('dragover', encima);
      window.removeEventListener('drop', suelta);
    };
  }, []);

  const procesar = async (f: File | undefined) => {
    if (!f || trabajando) return;
    if (!/\.pptx$/i.test(f.name)) { toast.error(t.pred_error); return; }
    setTrabajando(true);
    setListo(null);
    setAbierto(true);
    try {
      const [{ default: JSZip }, { convertirPredicacion }] = await Promise.all([import('jszip'), import('@/lib/predicacion')]);
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      const diapos = await convertirPredicacion(zip);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: MIME });
      setListo({ blob, nombre: `${f.name.replace(/\.pptx$/i, '')} (proyectar).pptx`, diapos });
    } catch {
      toast.error(t.pred_error);
      setAbierto(false);
    } finally {
      setTrabajando(false);
      if (input.current) input.current.value = '';
    }
  };

  const guardar = async () => {
    if (!listo) return;
    const ventana = (window as any).showSaveFilePicker;
    if (!ventana) { // navegador sin ventana de guardar: descarga normal
      await guardarArchivo(listo.blob, listo.nombre, null);
      toast.success(`${t.proy_listo}: ${listo.nombre}`);
      setListo(null); setAbierto(false);
      return;
    }
    try {
      const archivo = await ventana({
        id: 'predicacion', startIn: 'desktop', suggestedName: listo.nombre,
        types: [{ description: 'PowerPoint', accept: { [MIME]: ['.pptx'] } }],
      });
      const w = await archivo.createWritable();
      await w.write(listo.blob);
      await w.close();
      toast.success(`${t.pred_guardado}: ${archivo.name}`);
      setListo(null); setAbierto(false);
    } catch (e: any) {
      if (e?.name === 'AbortError') return; // canceló la ventana: sigue listo para guardar
      await guardarArchivo(listo.blob, listo.nombre, null);
      toast.success(`${t.proy_listo}: ${listo.nombre}`);
      setListo(null); setAbierto(false);
    }
  };

  const soltar = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setArrastrando(false);
    procesar(e.dataTransfer.files?.[0]);
  };
  const recibir = { onDragOver: (e: React.DragEvent) => e.preventDefault(), onDrop: soltar };

  return (
    <div ref={caja} className="absolute right-4 top-1/2 -translate-y-1/2">
      <input ref={input} type="file" accept={`.pptx,${MIME}`} className="hidden" onChange={e => procesar(e.target.files?.[0])} />
      <button type="button" {...recibir} onClick={() => setAbierto(a => !a)}
              className="h-9 px-3.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-md flex items-center gap-1.5 hover:opacity-90">
        {trabajando ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
        {trabajando ? t.pred_convirtiendo : t.pred_boton}
      </button>

      {/* Zona grande para soltar mientras se arrastra un archivo. */}
      {arrastrando && (
        <div {...recibir}
             className="fixed right-4 bottom-20 w-72 h-40 z-[80] rounded-2xl border-2 border-dashed border-primary bg-card/95 shadow-xl flex flex-col items-center justify-center gap-2 text-sm font-semibold text-foreground animate-in fade-in zoom-in-95 duration-150">
          <FilePlus2 size={26} className="text-primary" />
          {t.pred_soltar}
        </div>
      )}

      {abierto && !arrastrando && (
        <div className="absolute right-0 bottom-full mb-3 w-80 z-[60] rounded-2xl border border-border bg-card p-4 shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <p className="text-sm font-semibold text-foreground">{t.pred_boton}</p>
          {listo ? (
            <>
              <div className="rounded-xl bg-muted px-3 py-2">
                <p className="text-sm font-medium text-foreground break-words">{listo.nombre}</p>
                <p className="text-[11px] text-muted-foreground">{t.pred_listo(listo.diapos)}</p>
              </div>
              <button type="button" onClick={guardar}
                      className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5">
                <Save size={15} />{t.pred_guardar}
              </button>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{t.pred_donde}</p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">{t.pred_texto}</p>
              <button type="button" {...recibir} onClick={() => input.current?.click()} disabled={trabajando}
                      className="w-full h-20 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-1.5">
                {trabajando ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}
                {trabajando ? t.pred_convirtiendo : t.pred_elegir}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
