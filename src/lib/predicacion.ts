// Predicación (1.22.0, Josué 22-10-2026; botón "Añadir PowerPoint", components/BotonPredicacion): el PowerPoint que el hermano usa al predicar (fondo
// oscuro, letra blanca, lo que subraya en naranjo y sus acotaciones en verde) y queda como él lo deja para proyectar
// (ejemplos en ../proyeccion/predicacion-ejemplos: origen.pptx → salida.pptx):
// - fondo claro (EEECE1) y letra negra, Calibri negrita cursiva; título de la cita 48 pt subrayado, texto 44 pt;
// - SIN acotaciones (texto verde: accent3 / 9BBB59) ni diapositivas que solo tienen acotaciones;
// - la cita (texto azul: accent1 / 4F81BD) encabeza cada diapositiva; si una diapositiva trae dos citas, van en dos;
// - Biblia: de a 2 versículos por diapositiva si caben (si no, de a uno) y la cita se rehace ("COLOSENSES 3:1-2");
// - libros (cita sin capítulo:versículo, ej. "DEBES NACER DE NUEVO Pág. 9"): cada párrafo va solo y, si no cabe, se
//   parte por oraciones; los trozos siguientes llevan su número ("29 — …");
// - la primera diapositiva es el título de la predicación (72 pt, centrado).
// Solo manipula texto XML (sin DOM), igual que armarProyeccion.
import type JSZip from 'jszip';
import { quitarSinUso } from '@/lib/armarProyeccion';

/** Una diapositiva ya convertida. */
export interface DiapoPredicacion { titulo?: string; encabezado?: string; parrafos: string[]; sz: number }
/** Una diapositiva del archivo del hermano y en qué queda. */
export interface OriginalPredicacion { n: number; resumen: string; salida: DiapoPredicacion[] }

const COLOR_CITA = new Set(['accent1', '4F81BD']);
const COLOR_ACOTACION = new Set(['accent3', '9BBB59', '555555']);
const SZ_ENC = 4800, SZ_TEXTO = 4400, SZ_TITULO = 7200, SZ_MIN = 2800;

const desc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const limpiar = (s: string) => s.replace(/[\u00a0\u200b\u2028\t]/g, ' ').replace(/\s+/g, ' ').trim();
const dir = (p: string) => p.slice(0, p.lastIndexOf('/') + 1);
function resolver(base: string, target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const out: string[] = [];
  for (const x of (dir(base) + target).split('/')) { if (x === '..') out.pop(); else if (x !== '.') out.push(x); }
  return out.join('/');
}

// ---- Medida del texto (Calibri negrita, milésimas de em) para saber qué cabe en una diapositiva.
const ANCHOS: Record<string, number> = {
  a: 494, b: 537, c: 418, d: 537, e: 503, f: 316, g: 474, h: 537, i: 246, j: 255, k: 480, l: 246, m: 813, n: 537, o: 538,
  p: 537, q: 537, r: 355, s: 399, t: 347, u: 537, v: 473, w: 745, x: 459, y: 474, z: 397,
  A: 606, B: 561, C: 529, D: 630, E: 488, F: 459, G: 637, H: 631, I: 267, J: 331, K: 547, L: 423, M: 874, N: 659, O: 676,
  P: 532, Q: 686, R: 563, S: 473, T: 495, U: 653, V: 591, W: 906, X: 551, Y: 520, Z: 478,
  ' ': 226, ',': 258, '.': 267, ';': 276, ':': 276, '¡': 326, '!': 326, '¿': 463, '?': 463, '(': 312, ')': 312, '—': 905, '…': 800,
};
function anchoTexto(t: string, sz: number) {
  let w = 0;
  // Las MAYÚSCULAS (citas) ocupan algo más que en la tabla.
  for (const ch of t) w += (ANCHOS[ch] ?? ANCHOS[ch.normalize('NFD')[0]] ?? (/\d/.test(ch) ? 507 : 500)) * (/\p{Lu}/u.test(ch) ? 1.07 : 1);
  // Puntos. Factor medido con PowerPoint sobre el ejemplo (ninguna diapositiva se pasa).
  return (w / 1000) * (sz / 100) * 1.03;
}
/** Renglones que ocupa un párrafo en un ancho dado (corta por palabras, como PowerPoint). */
function renglones(t: string, sz: number, ancho: number) {
  let n = 1, linea = 0;
  const esp = anchoTexto(' ', sz);
  for (const palabra of t.split(' ')) {
    const w = anchoTexto(palabra, sz);
    if (linea && linea + esp + w > ancho) { n++; linea = w; } else linea += (linea ? esp : 0) + w;
  }
  return n;
}

