// Convierte el texto de una minuta (pegado desde WhatsApp o leído de una foto por la IA) en la lista de cantos.
// No usa IA: empareja con el himnario por número y por título/primera línea (tolera faltas y sin tildes),
// detecta PALABRA / ORACIÓN, cantos agrupados en la misma línea ("52 - 141", "Consejero / Tu manera")
// y la fecha si viene escrita ("12/10", "12-10-2026").
import type { ParsedSong } from '@/lib/types';
import { getHymns, getHymn, normalizar, type CachedHymn } from '@/lib/hymnCache';
import { cantoDesdeHimno, ORACION, PALABRA } from '@/lib/minutaUtils';

export interface LecturaMinuta {
  fecha: string | null;
  cantos: ParsedSong[];
  noEncontrados: number;
}

const PALABRAS_PALABRA = /\b(palabra|predica|predicacion|mensaje|sermon)\b/;
const PALABRAS_ORACION = /\b(oracion|orar|oramos)\b/;
const ENCABEZADO = /^(minuta|cantos|himnos|alabanzas|lista|domingo|lunes|martes|miercoles|jueves|viernes|sabado|culto|reunion|servicio|manana|tarde|noche|\s)+$/;

function distancia(a: string, b: string): number {
  if (a === b) return 0;
  const fila = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let previo = fila[0];
    fila[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = fila[j];
      fila[j] = Math.min(fila[j] + 1, fila[j - 1] + 1, previo + (a[i - 1] === b[j - 1] ? 0 : 1));
      previo = tmp;
    }
  }
  return fila[b.length];
}

const parecido = (a: string, b: string) => (a && b ? 1 - distancia(a, b) / Math.max(a.length, b.length) : 0);

/** Qué tanto se parece el texto escrito al título o al comienzo de la letra de un himno (0 a 1). */
function puntaje(texto: string, h: CachedHymn): number {
  const t = normalizar(texto);
  if (t.length < 2) return 0;
  const candidatos = [h.title, ...(h.alt_titles || []), h.first_line || ''].map(normalizar).filter(Boolean);
  let mejor = 0;
  for (const c of candidatos) {
    const recorte = c.slice(0, Math.max(t.length, 4));
    mejor = Math.max(mejor, parecido(t, c), parecido(t, recorte));
    if (c.startsWith(t) && t.length >= 4) mejor = Math.max(mejor, 0.9);
  }
  // Palabras en común (sirve cuando escriben solo parte del título).
  const palabras = t.split(' ').filter(p => p.length > 2);
  if (palabras.length) {
    const texto = normalizar(`${h.title} ${h.first_line || ''}`);
    const comunes = palabras.filter(p => texto.includes(p)).length / palabras.length;
    mejor = Math.max(mejor, comunes * 0.85);
  }
  return mejor;
}

function mejorPorTitulo(texto: string): { h: CachedHymn; p: number } | null {
  let mejor: { h: CachedHymn; p: number } | null = null;
  for (const h of getHymns().hymns) {
    const p = puntaje(texto, h);
    if (!mejor || p > mejor.p) mejor = { h, p };
  }
  return mejor;
}

