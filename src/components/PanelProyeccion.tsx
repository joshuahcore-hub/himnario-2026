// "Generar proyección" (1.12.0, Josué): en el computador, desde la portada de una minuta. Se elige la escritura de la
// portada SIN escribirla (Libro → Capítulo → Versículo → "hasta" opcional; por defecto Génesis 1:1), se ve el texto
// y "Generar" descarga "PPT Culto DD-MM-AAAA.pptx". Avisa qué alabanzas no tienen diapositivas.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from '@/lib/aviso';
import { ChevronDown, FolderOpen, Loader2, Presentation, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';
import { useI18n } from '@/lib/i18n/index';
import { ErrorDeRed } from '@/lib/api';
import type { MinutaData } from '@/lib/types';
import { carpetaGuardada, clavesDeMinuta, elegirCarpeta, generarProyeccion, leerBiblia, leerMeta, nombreArchivo, permisoCarpeta, puedeElegirCarpeta,
  type Biblia, type MetaProyeccion } from '@/lib/proyeccion';

/** (1.13.4, Josué) Largo máximo de la escritura: lo que cabe bien en la portada (≈3–4 versículos). */
const MAX_LETRAS = 420;

/** Lista desplegable propia (sin el control del sistema): botón + lista con desplazamiento. */
function Selector<T extends string | number>({ valor, opciones, etiqueta, onElegir, ancho }: {
  valor: T; opciones: { v: T; t: string }[]; etiqueta: string; onElegir: (v: T) => void; ancho: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  useAlTocarFuera(caja, abierto, useCallback(() => setAbierto(false), []));
  // Al abrir, la opción elegida queda a la vista.
  useEffect(() => {
    if (abierto) lista.current?.querySelector<HTMLElement>('[data-elegida]')?.scrollIntoView({ block: 'center' });
  }, [abierto]);
  const actual = opciones.find(o => o.v === valor);
  return (
    <div ref={caja} className={`relative ${ancho}`}>
      <p className="text-[10px] text-muted-foreground mb-1">{etiqueta}</p>
      <button type="button" onClick={() => setAbierto(a => !a)}
              className="w-full h-9 px-2.5 rounded-lg bg-muted text-sm font-medium text-foreground flex items-center justify-between gap-1">
        <span className="truncate">{actual?.t ?? '—'}</span>
        <ChevronDown size={13} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div ref={lista} className="absolute left-0 top-full mt-1 z-10 min-w-full max-h-64 overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-xl animate-in fade-in zoom-in-95 duration-150">
          {opciones.map(o => (
            <button key={String(o.v)} type="button" data-elegida={o.v === valor ? '' : undefined}
                    onClick={() => { onElegir(o.v); setAbierto(false); }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap hover:bg-muted ${o.v === valor ? 'font-semibold text-foreground bg-muted' : 'text-foreground'}`}>
              {o.t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PanelProyeccion({ abierto, onCerrar, minuta }: {
  abierto: boolean; onCerrar: () => void; minuta: Pick<MinutaData, 'cantos' | 'fecha'> & { id?: string };
}) {
  const { t } = useI18n();
  const [biblia, setBiblia] = useState<Biblia | null>(null);
  const [meta, setMeta] = useState<MetaProyeccion | null>(null);
  const [error, setError] = useState('');
  const [libro, setLibro] = useState(0);
  const [cap, setCap] = useState(1);
  const [vers, setVers] = useState(1);
  const [hasta, setHasta] = useState(0); // 0 = un solo versículo
  const [estado, setEstado] = useState<null | { etapa: 'bajando' | 'armando'; progreso?: number }>(null);
  // Carpeta donde se guarda (se recuerda entre veces).
  const [carpeta, setCarpeta] = useState<Awaited<ReturnType<typeof carpetaGuardada>>>(null);
  useEffect(() => { carpetaGuardada().then(setCarpeta); }, []);
  // (1.13.4, Josué) Al volver a abrir, la escritura vuelve a Génesis 1:1 (la carpeta se mantiene). Se reinicia al ABRIR.
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (abierto) { setLibro(0); setCap(1); setVers(1); setHasta(0); setEstado(null); }
  }

  useEffect(() => {
    if (!abierto) return;
    setError('');
    Promise.all([leerBiblia(), leerMeta()])
      .then(([b, m]) => { setBiblia(b); setMeta(m); })
      .catch(e => setError(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message));
  }, [abierto, t]);

  const libros = biblia?.libros ?? [];
  const capitulos = libros[libro]?.c ?? [];
  const versiculos = capitulos[cap - 1] ?? [];
  const elegirLibro = (l: number) => { setLibro(l); setCap(1); setVers(1); setHasta(0); };
  const elegirCap = (c: number) => { setCap(c); setVers(1); setHasta(0); };
  const elegirVers = (v: number) => { setVers(v); if (hasta && hasta <= v) setHasta(0); };

  const texto = useMemo(() => {
    if (!versiculos.length) return '';
    const fin = hasta || vers;
    return versiculos.slice(vers - 1, fin).join(' ');
  }, [versiculos, vers, hasta]);
  // Formato de la plantilla: dos espacios entre el libro y la cita ("Salmos  55:22").
  const referencia = libros[libro] ? `${libros[libro].n}  ${cap}:${vers}${hasta ? `-${hasta}` : ''}` : '';

  const sinDiapositivas = useMemo(
    () => (meta ? clavesDeMinuta(minuta).filter(x => !x.clave.startsWith('e:') && !meta.indice.himnos[x.clave]).map(x => x.canto) : []),
    [meta, minuta],
  );

  // "Hasta": solo los versículos con los que la escritura sigue cabiendo en la portada.
  const opcionesHasta = useMemo(() => {
    const out: { v: number; t: string }[] = [{ v: 0, t: '—' }];
    let largo = versiculos[vers - 1]?.length ?? 0;
    for (let v = vers + 1; v <= versiculos.length; v++) {
      largo += 1 + versiculos[v - 1].length;
      if (largo > MAX_LETRAS) break;
      out.push({ v, t: String(v) });
    }
    return out;
  }, [versiculos, vers]);

  const generar = async () => {
    if (!texto || estado) return;
    // El permiso de la carpeta se pide AQUÍ, dentro del clic (después ya no se puede).
    const destino = carpeta && (await permisoCarpeta(carpeta)) ? carpeta : null;
    try {
      const r = await generarProyeccion(minuta, { versiculo: texto, referencia }, setEstado, destino);
      toast.success(r.carpeta ? `${t.proy_guardado(r.carpeta)}: ${nombreArchivo(minuta.fecha)}` : `${t.proy_listo}: ${nombreArchivo(minuta.fecha)}`);
      onCerrar();
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : (e.message || t.proy_error));
    } finally {
      setEstado(null);
    }
  };

  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o && !estado) onCerrar(); }}>
      {/* Nunca más alto que la pantalla: encabezado y selectores fijos; lo de abajo se desplaza (también con la rueda). */}
      <DialogContent capa="z-[70]" className="max-w-[520px] rounded-2xl gap-4 max-h-[90dvh] flex flex-col" onOpenAutoFocus={e => e.preventDefault()}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base flex items-center gap-2"><Presentation size={18} />{t.proy_titulo}</DialogTitle>
          <DialogDescription className="text-xs">{t.proy_texto}</DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : !biblia || !meta ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground"><Loader2 size={20} className="animate-spin" /></div>
        ) : (
          <>
            <div className="flex gap-2 shrink-0">
              <Selector etiqueta={t.proy_libro} ancho="flex-1 min-w-0" valor={libro} onElegir={elegirLibro}
                        opciones={libros.map((l, i) => ({ v: i, t: l.n }))} />
              <Selector etiqueta={t.proy_capitulo} ancho="w-20" valor={cap} onElegir={elegirCap}
                        opciones={capitulos.map((_, i) => ({ v: i + 1, t: String(i + 1) }))} />
              <Selector etiqueta={t.proy_versiculo} ancho="w-20" valor={vers} onElegir={elegirVers}
                        opciones={versiculos.map((_, i) => ({ v: i + 1, t: String(i + 1) }))} />
              <Selector etiqueta={t.proy_hasta} ancho="w-20" valor={hasta} onElegir={v => setHasta(Number(v))}
                        opciones={opcionesHasta} />
            </div>
            <div className="min-h-0 overflow-y-auto space-y-3 -mx-1 px-1">
            {/* Vista previa: así va en la portada (en MAYÚSCULAS y centrado). */}
            <div className="rounded-xl bg-muted px-4 py-3 space-y-1.5">
              <p className="text-sm text-foreground leading-relaxed">{texto}</p>
              <p className="text-xs font-semibold text-muted-foreground text-right whitespace-pre">{referencia}</p>
            </div>
            {sinDiapositivas.length > 0 && (
              <div className="flex gap-2 text-[11px] text-amber-700 dark:text-amber-400">
                <TriangleAlert size={14} className="shrink-0 mt-px" />
                <p>{t.proy_sin_diapositivas} {sinDiapositivas.map(c => (c.hymnNumber ? `${c.hymnNumber} ${c.title}` : c.title)).join(' · ')}</p>
              </div>
            )}
            </div>
            {/* Dónde se guarda: la carpeta elegida se recuerda (si el navegador lo permite). */}
            {puedeElegirCarpeta() && (
              <div className="shrink-0 flex items-center gap-2 text-xs text-muted-foreground">
                <FolderOpen size={14} className="shrink-0" />
                <span>{t.proy_guardar_en}</span>
                <span className="font-semibold text-foreground truncate">{carpeta?.name ?? t.proy_descargas}</span>
                <button type="button" onClick={async () => { const c = await elegirCarpeta(); if (c) setCarpeta(c); }}
                        className="ml-1 underline underline-offset-2 hover:text-foreground">{carpeta ? t.proy_cambiar : t.proy_elegir_carpeta}</button>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 shrink-0">
              {estado && (
                <span className="text-xs text-muted-foreground">
                  {estado.etapa === 'bajando' ? `${t.proy_bajando} ${Math.round((estado.progreso ?? 0) * 100)} %` : t.proy_armando}
                </span>
              )}
              <Button onClick={generar} className="h-9 px-4 text-sm gap-1.5" style={{ opacity: estado ? 0.6 : 1 }}>
                {estado ? <Loader2 size={14} className="animate-spin" /> : <Presentation size={14} />}{t.proy_generar}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