interface Medidas { ancho: number; alto: number } // puntos
const medidasDe = (cx: number, cy: number): Medidas => ({ ancho: cx / 12700, alto: cy / 12700 });
// Cuadro: todo el ancho, márgenes internos de 7,2 pt; los párrafos con sangría de 27 pt (como el hermano).
// (1.22.3, Josué) El ÚLTIMO renglón queda LIBRE (en el culto el data corta abajo): a 44 pt, 8 renglones bajo la cita,
// contando el espacio entre párrafos. Lo que no cabe sigue en la diapositiva siguiente (la letra no se achica).
const SANGRIA = 27, MARGEN = 7.2, ESPACIO_PARRAFO = 0.2;
function cabe(enc: string | undefined, parrafos: string[], sz: number, m: Medidas) {
  const renglon = (sz / 100) * 1.2;
  const libre = m.alto - MARGEN - renglon - (enc ? (SZ_ENC / 100) * 1.2 * renglones(enc, SZ_ENC, m.ancho - 2 * MARGEN) : 0);
  const usado = parrafos.reduce((n, p) => n + renglon * renglones(p, sz, m.ancho - 2 * MARGEN - SANGRIA) + (sz / 100) * ESPACIO_PARRAFO, 0);
  return usado <= libre;
}
const diapo = (enc: string | undefined, parrafos: string[]): DiapoPredicacion => ({ encabezado: enc, parrafos, sz: SZ_TEXTO });

/** Parte un texto que no cabe solo en una diapositiva: por oraciones, luego por comas, luego por palabras. Los trozos
 *  siguientes llevan `prefijo` ("29 … " en los libros). */
function trozos(texto: string, enc: string | undefined, m: Medidas, prefijo: string): string[] {
  if (cabe(enc, [texto], SZ_TEXTO, m)) return [texto];
  // El corte de oración pide una letra antes del punto: así "106 … Los" (número + puntos suspensivos) no se separa.
  for (const corte of [/(?<=\p{L}[.!?…»”"]+)\s+(?=[¡¿«“"—…\p{Lu}])/u, /(?<=\p{L}[,;:)]+)\s+/u, /\s+/]) {
    const partes = texto.split(corte);
    // Nunca un trozo que sea solo el número ("106 …"): se junta con lo que sigue.
    for (let i = partes.length - 2; i >= 0; i--) if (!/\p{L}/u.test(partes[i])) partes.splice(i, 2, `${partes[i]} ${partes[i + 1]}`);
    if (partes.length < 2) continue;
    const out: string[] = [];
    let actual = '';
    for (const p of partes) {
      const prueba = actual ? `${actual} ${p}` : p;
      if (!actual || cabe(enc, [prueba], SZ_TEXTO, m)) { actual = prueba; continue; }
      out.push(actual);
      actual = prefijo + p.replace(/^[—–…-]\s*/, '');
    }
    out.push(actual);
    if (out.length < 2) continue; // no se logró partir a este nivel: probar uno más fino
    return out.flatMap(t => trozos(t, enc, m, prefijo));
  }
  return [texto];
}

// ---- Lectura del archivo del hermano
interface Run { t: string; color: string }
function runsDe(p: string): Run[] {
  const out: Run[] = [];
  for (const m of p.matchAll(/<a:r>([\s\S]*?)<\/a:r>|<a:br\b[^>]*\/>/g)) {
    if (!m[1]) { out.push({ t: ' ', color: '' }); continue; }
    const t = desc(m[1].match(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/)?.[1] ?? '');
    // OJO: los hijos del rPr también terminan en "/>" (<a:noFill/>): o se cierra solo o hasta </a:rPr>.
    const rPr = m[1].match(/<a:rPr\b[^>]*\/>|<a:rPr\b[^>]*>[\s\S]*?<\/a:rPr>/)?.[0] ?? '';
    const color = rPr.match(/<a:solidFill>\s*<a:\w+ val="([^"]+)"/)?.[1] ?? '';
    out.push({ t, color });
  }
  return out;
}

