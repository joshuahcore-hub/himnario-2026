// Canciones que NO están en el himnario (1.13.0, Josué): se escriben a mano en el editor (título, tonalidad opcional,
// imagen opcional) y quedan GUARDADAS para volver a usarlas. Se ven en Himnario → "Canciones que no están en el
// himnario" y en los buscadores. Copia local para verlas sin internet; sus imágenes las guarda el service worker.
import { useEffect, useState } from 'react';
import { api, llaveDispositivo, ErrorDeRed } from '@/lib/api';

export type Tempo = 'lenta' | 'rapida';
export interface CancionExtra { id: string; titulo: string; tonalidad: string | null; tempo?: Tempo | null; imagen: string | null; actualizado: string }
export interface DatosCancionExtra { titulo: string; tonalidad: string | null; tempo: Tempo | null; imagen: string | null }

/** (1.18.2, Josué) Siempre en orden alfabético (sin tildes ni mayúsculas). */
const ordenar = (l: CancionExtra[]) => [...l].sort((a, b) => normalizarTitulo(a.titulo).localeCompare(normalizarTitulo(b.titulo)));

const GUARDADO = 'himnario_canciones_extra';
let lista: CancionExtra[] = (() => {
  try { return JSON.parse(localStorage.getItem(GUARDADO) || '[]'); } catch { return []; }
})();
const oyentes = new Set<(l: CancionExtra[]) => void>();
function fijar(l: CancionExtra[]) {
  lista = l;
  try { localStorage.setItem(GUARDADO, JSON.stringify(l)); } catch { /* sin espacio */ }
  oyentes.forEach(f => f(l));
}

export async function refrescarCancionesExtra() {
  try { fijar(ordenar(await api<CancionExtra[]>('canciones-extra'))); } catch { /* sin internet: la copia local */ }
}

export function useCancionesExtra(): CancionExtra[] {
  const [l, setL] = useState(lista);
  useEffect(() => {
    oyentes.add(setL);
    refrescarCancionesExtra();
    return () => { oyentes.delete(setL); };
  }, []);
  return l;
}

export const cancionesExtra = () => lista;

/** Igual que el servidor: sin tildes, minúsculas, solo letras/números. */
export const normalizarTitulo = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export const buscarCancionExtra = (titulo: string) => {
  const c = normalizarTitulo(titulo);
  return lista.find(x => normalizarTitulo(x.titulo) === c) ?? null;
};

export async function guardarCancionExtra(datos: DatosCancionExtra) {
  const c = await api<CancionExtra>('canciones-extra', { metodo: 'POST', datos });
  fijar(ordenar([...lista.filter(x => x.id !== c.id && normalizarTitulo(x.titulo) !== normalizarTitulo(c.titulo)), c]));
  return c;
}

/** (1.18.2, Josué) Editar una guardada: se REEMPLAZA (antes, al cambiarle el título, aparecía como otra nueva).
 *  Optimista: la lista cambia al instante; si el servidor falla, vuelve como estaba y se lanza el error. */
export async function editarCancionExtra(id: string, datos: DatosCancionExtra) {
  const antes = lista;
  fijar(ordenar(lista.map(x => (x.id === id ? { ...x, ...datos } : x))));
  try {
    const c = await api<CancionExtra>(`canciones-extra/${id}`, { metodo: 'PATCH', datos });
    fijar(ordenar(lista.map(x => (x.id === id ? c : x))));
    return c;
  } catch (e) { fijar(antes); throw e; }
}

export async function eliminarCancionExtra(id: string) {
  const antes = lista;
  fijar(lista.filter(x => x.id !== id));
  try { await api(`canciones-extra/${id}`, { metodo: 'DELETE' }); } catch (e) { fijar(antes); throw e; }
}

export const urlImagen = (id: string) => `/api/imagenes/${id}`;

/** Achica la imagen (lado mayor 2000 px: letra legible con zoom) y la sube. Devuelve su id. */
export async function subirImagen(archivo: File): Promise<string> {
  const bmp = await createImageBitmap(archivo);
  const escala = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(bmp.width * escala);
  lienzo.height = Math.round(bmp.height * escala);
  lienzo.getContext('2d')!.drawImage(bmp, 0, 0, lienzo.width, lienzo.height);
  const blob = await new Promise<Blob>((ok, mal) => lienzo.toBlob(b => (b ? ok(b) : mal(new Error('No se pudo leer la imagen'))), 'image/webp', 0.88));
  let r: Response;
  try {
    r = await fetch('/api/imagenes', { method: 'POST', body: blob, headers: { 'content-type': 'image/webp', Authorization: `Bearer ${llaveDispositivo()}` } });
  } catch {
    throw new ErrorDeRed('Sin conexión a internet.');
  }
  if (!r.ok) throw new Error((await r.json().catch(() => null))?.error || `Error ${r.status}`);
  return (await r.json()).id;
}
