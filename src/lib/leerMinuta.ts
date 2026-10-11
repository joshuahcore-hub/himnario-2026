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
  /** Conclusiones que sacó la app (p. ej. la raya se tomó como Oración porque es miércoles), para mostrarlas al revisar. */
  notas: NotaLectura[];
}

export interface NotaLectura {
  /** Qué se puso en lugar de la raya. */
  cual: 'palabra' | 'oracion';
  dia: 'miercoles' | 'domingo';
  /** Si el día se dedujo por la cantidad de cantos (no venía escrito ni por la fecha). */
  porCantos: number | null;
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

// ---------- Separadores y avisos (reglas de Josué, 11-10-2026) ----------
// Una raya ("---", "___", "—", "***"; en la foto, la raya dibujada a mano, que la IA transcribe como ---) separa
// partes del culto: el miércoles ahí va la ORACIÓN; el domingo, la PALABRA. El día sale de la fecha o de la palabra
// "miércoles"/"domingo"; si no hay, de la cantidad de cantos (hasta 4 = miércoles; 5 o más = domingo).
// Si el texto ya dice Palabra/Oración, las rayas no agregan nada. Sin rayas ni avisos: solo los cantos.
// Avisos: "Para pasar a la palabra: 52" = el 52 y luego Palabra; "Después de la palabra: 7" = Palabra y luego el 7.

const SEPARADOR = /^[\s\-–—_=~*·•.|]+$/;
const SIMBOLO_SEPARADOR = /[-–—_=~*]/;
const CLAVE_MARCA = '(palabra|predicacion|mensaje|sermon|oracion|orar)';
const AVISO_ANTES = new RegExp(`^(?:y\\s+)?(?:para\\s+)?(?:antes\\s+de\\s+)?(?:pasar|pasamos)\\s+(?:a\\s+)?(?:la\\s+|el\\s+)?${CLAVE_MARCA}\\b`);
const AVISO_ANTES_2 = new RegExp(`^antes\\s+de\\s+(?:la\\s+|el\\s+)?${CLAVE_MARCA}\\b`);
const AVISO_DESPUES = new RegExp(`^(?:y\\s+)?(?:despues|luego|tras|post)\\s+(?:de\\s+)?(?:la\\s+|el\\s+)?${CLAVE_MARCA}\\b`);
const tipoMarca = (clave: string): 'palabra' | 'oracion' => (/^(oracion|orar)$/.test(clave) ? 'oracion' : 'palabra');

/** Lo escrito después de la palabra clave del aviso, en el texto original ("Para pasar a la palabra: 52 Tu manera" → "52 Tu manera"). */
function restoDelAviso(linea: string): string {
  const m = linea.match(/(palabra|predicaci[oó]n|mensaje|serm[oó]n|oraci[oó]n|orar)/i);
  return m ? linea.slice(m.index! + m[0].length).replace(/^[\s:.,;\-–—>)]+/, '').trim() : '';
}

type Pieza =
  | { tipo: 'canto'; canto: ParsedSong }
  | { tipo: 'marca'; cual: 'palabra' | 'oracion' }
  | { tipo: 'raya' };

function diaDeFecha(fecha: string | null): 'miercoles' | 'domingo' | null {
  if (!fecha) return null;
  const [a, m, d] = fecha.split('-').map(Number);
  const dia = new Date(a, m - 1, d).getDay();
  return dia === 3 ? 'miercoles' : dia === 0 ? 'domingo' : null;
}