const RE_CITA = /^(.*?[A-Za-zÁÉÍÓÚÑáéíóúñ.])\s*(\d+)\s*:\s*\d[\d\s,\-–]*$/;
const pareceCita = (t: string) => /^(\d\s*)?[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ .]+\s+\d+\s*:\s*\d/.test(t);

interface Seccion { enc: string; unidades: { num: string; texto: string }[] }

function leerDiapositiva(xml: string, encAnterior: string): { secciones: Seccion[]; texto: string } {
  const secciones: Seccion[] = [];
  const todo: string[] = [];
  for (const sp of xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) ?? []) {
    if (/<p:ph\b[^>]*type="(sldNum|dt|ftr)"/.test(sp)) continue;
    for (const p of sp.match(/<a:p>[\s\S]*?<\/a:p>/g) ?? []) {
      // La acotación se cambia por un espacio: quitarla no puede pegar dos palabras ("resplandeceráncomo", Dn 12:3).
      const runs = runsDe(p).map(r => (COLOR_ACOTACION.has(r.color) ? { t: ' ', color: '' } : r));
      const texto = limpiar(runs.map(r => r.t).join(''));
      if (!texto) continue;
      todo.push(texto);
      const conTexto = runs.filter(r => r.t.trim());
      const esCita = conTexto.every(r => COLOR_CITA.has(r.color)) || pareceCita(texto);
      if (esCita) { secciones.push({ enc: texto, unidades: [] }); continue; }
      if (!secciones.length) secciones.push({ enc: encAnterior, unidades: [] });
      const s = secciones[secciones.length - 1];
      const num = texto.match(/^(\d+)(?=[\s—….])/)?.[1];
      if (num) s.unidades.push({ num, texto });
      else if (s.unidades.length) {
        const ant = s.unidades[s.unidades.length - 1];
        // Biblia: el versículo sigue en otro párrafo. Libro: párrafo nuevo con el mismo número ("29 — …").
        if (RE_CITA.test(s.enc)) ant.texto += ' ' + texto;
        else s.unidades.push({ num: ant.num, texto: `${ant.num} ${/^[—…-]/.test(texto) ? '' : '… '}${texto}` });
      } else s.unidades.push({ num: '', texto });
    }
  }
  return { secciones: secciones.filter(s => s.unidades.length), texto: todo.join(' ') };
}

// ---- (1.22.5, Josué) Errores del archivo del hermano, corregidos con la Biblia de la app (RVR1960): el número de un
// versículo que no corresponde a su texto, faltas en el texto de un versículo completo y el nombre del libro
// ("GALATAS" → "GÁLATAS"). La cita de arriba ya se rehace con los versículos que de verdad están abajo. Los trozos de
// versículo ("9 … habiéndoos despojado…") se respetan tal cual.
export interface BibliaPred { libros: { n: string; c: string[][] }[] }
const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const claveLibro = (s: string) => sinTildes(s).toLowerCase().replace(/[^a-z0-9]/g, '');
const palabras = (s: string) => sinTildes(s).toLowerCase().match(/[a-zñ]+/g) ?? [];
/** comun: palabras de `a` que están en `b`; da cuánto de `a` está en `b` y cuánto se parecen en total. */
function parecido(a: string, b: string) {
  const pa = palabras(a), pb = palabras(b);
  if (!pa.length || !pb.length) return { cubre: 0, total: 0 };
  const cuenta = new Map<string, number>();
  for (const w of pb) cuenta.set(w, (cuenta.get(w) ?? 0) + 1);
  let c = 0;
  for (const w of pa) { const n = cuenta.get(w); if (n) { c++; cuenta.set(w, n - 1); } }
  return { cubre: c / pa.length, total: c / Math.max(pa.length, pb.length) };
}
function corregirConBiblia(s: Seccion, cita: RegExpMatchArray, biblia: BibliaPred, log: string[]): string {
  const escrito = limpiar(cita[1]);
  const libro = biblia.libros.find(l => claveLibro(l.n) === claveLibro(escrito));
  const versos = libro?.c[+cita[2] - 1];
  if (!libro || !versos) return escrito;
  const nombre = libro.n.toLocaleUpperCase('es');
  if (nombre !== escrito && !log.includes(`${escrito} → ${nombre}`)) log.push(`${escrito} → ${nombre}`);
  for (const u of s.unidades) {
    if (!u.num) continue;
    const cuerpo = u.texto.replace(/^\d+\s*/, '');
    if (palabras(cuerpo).length < 4) continue;
    let n = +u.num;
    // Número equivocado: el texto es claramente de otro versículo del capítulo.
    if (parecido(cuerpo, versos[n - 1] ?? '').cubre < 0.5) {
      let mejor = 0, cual = 0;
      versos.forEach((v, i) => { const p = parecido(cuerpo, v).cubre; if (p > mejor) { mejor = p; cual = i + 1; } });
      if (mejor >= 0.8 && cual !== n) { log.push(`${nombre} ${cita[2]}: versículo ${n} → ${cual}`); n = cual; u.num = String(n); }
    }
    // Faltas en un versículo completo: se deja el texto de la Biblia.
    const biblico = versos[n - 1];
    if (!biblico || /^[…—-]/.test(cuerpo)) { u.texto = `${n} ${cuerpo}`; continue; }
    const p = parecido(cuerpo, biblico);
    if (p.total >= 0.8 && limpiar(cuerpo).replace(/[\s.,;:]+$/, '') !== limpiar(biblico).replace(/[\s.,;:]+$/, '')) {
      if (p.total < 1) log.push(`${nombre} ${cita[2]}:${n}: texto corregido`);
      u.texto = `${n} ${limpiar(biblico)}`;
    } else u.texto = `${n} ${cuerpo}`;
  }
  return nombre;
}

