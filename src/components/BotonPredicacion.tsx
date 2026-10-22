// "Añadir PowerPoint" (1.22.0, Josué 22-10-2026): en el computador (el notebook del culto), abajo a la derecha. Se
// arrastra ahí el PowerPoint que el hermano usa al predicar (fondo negro, con acotaciones) y se guarda solo, listo para
// proyectar (fondo claro, sin acotaciones; ver src/lib/predicacion.ts). Se DESCARGA al tiro: para que caiga en el
// Escritorio, Chrome de ese computador descarga en el Escritorio (Configuración → Descargas, una vez). Opcional: otra
// carpeta propia; si el navegador vuelve a pedir permiso para ella, queda esperando un toque en "Guardar".
import { useCallback, useEffect, useRef, useState } from 'react';
import { FilePlus2, FolderOpen, Loader2 } from 'lucide-react';
import { toast } from '@/lib/aviso';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';
import { useI18n } from '@/lib/i18n/index';
import { carpetaGuardada, elegirCarpeta, guardarArchivo, olvidarCarpeta, permisoCarpeta, permisoYaDado, puedeElegirCarpeta, type Carpeta } from '@/lib/proyeccion';

const MIME = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

export default function BotonPredicacion() {
  const { t } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [trabajando, setTrabajando] = useState(false);
  const [pendiente, setPendiente] = useState<{ blob: Blob; nombre: string } | null>(null);
  const [carpeta, setCarpeta] = useState<Carpeta | null>(null);
  useEffect(() => { carpetaGuardada('predicacion').then(setCarpeta); }, []);
  const caja = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useAlTocarFuera(caja, abierto && !pendiente, useCallback(() => setAbierto(false), []));

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

  const listo = (donde: string | null, nombre: string) =>
    toast.success(donde ? `${t.proy_guardado(donde)}: ${nombre}` : `${t.proy_listo}: ${nombre}`);

  const procesar = async (f: File | undefined) => {
    if (!f || trabajando) return;
    if (!/\.pptx$/i.test(f.name)) { toast.error(t.pred_error); return; }
    setTrabajando(true);
    try {
      const [{ default: JSZip }, { convertirPredicacion }] = await Promise.all([import('jszip'), import('@/lib/predicacion')]);
      const zip = await JSZip.loadAsync(await f.arrayBuffer());
      await convertirPredicacion(zip);
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 }, mimeType: MIME });
      const nombre = `${f.name.replace(/\.pptx$/i, '')} (proyectar).pptx`;
      // Sin carpeta propia: descarga al tiro (Chrome NO deja escribir directo en el Escritorio: "contiene archivos del
      // sistema", foto de Josué 22-10-2026; el Escritorio se logra con la carpeta de descargas de Chrome en el Escritorio).
      // Con carpeta propia que volvió a pedir permiso: soltar no cuenta como toque, se espera el toque en "Guardar".
      if (carpeta && !(await permisoYaDado(carpeta))) { setPendiente({ blob, nombre }); setAbierto(true); return; }
      listo(await guardarArchivo(blob, nombre, carpeta), nombre);
      setAbierto(false);
    } catch {
      toast.error(t.pred_error);
    } finally {
      setTrabajando(false);
      if (input.current) input.current.value = '';
    }
  };

  const guardarPendiente = async () => {
    if (!pendiente) return;
    const destino = carpeta && (await permisoCarpeta(carpeta)) ? carpeta : null;
    listo(await guardarArchivo(pendiente.blob, pendiente.nombre, destino), pendiente.nombre);
    setPendiente(null);
    setAbierto(false);
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
          <p className="text-xs text-muted-foreground leading-relaxed">{t.pred_texto}</p>
          {pendiente ? (
            <button type="button" onClick={guardarPendiente}
                    className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">
              {t.pred_guardar(carpeta?.name ?? t.pred_descargas)}
            </button>
          ) : (
            <button type="button" {...recibir} onClick={() => input.current?.click()} disabled={trabajando}
                    className="w-full h-20 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center gap-1.5">
              {trabajando ? <Loader2 size={15} className="animate-spin" /> : <FilePlus2 size={15} />}{t.pred_elegir}
            </button>
          )}
          {puedeElegirCarpeta() && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FolderOpen size={14} className="shrink-0" />
              <span>{t.proy_guardar_en}</span>
              <span className="font-semibold text-foreground truncate">{carpeta?.name ?? t.pred_descargas}</span>
              {/* Otra carpeta (no puede ser el Escritorio mismo, sí una carpeta dentro de él); o volver a las descargas. */}
              <button type="button" onClick={async () => {
                        if (carpeta) { await olvidarCarpeta('predicacion'); setCarpeta(null); return; }
                        const c = await elegirCarpeta('predicacion'); if (c) setCarpeta(c);
                      }}
                      className="ml-auto shrink-0 underline underline-offset-2 hover:text-foreground">{carpeta ? t.pred_usar_descargas : t.proy_cambiar}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
