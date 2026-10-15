// Proyección (1.12.0, Josué): "Generar proyección" en el computador del culto. Baja (una sola vez por versión) el
// PowerPoint maestro y la Biblia, que el servidor entrega solo a quien tiene el permiso, y arma el archivo
// "PPT Culto DD-MM-AAAA.pptx" con src/lib/armarProyeccion.ts. Todo queda guardado en el computador (Cache Storage):
// la siguiente vez es inmediato.
import { llaveDispositivo, ErrorDeRed } from '@/lib/api';
import type { MinutaData, ParsedSong } from '@/lib/types';
import { esMarcador, formatearFecha } from '@/lib/minutaUtils';
import { claveTitulo, type IndiceMaestro } from '@/lib/armarProyeccion';

export interface MetaProyeccion { version: string; partes: number; bytes: number; indice: IndiceMaestro }
export interface Biblia { libros: { n: string; c: string[][] }[] }

const CACHE = 'himnario-proyeccion';
const cabeceras = () => ({ Authorization: `Bearer ${llaveDispositivo()}` });

async function pedir(ruta: string): Promise<Response> {
  let r: Response;
  try {
    r = await fetch(`/api/proyeccion/${ruta}`, { headers: cabeceras(), cache: 'no-store' });
  } catch {
    throw new ErrorDeRed('Sin conexión a internet.');
  }
  if (!r.ok) {
    const e = await r.json().catch(() => null);
    throw new Error(e?.error || `Error ${r.status}`);
  }
  return r;
}

/** Con caché: si ya se bajó, se usa lo guardado (sin internet también). */
async function conCache(clave: string, ruta: string, onBytes?: (n: number) => void): Promise<Response> {
  const cache = 'caches' in window ? await caches.open(CACHE) : null;
  const guardado = await cache?.match(clave);
  if (guardado) { onBytes?.(Number(guardado.headers.get('x-bytes') || 0)); return guardado; }
  const r = await pedir(ruta);
  const lector = r.body!.getReader();
  const trozos: Uint8Array[] = [];
  let n = 0;
  for (;;) {
    const { done, value } = await lector.read();
    if (done) break;
    trozos.push(value);
    n += value.length;
    onBytes?.(value.length);
  }
  const cuerpo = new Blob(trozos as BlobPart[]);
  const respuesta = new Response(cuerpo, { headers: { 'content-type': r.headers.get('content-type') || '', 'x-bytes': String(n) } });
  await cache?.put(clave, respuesta.clone());
  return respuesta;
}

let metaGuardada: MetaProyeccion | null = null;
export async function leerMeta(): Promise<MetaProyeccion> {
  try {
    metaGuardada = await (await pedir('meta')).json();
    localStorage.setItem('himnario_proyeccion_meta', JSON.stringify(metaGuardada));
  } catch (e) {
    // Sin internet: la última que se usó (su maestro ya está guardado).
    const g = localStorage.getItem('himnario_proyeccion_meta');
    if (!g || !(e instanceof ErrorDeRed)) throw e;
    metaGuardada = JSON.parse(g);
  }
  return metaGuardada!;
}

let bibliaGuardada: Promise<Biblia> | null = null;
export function leerBiblia(): Promise<Biblia> {
  bibliaGuardada ??= conCache('/proyeccion/biblia', 'biblia').then(r => r.json()).catch(e => { bibliaGuardada = null; throw e; });
  return bibliaGuardada;
}

/** El maestro completo (en partes). onProgreso recibe 0..1. Borra versiones viejas guardadas. */
export async function bajarMaestro(meta: MetaProyeccion, onProgreso: (p: number) => void): Promise<Blob> {
  let bajados = 0;
  const partes: Blob[] = [];
  for (let i = 0; i < meta.partes; i++) {
    const r = await conCache(`/proyeccion/maestro/${meta.version}/${i}`, `parte/${meta.version}/${i}`, n => {
      bajados += n;
      onProgreso(Math.min(1, bajados / meta.bytes));
    });
    partes.push(await r.blob());
  }
  if ('caches' in window) {
    const cache = await caches.open(CACHE);
    for (const k of await cache.keys()) {
      const u = new URL(k.url);
      if (u.pathname.startsWith('/proyeccion/maestro/') && !u.pathname.includes(`/${meta.version}/`)) await cache.delete(k);
    }
  }
  return new Blob(partes);
}

/** Qué diapositivas lleva cada canto: número del himnario, o el título si no está en el himnario. */
export function clavesDeMinuta(m: Pick<MinutaData, 'cantos'>): { clave: string; canto: ParsedSong }[] {
  const out: { clave: string; canto: ParsedSong }[] = [];
  const agregar = (c: ParsedSong) => {
    if (esMarcador(c)) return;
    out.push({ clave: c.hymnNumber && c.found !== false ? String(c.hymnNumber) : claveTitulo(c.title), canto: c });
  };
  for (const c of m.cantos) { agregar(c); if (c.groupedWith) agregar(c.groupedWith); }
  return out;
}

export const nombreArchivo = (fecha: string) => `PPT Culto ${formatearFecha(fecha)}.pptx`;

/** Arma el PowerPoint y lo entrega como descarga. */
export async function generarProyeccion(minuta: Pick<MinutaData, 'cantos' | 'fecha'>, portada: { versiculo: string; referencia: string },
  onEstado: (e: { etapa: 'bajando' | 'armando'; progreso?: number }) => void): Promise<void> {
  const meta = await leerMeta();
  onEstado({ etapa: 'bajando', progreso: 0 });
  const maestro = await bajarMaestro(meta, p => onEstado({ etapa: 'bajando', progreso: p }));
  onEstado({ etapa: 'armando' });
  const [{ default: JSZip }, { armarProyeccion }] = await Promise.all([import('jszip'), import('@/lib/armarProyeccion')]);
  const zip = await JSZip.loadAsync(maestro);
  await armarProyeccion(zip, meta.indice, clavesDeMinuta(minuta).map(x => x.clave), portada);
  const blob = await zip.generateAsync({
    type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 },
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo(minuta.fecha);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Computador: mouse y pantalla ancha (en el celular la opción no aparece). */
export const esComputador = () => typeof window !== 'undefined'
  && window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 900;
