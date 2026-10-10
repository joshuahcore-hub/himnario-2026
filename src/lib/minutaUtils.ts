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

export const esMarcador = (c: ParsedSong) => !!(c.isPalabra || c.isOracion);

/** Numera los cantos 1, 2, 3…; PALABRA/ORACIÓN llevan 0 y un canto agrupado ocupa dos números (como la app original). */
export function renumerar(cantos: ParsedSong[]): ParsedSong[] {
  let n = 1;
  return cantos.map(c => {
    if (esMarcador(c)) return { ...c, position: 0 };
    const r = { ...c, position: n, isGrouped: !!c.groupedWith };
    n += c.groupedWith ? 2 : 1;
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
    else {
      lineas.push(linea(c, c.position));
      if (c.groupedWith) lineas.push(linea(c.groupedWith, c.position + 1));
    }
  }
  lineas.push('', `${origen}/minuta/${m.id}`);
  return lineas.join('\n');
}

export function compartirPorWhatsApp(texto: string) {
  window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
}