function convertirSeccion(s: Seccion, m: Medidas, biblia?: BibliaPred, log: string[] = []): DiapoPredicacion[] {
  const out: DiapoPredicacion[] = [];
  const cita = s.enc.match(RE_CITA);
  if (cita) {
    const libro = biblia ? corregirConBiblia(s, cita, biblia, log) : limpiar(cita[1]);
    const encDe = (u: Seccion['unidades']) => {
      const a = u[0].num, b = u[u.length - 1].num;
      if (!a || !b) return s.enc;
      return `${libro} ${cita[2]}:${a}${b !== a ? `-${b}` : ''}`;
    };
    let grupo: Seccion['unidades'] = [];
    const cerrar = () => {
      if (grupo.length === 1) {
        // Un versículo que no cabe solo sigue en la diapositiva siguiente (misma cita).
        const enc = encDe(grupo);
        for (const t of trozos(grupo[0].texto, enc, m, '')) out.push(diapo(enc, [t]));
      } else if (grupo.length) out.push(diapo(encDe(grupo), grupo.map(u => u.texto)));
      grupo = [];
    };
    for (const u of s.unidades) {
      const prueba = [...grupo, u];
      const seguido = grupo.length && +u.num === +grupo[grupo.length - 1].num + 1;
      if (grupo.length && (grupo.length >= 2 || !seguido || !cabe(encDe(prueba), prueba.map(x => x.texto), SZ_TEXTO, m))) cerrar();
      grupo.push(u);
    }
    cerrar();
    return out;
  }
  // Libro: cada párrafo solo; si no cabe, por oraciones.
  for (const u of s.unidades) {
    for (const t of trozos(u.texto, s.enc, m, u.num ? `${u.num} … ` : '')) out.push(diapo(s.enc, [t]));
  }
  return out;
}

