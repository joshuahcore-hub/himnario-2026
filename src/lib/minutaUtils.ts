import type { ParsedSong, MinutaData } from '@/lib/types';
import type { CachedHymn } from '@/lib/hymnCache';

/** Canto de la minuta a partir de un himno del himnario. */
export function cantoDesdeHimno(h: CachedHymn): ParsedSong {
  return {
    position: 0,
    title: h.title,
    key: h.key,
    hymnNumber: h.hymn_number,
    found: true,
    firstLine: h.first_line,
  };
}

export const PALABRA: ParsedSong = { position: 0, title: 'PALABRA', key: null, hymnNumber: null, found: true, isPalabra: true };
export const ORACION: ParsedSong = { position: 0, title: 'ORACIÓN', key: null, hymnNumber: null, found: true, isOracion: true };

/** (1.13.0) Especial: "Especial" fijo + el nombre que se escriba. */
export const especial = (nombre: string): ParsedSong =>
  ({ position: 0, title: 'ESPECIAL', key: null, hymnNumber: null, found: true, isEspecial: true, nombre: nombre.trim() });

/** (1.13.0) Alabanza fuera del himnario. */
export const cantoFuera = (titulo: string, tonalidad: string | null, imagen: string | null, tempo: 'lenta' | 'rapida' | null = null): ParsedSong =>
  ({ position: 0, title: titulo.trim(), key: tonalidad || null, hymnNumber: null, found: true, fuera: true, imagen, ...(tempo ? { tempo } : {}) });

/** (1.18.2) Texto libre (lo que se quiera escribir entre medio). */
export const MAX_TEXTO = 120;
export const textoLibre = (texto: string): ParsedSong =>
  ({ position: 0, title: 'TEXTO', key: null, hymnNumber: null, found: true, isTexto: true, texto: texto.trim().slice(0, MAX_TEXTO) });

/** Palabra, Oración, Especial y Texto: no son alabanzas (no llevan número). */
export const esMarcador = (c: ParsedSong) => !!(c.isPalabra || c.isOracion || c.isEspecial || c.isTexto);

/** (1.18.2) Las alabanzas de un grupo en orden: la principal y las unidas a ella (cada una sin su `groupedWith`). */
export function cadena(c: ParsedSong): ParsedSong[] {
  const r: ParsedSong[] = [];
  for (let x: ParsedSong | null | undefined = c; x; x = x.groupedWith) r.push({ ...x, groupedWith: null });
  return r;
}

/** Vuelve a armar un grupo a partir de su lista (la primera lleva a las demás). */
export function armarCadena(lista: ParsedSong[]): ParsedSong {
  return lista.reduceRight<ParsedSong | null>((sig, x) => ({ ...x, groupedWith: sig }), null)!;
}

/** (1.18.2, Josué) Títulos que son una CITA (Hebreos 13:8, Salmo 18…): en la portada llevan cómo empieza la letra. */
export const esCita = (titulo: string) => /^\d?\s?\p{L}+\s+\d+([:.]\d+(-\d+)?)?$/u.test(titulo.trim());

/** Comienzo de la letra para una cita: las primeras palabras (sin "…": lo pone quien lo muestra, pegado a la última). */
export function comienzoLetra(primera: string | null | undefined, palabras = 6): string[] | null {
  if (!primera) return null;
  const p = primera.split(/\s+/).filter(Boolean).slice(0, palabras);
  return p.length ? p : null;
}

/** "Especial Javiera" (sin punto, pedido de Josué). */
export const textoEspecial = (c: ParsedSong, palabra = 'Especial') => (c.nombre ? `${palabra} ${c.nombre}` : palabra);

/** Numera los cantos 1, 2, 3…; PALABRA/ORACIÓN llevan 0 y un canto agrupado ocupa dos números (como la app original). */
export function renumerar(cantos: ParsedSong[]): ParsedSong[] {
  let n = 1;
  return cantos.map(c => {
    if (esMarcador(c)) return { ...c, position: 0 };
    const r = { ...c, position: n, isGrouped: !!c.groupedWith };
    n += cadena(c).length;
    return r;
  });
}

export function formatearFecha(fecha: string): string {
  const [y, m, d] = fecha.split('-');
  return d && m && y ? `${d}-${m}-${y}` : fecha;
}

export function tituloVisible(m: Pick<MinutaData, 'titulo' | 'fecha'>): string {
  return m.titulo === 'Minuta' ? `Minuta ${formatearFecha(m.fecha)}` : m.titulo;
}

/** Texto de la minuta para compartir por WhatsApp. */
export function textoParaCompartir(m: Pick<MinutaData, 'id' | 'titulo' | 'fecha' | 'cantos'>, origen: string): string {
  const linea = (c: ParsedSong, pos: number) =>
    `${pos}. ${c.title}${c.key ? ` (${c.key})` : ''}${c.hymnNumber ? ` #${c.hymnNumber}` : ''}`;
  const lineas: string[] = [`*${tituloVisible(m)}* — ${formatearFecha(m.fecha)}`, ''];
  for (const c of renumerar(m.cantos)) {
    if (c.isPalabra) lineas.push('— PALABRA —');
    else if (c.isOracion) lineas.push('— ORACIÓN —');
    else if (c.isEspecial) lineas.push(`— ${textoEspecial(c, 'ESPECIAL')} —`);
    else if (c.isTexto) lineas.push(`— ${c.texto ?? ''} —`);
    else {
      if (c.ofrenda) lineas.push('— OFRENDA —');
      cadena(c).forEach((x, k) => lineas.push(linea(x, c.position + k)));
    }
  }
  lineas.push('', `${origen}/minuta/${m.id}`);
  return lineas.join('\n');
}

export function compartirPorWhatsApp(texto: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
}
