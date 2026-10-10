// Los himnos vienen incluidos en la app (src/datos/himnos.json): no se piden a ningún servidor,
// así la lista y la búsqueda funcionan siempre sin internet.
import datos from '@/datos/himnos.json';

export interface CachedHymn {
  id: string;
  hymn_number: number;
  title: string;
  first_line: string | null;
  key: string | null;
  page_number: number | null;
  alt_titles: string[];
  search_text: string;
}

/** Minúsculas y sin tildes, para buscar sin importar acentos ("jordan" encuentra "Jordán"). */
export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

const HYMNS: CachedHymn[] = (datos as any[])
  .map(h => ({
    id: String(h.hymn_number),
    hymn_number: h.hymn_number,
    title: h.title,
    first_line: h.first_line || null,
    key: h.key || null,
    page_number: h.page_number || null,
    alt_titles: h.alt_titles || [],
    search_text: normalizar([h.title, h.first_line, ...(h.alt_titles || []), h.search_text].filter(Boolean).join(' ')),
  }))
  .sort((a, b) => a.hymn_number - b.hymn_number);

const POR_NUMERO = new Map(HYMNS.map(h => [h.hymn_number, h]));

export function getHymns(): { hymns: CachedHymn[]; ready: boolean } {
  return { hymns: HYMNS, ready: true };
}

export function getHymn(n: number): CachedHymn | undefined {
  return POR_NUMERO.get(n);
}

export function getHymnNumbers(): number[] {
  return HYMNS.map(h => h.hymn_number);
}

export function getHymnImageUrl(hymnNumber: number): string {
  return `/himnos/claro/${hymnNumber}.webp`;
}

export function getHymnDarkImageUrl(hymnNumber: number): string {
  return `/himnos/oscuro/${hymnNumber}.webp`;
}

export function getThemedHymnImageUrl(hymnNumber: number, theme: 'light' | 'dark'): string {
  return theme === 'dark' ? getHymnDarkImageUrl(hymnNumber) : getHymnImageUrl(hymnNumber);
}

const imageCache = new Map<number, HTMLImageElement>();
const imageCacheDark = new Map<number, HTMLImageElement>();

export function preloadHymnImage(n: number): HTMLImageElement {
  if (imageCache.has(n)) return imageCache.get(n)!;
  const img = new Image();
  img.src = getHymnImageUrl(n);
  imageCache.set(n, img);
  return img;
}

export function preloadHymnDarkImage(n: number): HTMLImageElement {
  if (imageCacheDark.has(n)) return imageCacheDark.get(n)!;
  const img = new Image();
  img.src = getHymnDarkImageUrl(n);
  imageCacheDark.set(n, img);
  return img;
}

export function preloadHymnImageBoth(n: number): void {
  preloadHymnImage(n);
  preloadHymnDarkImage(n);
}

export function isImageCached(n: number): boolean {
  const cached = imageCache.get(n);
  return !!cached?.complete;
}

export { imageCache, imageCacheDark };