/** Lee el PowerPoint del hermano y dice en qué queda cada una de sus diapositivas (cx, cy: tamaño de destino). */
export async function leerPredicacion(zip: JSZip, cx = 9144000, cy = 6858000, biblia?: BibliaPred, log: string[] = []): Promise<OriginalPredicacion[]> {
  const leer = async (p: string) => (await zip.file(p)?.async('string')) ?? '';
  const pres = await leer('ppt/presentation.xml');
  const rels = await leer('ppt/_rels/presentation.xml.rels');
  if (!pres) throw new Error('No es un PowerPoint (.pptx).');
  const destino = new Map([...rels.matchAll(/<Relationship\b[^>]*\/>/g)].map(r => [
    r[0].match(/\bId="([^"]*)"/)?.[1] ?? '', r[0].match(/\bTarget="([^"]*)"/)?.[1] ?? '']));
  const ids = [...(pres.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/)?.[1] ?? '').matchAll(/r:id="([^"]+)"/g)].map(x => x[1]);
  const m = medidasDe(cx, cy);
  const out: OriginalPredicacion[] = [];
  let enc = '';
  for (let i = 0; i < ids.length; i++) {
    const xml = await leer(resolver('ppt/presentation.xml', destino.get(ids[i]) ?? ''));
    if (/<p:sld\b[^>]*\bshow="0"/.test(xml)) { out.push({ n: i + 1, resumen: '(oculta)', salida: [] }); continue; }
    const { secciones, texto } = leerDiapositiva(xml, enc);
    if (i === 0 && !secciones.some(s => s.enc && s.enc !== enc)) {
      // Portada de la predicación: su título.
      out.push({ n: 1, resumen: texto, salida: texto ? [{ titulo: texto, parrafos: [], sz: SZ_TITULO }] : [] });
      continue;
    }
    if (secciones.length) enc = secciones[secciones.length - 1].enc;
    const salida = secciones.flatMap(s => convertirSeccion(s, m, biblia, log));
    out.push({ n: i + 1, resumen: secciones.map(s => s.enc).filter(Boolean).join(' · ') || texto.slice(0, 40) || '—', salida });
  }
  return out;
}

/** (1.22.0, Josué) Convierte el archivo del hermano EN SU LUGAR: quedan solo las diapositivas para proyectar (con un
 *  diseño suyo, cuyos gráficos no se muestran). Con la Biblia, corrige sus errores (ver corregirConBiblia). */
