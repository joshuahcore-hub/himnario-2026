// Proyección (1.12.0, Josué): "Generar proyección" en el computador del culto. Baja (una sola vez por versión) el
// PowerPoint maestro y la Biblia, que el servidor entrega solo a quien tiene el permiso, y arma el archivo
// "PPT Culto DD-MM-AAAA.pptx" con src/lib/armarProyeccion.ts. Todo queda guardado en el computador (Cache Storage):
// la siguiente vez es inmediato.
import { llaveDispositivo, ErrorDeRed } from '@/lib/api';
import type { MinutaData, ParsedSong } from '@/lib/types';
import { cadena, esMarcador, formatearFecha } from '@/lib/minutaUtils';
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
    // (1.13.4, Josué) Especial: una diapositiva "ESPECIAL <NOMBRE>" (ver armarProyeccion).
    if (c.isEspecial) { out.push({ clave: `e:${(c.nombre ?? '').toLocaleUpperCase('es')}`, canto: c }); return; }
    if (esMarcador(c)) return;
    out.push({ clave: c.hymnNumber && c.found !== false ? String(c.hymnNumber) : claveTitulo(c.title), canto: c });
  };
  for (const c of m.cantos) cadena(c).forEach(agregar); // (1.18.2) grupos de cualquier tamaño
  return out;
}

export const nombreArchivo = (fecha: string) => `PPT Culto ${formatearFecha(fecha)}.pptx`;

// ---- Carpeta donde se guarda (1.13.4, Josué: "elegirla una vez y que la recuerde", p. ej. el Escritorio del PC del
// culto). Con la API de archivos del navegador (Chrome/Edge); el permiso de la carpeta queda guardado en IndexedDB.
// Si el navegador no la tiene, se descarga como antes (carpeta de Descargas).
export type Carpeta = FileSystemDirectoryHandle & {
  queryPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
  requestPermission(o: { mode: 'readwrite' }): Promise<PermissionState>;
};
export const puedeElegirCarpeta = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window;

function baseCarpeta(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const r = indexedDB.open('himnario-proyeccion', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('carpeta');
    r.onsuccess = () => ok(r.result);
    r.onerror = () => mal(r.error);
  });
}
export async function carpetaGuardada(): Promise<Carpeta | null> {
  if (!puedeElegirCarpeta()) return null;
  try {
    const db = await baseCarpeta();
    return await new Promise(ok => {
      const r = db.transaction('carpeta').objectStore('carpeta').get('destino');
      r.onsuccess = () => ok((r.result as Carpeta) ?? null);
      r.onerror = () => ok(null);
    });
  } catch { return null; }
}
/** Abre el selector de carpetas (empieza en el Escritorio) y la recuerda. null si se canceló. */
export async function elegirCarpeta(): Promise<Carpeta | null> {
  try {
    const c: Carpeta = await (window as any).showDirectoryPicker({ id: 'proyeccion', mode: 'readwrite', startIn: 'desktop' });
    const db = await baseCarpeta();
    await new Promise<void>((ok, mal) => {
      const tx = db.transaction('carpeta', 'readwrite');
      tx.objectStore('carpeta').put(c, 'destino');
      tx.oncomplete = () => ok();
      tx.onerror = () => mal(tx.error);
    });
    return c;
  } catch { return null; }
}
/** Pide (si hace falta) el permiso de escribir en la carpeta. Llamarlo AL TOCAR "Generar" (necesita el toque). */
export async function permisoCarpeta(c: Carpeta): Promise<boolean> {
  try {
    if ((await c.queryPermission({ mode: 'readwrite' })) === 'granted') return true;
    return (await c.requestPermission({ mode: 'readwrite' })) === 'granted';
  } catch { return false; }
}

/** (1.22.0) Guarda el archivo en la carpeta (con permiso ya dado) o, si no se puede, lo descarga. Devuelve la carpeta o null. */
export async function guardarArchivo(blob: Blob, nombre: string, carpeta: Carpeta | null): Promise<string | null> {
  if (carpeta) {
    try {
      const archivo = await carpeta.getFileHandle(nombre, { create: true });
      const w = await (archivo as any).createWritable();
      await w.write(blob);
      await w.close();
      return carpeta.name;
    } catch { /* sin permiso o carpeta movida: se descarga */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return null;
}

/** Arma el PowerPoint y lo guarda en la carpeta elegida (o lo descarga). Devuelve dónde quedó. */
export async function generarProyeccion(minuta: Pick<MinutaData, 'cantos' | 'fecha'> & { id?: string },
  portada: { versiculo: string; referencia: string },
  onEstado: (e: { etapa: 'bajando' | 'armando'; progreso?: number }) => void,
  carpeta: Carpeta | null = null): Promise<{ carpeta: string | null }> {
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
  // Aviso al administrador (no atrasa nada; si falla, da igual).
  if (minuta.id) fetch('/api/proyeccion/generada', {
    method: 'POST', headers: { ...cabeceras(), 'content-type': 'application/json' }, body: JSON.stringify({ minutaId: minuta.id }),
  }).catch(() => {});
  if (carpeta) {
    try {
      const archivo = await carpeta.getFileHandle(nombreArchivo(minuta.fecha), { create: true });
      const w = await (archivo as any).createWritable();
      await w.write(blob);
      await w.close();
      return { carpeta: carpeta.name };
    } catch { /* sin permiso o carpeta movida: se descarga */ }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo(minuta.fecha);
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return { carpeta: null };
}

/** Computador: mouse y pantalla ancha (en el celular la opción no aparece). */
export const esComputador = () => typeof window !== 'undefined'
  && window.matchMedia('(hover: hover) and (pointer: fine)').matches && window.innerWidth >= 900;