export function leerMinuta(texto: string, hoy = new Date()): LecturaMinuta {
  const piezas: Pieza[] = [];
  const notas: NotaLectura[] = [];
  let noEncontrados = 0;
  const fecha = leerFecha(texto, hoy);
  let diaEscrito: 'miercoles' | 'domingo' | null = null;
  // "Para pasar a la palabra:" sin canto en la misma línea: la marca va después del canto siguiente.
  let marcaTrasSiguiente: 'palabra' | 'oracion' | null = null;

  const leerCanto = (linea: string): ParsedSong => {
    // Dos cantos en la misma línea = agrupados ("52 - 141", "Consejero / Tu manera").
    const partes = linea.split(/\s+[-–—/]\s+|\s*\/\s*|\s+y\s+(?=\d)/).filter(p => p.trim());
    if (partes.length === 2) {
      const [a, b] = partes.map(buscarCanto);
      if (a && b && a.hymn_number !== b.hymn_number) return { ...cantoDesdeHimno(a), groupedWith: cantoDesdeHimno(b) };
    }
    const h = buscarCanto(linea);
    if (h) return cantoDesdeHimno(h);
    noEncontrados++;
    return { position: 0, title: linea.replace(/^\s*\d{1,2}\s*(?:\.-|[.):-])\s*/, ''), key: null, hymnNumber: null, found: false };
  };
  const agregarCanto = (linea: string) => {
    piezas.push({ tipo: 'canto', canto: leerCanto(linea) });
    if (marcaTrasSiguiente) { piezas.push({ tipo: 'marca', cual: marcaTrasSiguiente }); marcaTrasSiguiente = null; }
  };

  for (const linea of texto.split(/\r?\n/).map(l => l.trim()).filter(Boolean)) {
    if (SEPARADOR.test(linea) && SIMBOLO_SEPARADOR.test(linea)) { piezas.push({ tipo: 'raya' }); continue; }
    const n = normalizar(linea).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
    if (!n) continue;
    if (/\bmiercoles\b/.test(n)) diaEscrito = 'miercoles';
    else if (/\bdomingo\b/.test(n)) diaEscrito = 'domingo';

    // Avisos: "Para pasar a la palabra: 52", "Después de la oración: Consejero" (también con número de lista: "3. Para…").
    const nAviso = n.replace(/^\d{1,2}\s+(?=[a-z])/, '');
    const antes = nAviso.match(AVISO_ANTES) ?? nAviso.match(AVISO_ANTES_2);
    const despues = !antes && nAviso.match(AVISO_DESPUES);
    if (antes || despues) {
      const cual = tipoMarca((antes || despues)![1]);
      const resto = restoDelAviso(linea);
      if (antes) {
        if (resto) { agregarCanto(resto); piezas.push({ tipo: 'marca', cual }); }
        else if (/:\s*$/.test(linea)) marcaTrasSiguiente = cual; // "Para pasar a la palabra:" → el canto de abajo y luego la marca
        else piezas.push({ tipo: 'marca', cual });               // "Pasamos a la palabra" → la marca va aquí
      } else {
        piezas.push({ tipo: 'marca', cual });
        if (resto) agregarCanto(resto);
      }
      continue;
    }

    const palabras = n.split(' ').length;
    if (palabras <= 4 && PALABRAS_PALABRA.test(n)) { piezas.push({ tipo: 'marca', cual: 'palabra' }); continue; }
    if (palabras <= 4 && PALABRAS_ORACION.test(n)) { piezas.push({ tipo: 'marca', cual: 'oracion' }); continue; }
    // Encabezados ("Minuta domingo 12/10") y líneas que son solo la fecha; "52 - 7" no se salta (son cantos).
    const sinNumeros = n.replace(/\d+/g, ' ').trim();
    const soloFecha = !sinNumeros && leerFecha(linea, hoy) !== null && /^[\d\s/.-]+$/.test(linea) && !/\s[-–—]\s/.test(linea);
    if ((sinNumeros && ENCABEZADO.test(sinNumeros)) || soloFecha) continue;
    agregarCanto(linea);
  }

  // Rayas → Oración (miércoles) o Palabra (domingo), solo si el texto no dice ya Palabra/Oración.
  // Se usa la primera raya que tenga cantos antes y después; las demás solo separan.
  const hayMarcas = piezas.some(p => p.tipo === 'marca');
  const totalCantos = piezas.filter(p => p.tipo === 'canto').length;
  const iRaya = piezas.findIndex((p, i) => p.tipo === 'raya'
    && piezas.slice(0, i).some(q => q.tipo === 'canto') && piezas.slice(i + 1).some(q => q.tipo === 'canto'));
  if (!hayMarcas && iRaya >= 0) {
    const porFecha = diaDeFecha(fecha);
    const dia = diaEscrito ?? porFecha ?? (totalCantos <= 4 ? 'miercoles' : 'domingo');
    const cual = dia === 'miercoles' ? 'oracion' : 'palabra';
    piezas[iRaya] = { tipo: 'marca', cual };
    notas.push({ cual, dia, porCantos: diaEscrito || porFecha ? null : totalCantos });
  }

  // Armar la lista: sin rayas, sin marcas repetidas seguidas y con una sola Palabra.
  const cantos: ParsedSong[] = [];
  let hayPalabra = false;
  for (const p of piezas) {
    if (p.tipo === 'raya') continue;
    if (p.tipo === 'canto') { cantos.push(p.canto); continue; }
    const ultimo = cantos[cantos.length - 1];
    if (p.cual === 'palabra') {
      if (hayPalabra || ultimo?.isPalabra) continue;
      hayPalabra = true;
      cantos.push({ ...PALABRA });
    } else if (!ultimo?.isOracion) {
      cantos.push({ ...ORACION });
    }
  }
  return { fecha, cantos, noEncontrados, notas };
}