export async function convertirPredicacion(zip: JSZip, biblia?: BibliaPred):
  Promise<{ diapos: number; primera: DiapoPredicacion; correcciones: string[] }> {
  const leer = async (p: string) => (await zip.file(p)?.async('string')) ?? '';
  let pres = await leer('ppt/presentation.xml');
  let presRels = await leer('ppt/_rels/presentation.xml.rels');
  let tipos = await leer('[Content_Types].xml');
  const cx = +(pres.match(/<p:sldSz\b[^>]*\bcx="(\d+)"/)?.[1] ?? 9144000), cy = +(pres.match(/<p:sldSz\b[^>]*\bcy="(\d+)"/)?.[1] ?? 6858000);
  const correcciones: string[] = [];
  const diapos = (await leerPredicacion(zip, cx, cy, biblia, correcciones)).flatMap(o => o.salida);
  if (!diapos.length) throw new Error('Sin texto para proyectar.');

  // Diseño: el de la primera diapositiva del hermano.
  const rels = [...presRels.matchAll(/<Relationship\b[^>]*\/>/g)].map(m => m[0]);
  const deSlide = rels.filter(r => /\/relationships\/slide"/.test(r));
  const primera = resolver('ppt/presentation.xml', deSlide[0]?.match(/\bTarget="([^"]*)"/)?.[1] ?? '');
  const relsPrimera = await leer(primera.replace(/slides\/([^/]+)$/, 'slides/_rels/$1.rels'));
  const layout = relsPrimera.match(/<Relationship\b[^>]*\/slideLayout"[^>]*\/>/)?.[0].match(/\bTarget="([^"]*)"/)?.[1];
  if (!layout) throw new Error('El PowerPoint no tiene diseño.');

  // Fuera todas sus diapositivas (y lo que solo ellas usan: notas, imágenes…).
  for (const r of deSlide) presRels = presRels.replace(r, '');
  for (const f of Object.keys(zip.files)) {
    if (!/^ppt\/slides\/(_rels\/)?slide\d+\.xml(\.rels)?$/.test(f)) continue;
    zip.remove(f);
    tipos = tipos.replace(new RegExp(`<Override PartName="/${f.replace(/\./g, '\\.')}"[^>]*/>`), '');
  }
  let maxRid = Math.max(0, ...rels.map(r => +(r.match(/\bId="rId(\d+)"/)?.[1] ?? 0)));
  const ids: string[] = [];
  diapos.forEach((d, i) => {
    const parte = `ppt/slides/slide${i + 1}.xml`, rid = `rId${++maxRid}`;
    zip.file(parte, xmlDiapoPredicacion(d, cx, cy));
    zip.file(`ppt/slides/_rels/slide${i + 1}.xml.rels`, '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
      + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" '
      + `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="${layout}"/></Relationships>`);
    presRels = presRels.replace('</Relationships>', `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/></Relationships>`);
    tipos = tipos.replace('</Types>', `<Override PartName="/${parte}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`);
    ids.push(`<p:sldId id="${256 + i}" r:id="${rid}"/>`);
  });
  pres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>|<p:sldIdLst\/>/, `<p:sldIdLst>${ids.join('')}</p:sldIdLst>`)
    // Secciones y presentaciones personalizadas nombran diapositivas que ya no están.
    .replace(/<p:ext uri="\{521415D9-36F7-43E2-AB2F-B90AF26B5E84\}">[\s\S]*?<\/p:ext>/, '')
    .replace(/<p:custShowLst>[\s\S]*?<\/p:custShowLst>/, '');
  zip.file('ppt/presentation.xml', pres);
  zip.file('ppt/_rels/presentation.xml.rels', presRels);
  zip.file('[Content_Types].xml', tipos);
  await quitarSinUso(zip);
  return { diapos: diapos.length, primera: diapos[0], correcciones };
}

/** (1.22.6, Josué) Para Generar proyección: la Jessie añade el "B y N" que el hermano dejó en la nube (hecho con
 *  convertirPredicacion; puede que él lo haya abierto y guardado en PowerPoint). Se vuelve a leer su texto (cita
 *  subrayada + párrafos, o el título centrado) y se rehacen las diapositivas: así no arrastran nada de su archivo.
 *  Si en cambio suben el original oscuro, se convierte igual que con "Añadir PowerPoint". */
export async function diapositivasParaProyeccion(zip: JSZip, cx: number, cy: number, biblia?: BibliaPred): Promise<string[]> {
  const leer = async (p: string) => (await zip.file(p)?.async('string')) ?? '';
  const pres = await leer('ppt/presentation.xml');
  if (!pres) throw new Error('No es un PowerPoint (.pptx).');
  const rels = await leer('ppt/_rels/presentation.xml.rels');
  const destino = new Map([...rels.matchAll(/<Relationship\b[^>]*\/>/g)].map(r => [
    r[0].match(/\bId="([^"]*)"/)?.[1] ?? '', r[0].match(/\bTarget="([^"]*)"/)?.[1] ?? '']));
  const ids = [...(pres.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/)?.[1] ?? '').matchAll(/r:id="([^"]+)"/g)].map(x => x[1]);
  const diapos: DiapoPredicacion[] = [];
  for (const id of ids) {
    const xml = await leer(resolver('ppt/presentation.xml', destino.get(id) ?? ''));
    if (/<p:sld\b[^>]*\bshow="0"/.test(xml)) continue;
    const sp = (xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g) ?? []).find(s => /<p:cNvPr\b[^>]*name="Predicación"/.test(s));
    if (!sp) continue;
    const pars = (sp.match(/<a:p>[\s\S]*?<\/a:p>/g) ?? [])
      .map(p => ({ t: limpiar(runsDe(p).map(r => r.t).join('')), sub: /<a:rPr\b[^>]*\bu="sng"/.test(p), ctr: /algn="ctr"/.test(p),
        sz: +(p.match(/<a:rPr\b[^>]*\bsz="(\d+)"/)?.[1] ?? SZ_TEXTO) }))
      .filter(p => p.t);
    if (!pars.length) continue;
    if (pars.length === 1 && pars[0].ctr && !pars[0].sub) { diapos.push({ titulo: pars[0].t, parrafos: [], sz: pars[0].sz }); continue; }
    const enc = pars[0].sub ? pars.shift()!.t : undefined;
    diapos.push({ encabezado: enc, parrafos: pars.map(p => p.t), sz: pars[0]?.sz ?? SZ_TEXTO });
  }
  const lista = diapos.length ? diapos : (await leerPredicacion(zip, cx, cy, biblia)).flatMap(o => o.salida);
  if (!lista.length) throw new Error('Sin texto para proyectar.');
  return lista.map(d => xmlDiapoPredicacion(d, cx, cy));
}

/** (1.22.5, Josué) Ícono en el Escritorio: Windows muestra la miniatura que trae el archivo (docProps/thumbnail.jpeg), así
 *  el claro se distingue del original del hermano (que muestra la "P" de PowerPoint). */
