// Predicación en la proyección (1.22.0, Josué 22-10-2026): se sube el PowerPoint que el hermano usa al predicar (fondo
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
  for (const ch of t) w += ANCHOS[ch] ?? ANCHOS[ch.normalize('NFD')[0]] ?? (/\d/.test(ch) ? 507 : 500);
  return (w / 1000) * (sz / 100) * 0.97; // puntos (0,97: medido contra los renglones reales de salida.pptx)
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
// Cuadro: todo el ancho, márgenes internos de 7,2 pt; los párrafos con sangría de 27 pt (como el hermano). El hermano
// llena hasta el borde: a 44 pt caben 9 renglones bajo la cita (el espacio entre párrafos no se cuenta).
const SANGRIA = 27, MARGEN = 7.2;
function cabe(enc: string | undefined, parrafos: string[], sz: number, m: Medidas) {
  const libre = m.alto - (enc ? (SZ_ENC / 100) * 1.2 * renglones(enc, SZ_ENC, m.ancho - 2 * MARGEN) : 0);
  const caben = Math.floor(libre / ((sz / 100) * 1.2) + 0.2);
  return parrafos.reduce((n, p) => n + renglones(p, sz, m.ancho - 2 * MARGEN - SANGRIA), 0) <= caben;
}
function diapo(enc: string | undefined, parrafos: string[], m: Medidas): DiapoPredicacion {
  let sz = SZ_TEXTO;
  while (sz > SZ_MIN && !cabe(enc, parrafos, sz, m)) sz -= 200;
  return { encabezado: enc, parrafos, sz };
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
      const runs = runsDe(p).filter(r => !COLOR_ACOTACION.has(r.color));
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

function convertirSeccion(s: Seccion, m: Medidas): DiapoPredicacion[] {
  const out: DiapoPredicacion[] = [];
  const cita = s.enc.match(RE_CITA);
  if (cita) {
    const encDe = (u: Seccion['unidades']) => {
      const a = u[0].num, b = u[u.length - 1].num;
      if (!a || !b) return s.enc;
      return `${limpiar(cita[1])} ${cita[2]}:${a}${b !== a ? `-${b}` : ''}`;
    };
    let grupo: Seccion['unidades'] = [];
    const cerrar = () => { if (grupo.length) out.push(diapo(encDe(grupo), grupo.map(u => u.texto), m)); grupo = []; };
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
    if (cabe(s.enc, [u.texto], SZ_TEXTO, m)) { out.push(diapo(s.enc, [u.texto], m)); continue; }
    const oraciones = u.texto.split(/(?<=[.!?…»”"])\s+(?=[¡¿«“"—…A-ZÁÉÍÓÚÑ])/);
    let actual = '';
    const prefijo = u.num ? `${u.num} … ` : '';
    for (const o of oraciones) {
      const prueba = actual ? `${actual} ${o}` : o;
      if (actual && !cabe(s.enc, [prueba], SZ_TEXTO, m)) { out.push(diapo(s.enc, [actual], m)); actual = prefijo + o.replace(/^[—–…-]\s*/, ''); }
      else actual = prueba;
    }
    if (actual) out.push(diapo(s.enc, [actual], m));
  }
  return out;
}

/** Lee el PowerPoint del hermano y dice en qué queda cada una de sus diapositivas (cx, cy: tamaño de destino). */
export async function leerPredicacion(zip: JSZip, cx = 9144000, cy = 6858000): Promise<OriginalPredicacion[]> {
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
    const salida = secciones.flatMap(s => convertirSeccion(s, m));
    out.push({ n: i + 1, resumen: secciones.map(s => s.enc).filter(Boolean).join(' · ') || texto.slice(0, 40) || '—', salida });
  }
  return out;
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