/** Un canto escrito ("141 inclino mi rostro", "#52", "Himno 7", "Consejero"): himno encontrado o null. */
function buscarCanto(escrito: string): CachedHymn | null {
  let texto = escrito.replace(/\([^)]*\)/g, ' ').replace(/[*_~"“”]/g, ' ').trim(); // sin tonos "(G)" ni formato
  // Numeración de la lista: "1. 141 Inclino…", "2) Consejero", "3.- Tu manera"
  const enumerado = texto.match(/^\s*\d{1,2}\s*(?:\.-|[.):-])\s*(.+)$/);
  const conNumero = (t: string) => t.match(/^\s*(?:#|n[°º.]?\s*|himno\s*|h\s*)?(\d{1,3})\b\s*[.:-]?\s*(.*)$/i);

  // Con numeración de lista se busca solo lo que viene después ("5. Algo" no es el himno 5).
  // La línea completa solo se vuelve a probar si número y título coinciden ("12 - Consejero" = himno 12).
  const intentos: string[] = enumerado ? [enumerado[1], texto] : [texto];

  let respaldo: CachedHymn | null = null;
  for (const t of intentos) {
    const m = conNumero(t);
    if (m) {
      const h = getHymn(Number(m[1]));
      const resto = m[2].trim();
      if (h && (!resto || puntaje(resto, h) >= 0.35)) return h; // el número y el título coinciden (o no hay título)
      if (resto) {
        const porTitulo = mejorPorTitulo(resto);
        if (porTitulo && porTitulo.p >= 0.6) return porTitulo.h; // el título manda si el número no calza
      }
      if (h && !respaldo && !(enumerado && t === texto)) respaldo = h;
    } else {
      const porTitulo = mejorPorTitulo(t);
      if (porTitulo && porTitulo.p >= 0.55) return porTitulo.h;
    }
  }
  return respaldo;
}

// Fecha: "12/10", "12 / 10 / 2026", "12-10", "12.10.26". Con "-" o "." sin espacios, para no confundir
// "52 - 7" (cantos agrupados) o "2. 12 Consejero" (lista numerada) con una fecha.
const FECHA = /\b(\d{1,2})(?:\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?|([.-])(\d{1,2})(?:\4(\d{2,4}))?)\b/g;

function leerFecha(texto: string, hoy: Date): string | null {
  for (const m of texto.matchAll(FECHA)) {
    const dia = Number(m[1]), mes = Number(m[2] ?? m[5]), a = m[3] ?? m[6];
    if (dia < 1 || dia > 31 || mes < 1 || mes > 12) continue;
    let anio = a ? Number(a.length === 2 ? `20${a}` : a) : hoy.getFullYear();
    if (!a && new Date(anio, mes - 1, dia) < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - 60)) anio++;
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }
  return null;
}

export function leerMinuta(texto: string, hoy = new Date()): LecturaMinuta {
  const cantos: ParsedSong[] = [];
  let noEncontrados = 0;
  const fecha = leerFecha(texto, hoy);

  for (const linea of texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
    const n = normalizar(linea).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!n) continue;
    const palabras = n.split(' ').length;
    if (palabras <= 4 && PALABRAS_PALABRA.test(n)) { cantos.push({ ...PALABRA }); continue; }
    if (palabras <= 4 && PALABRAS_ORACION.test(n)) { cantos.push({ ...ORACION }); continue; }
    // Encabezados ("Minuta domingo 12/10") y líneas que son solo la fecha; "52 - 7" no se salta (son cantos).
    const sinNumeros = n.replace(/\d+/g, ' ').trim();
    const soloFecha = !sinNumeros && leerFecha(linea, hoy) !== null && /^[\d\s/.-]+$/.test(linea) && !/\s[-–—]\s/.test(linea);
    if ((sinNumeros && ENCABEZADO.test(sinNumeros)) || soloFecha) continue;

    // Dos cantos en la misma línea = agrupados ("52 - 141", "Consejero / Tu manera").
    const partes = linea.split(/\s+[-–—/]\s+|\s*\/\s*|\s+y\s+(?=\d)/).filter(p => p.trim());
    if (partes.length === 2) {
      const [a, b] = partes.map(buscarCanto);
      if (a && b && a.hymn_number !== b.hymn_number) { cantos.push({ ...cantoDesdeHimno(a), groupedWith: cantoDesdeHimno(b) }); continue; }
    }
    const h = buscarCanto(linea);
    if (h) cantos.push(cantoDesdeHimno(h));
    else {
      noEncontrados++;
      cantos.push({ position: 0, title: linea.replace(/^\s*\d{1,2}\s*(?:\.-|[.):-])\s*/, ''), key: null, hymnNumber: null, found: false });
    }
  }
  return { fecha, cantos, noEncontrados };
}