export async function ponerMiniatura(zip: JSZip, jpeg: Uint8Array) {
  const leer = async (p: string) => (await zip.file(p)?.async('string')) ?? '';
  const TIPO = 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/thumbnail';
  let rels = await leer('_rels/.rels');
  const viejo = rels.match(new RegExp(`<Relationship\\b[^>]*Type="${TIPO.replace(/[./]/g, '\\$&')}"[^>]*/>`))?.[0];
  if (viejo) {
    const t = viejo.match(/\bTarget="\/?([^"]*)"/)?.[1];
    if (t) zip.remove(t);
    rels = rels.replace(viejo, '');
  }
  zip.file('docProps/thumbnail.jpeg', jpeg);
  zip.file('_rels/.rels', rels.replace('</Relationships>', `<Relationship Id="rIdMiniatura" Type="${TIPO}" Target="docProps/thumbnail.jpeg"/></Relationships>`));
  let tipos = await leer('[Content_Types].xml');
  if (!/<Default Extension="jpeg"/i.test(tipos)) tipos = tipos.replace(/(<Types\b[^>]*>)/, '$1<Default Extension="jpeg" ContentType="image/jpeg"/>');
  zip.file('[Content_Types].xml', tipos);
}

/** (1.22.5, Josué) Nombre de salida: "B y N" después de "PREDICA" (así lo pone el hermano Mauri: blanco y negro).
 *  "35 - PREDICA - La manifestación…" → "35 - PREDICA B y N - La manifestación…". */
export function nombreSalida(original: string): string {
  const base = original.replace(/\.pptx$/i, '');
  if (/\bB y N\b/.test(base)) return `${base}.pptx`;
  const conBN = base.replace(/(pr[eé]dica)/i, '$1 B y N');
  return `${conBN === base ? `${base} B y N` : conBN}.pptx`;
}

// ---- Escritura de las diapositivas convertidas
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const rPr = (sz: number, extra = '') =>
  `<a:rPr lang="es-CL" sz="${sz}" b="1" i="1"${extra} dirty="0"><a:solidFill><a:srgbClr val="000000"/></a:solidFill><a:latin typeface="Calibri"/></a:rPr>`;

/** XML de una diapositiva de la predicación (fondo claro, sin los gráficos del diseño). */
export function xmlDiapoPredicacion(d: DiapoPredicacion, cx: number, cy: number): string {
  let cuerpo: string, bodyPr: string;
  if (d.titulo !== undefined) {
    bodyPr = '<a:bodyPr wrap="square" lIns="457200" rIns="457200" anchor="ctr"><a:normAutofit/></a:bodyPr>';
    cuerpo = `<a:p><a:pPr algn="ctr"/><a:r>${rPr(d.sz).replace(' i="1"', '')}<a:t>${esc(d.titulo)}</a:t></a:r></a:p>`;
  } else {
    bodyPr = '<a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720"><a:noAutofit/></a:bodyPr>';
    cuerpo = (d.encabezado ? `<a:p><a:r>${rPr(SZ_ENC, ' u="sng"')}<a:t>${esc(d.encabezado)}</a:t></a:r></a:p>` : '')
      + d.parrafos.map(p => `<a:p><a:pPr marL="342900" indent="0"><a:spcBef><a:spcPct val="20000"/></a:spcBef><a:buNone/></a:pPr>`
        + `<a:r>${rPr(d.sz)}<a:t>${esc(p)}</a:t></a:r></a:p>`).join('');
  }
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld ${NS} showMasterSp="0"><p:cSld>`
    + '<p:bg><p:bgPr><a:solidFill><a:srgbClr val="EEECE1"/></a:solidFill><a:effectLst/></p:bgPr></p:bg><p:spTree>'
    + '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>'
    + `<p:sp><p:nvSpPr><p:cNvPr id="2" name="Predicación"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="0" y="${d.titulo !== undefined ? 0 : -110836}"/><a:ext cx="${cx}" cy="${d.titulo !== undefined ? cy : cy + 110836}"/></a:xfrm>`
    + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody>${bodyPr}<a:lstStyle/>${cuerpo}</p:txBody></p:sp>`
    + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';
}
