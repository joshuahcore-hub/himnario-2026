// Proyección (1.12.0, Josué): arma el PowerPoint del culto a partir del MAESTRO (portada + todas las alabanzas con su
// propio diseño + imágenes fijas; lo arma una vez el PC con PowerPoint, ver scripts/proyeccion/armar_maestro.ps1).
// Aquí NO se mezclan diseños: solo se CONSERVAN la portada, las diapositivas de las alabanzas de la minuta (en orden;
// una repetida se duplica) y las imágenes fijas, se cambia el versículo de la portada y se quita todo lo que quedó sin
// usar (diseños, imágenes y notas de las otras alabanzas), para que el archivo pese como uno hecho a mano.
// Solo manipula texto XML (sin DOM): funciona igual en el navegador y en Node (pruebas).
import type JSZip from 'jszip';

export interface IndiceMaestro {
  version: string;
  total: number;
  portada: number;
  fijas: [number, number];
  /** clave -> [desde, hasta] (diapositivas, contando desde 1). Clave = número del himnario ("49") o, para las
   *  canciones que no están en el himnario, "t:" + título normalizado (ver claveTitulo). */
  himnos: Record<string, [number, number]>;
}

export interface Portada {
  /** Texto exacto del versículo (va en MAYÚSCULAS). */
  versiculo: string;
  /** "Salmos  55:22" (dos espacios entre libro y cita, como en la plantilla). */
  referencia: string;
}

const REL_SLIDE = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const dir = (p: string) => p.slice(0, p.lastIndexOf('/') + 1);
const relsDe = (p: string) => `${dir(p)}_rels/${p.slice(p.lastIndexOf('/') + 1)}.rels`;
function resolver(base: string, target: string) {
  if (target.startsWith('/')) return target.slice(1);
  const partes = (dir(base) + target).split('/');
  const out: string[] = [];
  for (const x of partes) { if (x === '..') out.pop(); else if (x !== '.') out.push(x); }
  return out.join('/');
}
interface Rel { id: string; type: string; target: string; externo: boolean; xml: string }
function leerRels(xml: string): Rel[] {
  return [...xml.matchAll(/<Relationship\b[^>]*\/>/g)].map(m => {
    const a = (n: string) => m[0].match(new RegExp(`\\b${n}="([^"]*)"`))?.[1] ?? '';
    return { id: a('Id'), type: a('Type'), target: a('Target'), externo: a('TargetMode') === 'External', xml: m[0] };
  });
}

/** Igual que scripts/proyeccion/emparejar.py: sin tildes, minúsculas, solo letras/números y espacios simples. */
export function claveTitulo(titulo: string): string {
  const t = titulo.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return 't:' + t.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

export async function armarProyeccion(zip: JSZip, indice: IndiceMaestro, claves: string[], portada: Portada): Promise<JSZip> {
  const leer = async (p: string) => (await zip.file(p)?.async('string')) ?? '';
  let pres = await leer('ppt/presentation.xml');
  const presRelsPath = 'ppt/_rels/presentation.xml.rels';
  let presRels = await leer(presRelsPath);
  let tipos = await leer('[Content_Types].xml');
  const rels = leerRels(presRels);
  const relPorId = new Map(rels.map(r => [r.id, r]));

  // Diapositivas en su orden actual: posición (1..n) -> { id, rId, parte }
  const lista = pres.match(/<p:sldIdLst>([\s\S]*?)<\/p:sldIdLst>/)![1];
  const slides = [...lista.matchAll(/<p:sldId\b[^>]*\/>/g)].map(m => {
    const id = m[0].match(/\bid="(\d+)"/)![1], rid = m[0].match(/r:id="([^"]+)"/)![1];
    return { id, rid, parte: resolver('ppt/presentation.xml', relPorId.get(rid)!.target) };
  });

  // Orden pedido: portada, alabanzas (las que existen), imágenes fijas.
  const orden: number[] = [indice.portada];
  for (const n of claves) {
    const r = indice.himnos[n];
    if (r) for (let i = r[0]; i <= r[1]; i++) orden.push(i);
  }
  for (let i = indice.fijas[0]; i <= indice.fijas[1]; i++) orden.push(i);

  let maxId = Math.max(...slides.map(s => +s.id));
  let maxRid = Math.max(...rels.map(r => +(r.id.match(/\d+/)?.[0] ?? 0)));
  let maxParte = Math.max(...slides.map(s => +(s.parte.match(/slide(\d+)\.xml$/)?.[1] ?? 0)));
  const usadas = new Set<number>();
  const nuevas: { id: string; rid: string; parte: string }[] = [];
  for (const pos of orden) {
    const s = slides[pos - 1];
    if (!usadas.has(pos)) { usadas.add(pos); nuevas.push(s); continue; }
    // Repetida (la misma alabanza dos veces en la minuta): copia de la diapositiva, sin sus notas.
    const parte = `ppt/slides/slide${++maxParte}.xml`;
    zip.file(parte, await leer(s.parte));
    const r = (await leer(relsDe(s.parte))).replace(/<Relationship\b[^>]*notesSlide[^>]*\/>/g, '');
    zip.file(relsDe(parte), r);
    const rid = `rId${++maxRid}`;
    presRels = presRels.replace('</Relationships>', `<Relationship Id="${rid}" Type="${REL_SLIDE}" Target="${parte.replace('ppt/', '')}"/></Relationships>`);
    tipos = tipos.replace('</Types>', `<Override PartName="/${parte}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`);
    nuevas.push({ id: String(++maxId), rid, parte });
  }
  pres = pres.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/,
    `<p:sldIdLst>${nuevas.map(s => `<p:sldId id="${s.id}" r:id="${s.rid}"/>`).join('')}</p:sldIdLst>`);
  // Secciones (si las hay) nombran diapositivas por id: se quitan para no dejar referencias rotas.
  pres = pres.replace(/<p:ext uri="\{521415D9-36F7-43E2-AB2F-B90AF26B5E84\}">[\s\S]*?<\/p:ext>/, '');
  const conservadas = new Set(nuevas.map(s => s.rid));
  for (const s of slides) {
    if (!conservadas.has(s.rid)) presRels = presRels.replace(relPorId.get(s.rid)!.xml, '');
  }

  // Diseños (patrones) que usan las diapositivas que quedan; los demás se sacan de la presentación.
  const mastersUsados = new Set<string>();
  for (const s of nuevas) {
    for (const r of leerRels(await leer(relsDe(s.parte)))) {
      if (!r.type.endsWith('/slideLayout')) continue;
      const layout = resolver(s.parte, r.target);
      for (const m of leerRels(await leer(relsDe(layout)))) {
        if (m.type.endsWith('/slideMaster')) mastersUsados.add(resolver(layout, m.target));
      }
    }
  }
  const quitarMaster = new Set<string>();
  for (const r of leerRels(presRels)) {
    if (r.type.endsWith('/slideMaster') && !mastersUsados.has(resolver('ppt/presentation.xml', r.target))) {
      quitarMaster.add(r.id);
      presRels = presRels.replace(r.xml, '');
    }
  }
  pres = pres.replace(/<p:sldMasterId\b[^>]*\/>/g, m => (quitarMaster.has(m.match(/r:id="([^"]+)"/)![1]) ? '' : m));

  // Portada: el cuadro con más texto es el versículo (MAYÚSCULAS, centrado de arriba a abajo en la diapositiva);
  // el otro, la referencia. Se conserva el formato de su primer trozo de texto.
  const portadaParte = nuevas[0].parte;
  zip.file(portadaParte, cambiarPortada(await leer(portadaParte), portada, pres));

  zip.file('ppt/presentation.xml', pres);
  zip.file(presRelsPath, presRels);

  // Limpieza: todo lo que ya no se alcanza desde el paquete se borra (y su tipo en [Content_Types].xml).
  const alcanzables = new Set<string>(['[Content_Types].xml', '_rels/.rels']);
  const pendientes = ['_rels/.rels'];
  while (pendientes.length) {
    const relsPath = pendientes.pop()!;
    const fuente = relsPath === '_rels/.rels' ? '' : relsPath.replace(/_rels\/([^/]+)\.rels$/, '$1');
    for (const r of leerRels(await leer(relsPath))) {
      if (r.externo) continue;
      const parte = fuente ? resolver(fuente, r.target) : r.target.replace(/^\//, '');
      if (alcanzables.has(parte) || !zip.file(parte)) continue;
      alcanzables.add(parte);
      const suyo = relsDe(parte);
      if (zip.file(suyo)) { alcanzables.add(suyo); pendientes.push(suyo); }
    }
  }
  for (const f of Object.keys(zip.files)) {
    if (zip.files[f].dir || alcanzables.has(f)) continue;
    zip.remove(f);
    tipos = tipos.replace(new RegExp(`<Override PartName="/${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*/>`), '');
  }
  zip.file('[Content_Types].xml', tipos);
  return zip;
}

function textoDe(sp: string) {
  return [...sp.matchAll(/<a:t>([^<]*)<\/a:t>/g)].map(m => m[1]).join('');
}

function cambiarPortada(xml: string, portada: Portada, pres: string): string {
  const alto = +(pres.match(/<p:sldSz\b[^>]*\bcy="(\d+)"/)?.[1] ?? 6858000);
  const cuadros = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)].map(m => m[0]).filter(sp => textoDe(sp).trim());
  cuadros.sort((a, b) => textoDe(b).length - textoDe(a).length);
  const [versiculo, referencia] = cuadros;
  if (versiculo) {
    const texto = portada.versiculo.toLocaleUpperCase('es');
    let sp = reemplazarTexto(versiculo, texto, tamañoVersiculo(texto, versiculo));
    // Centrado de arriba a abajo (pedido de Josué): el cuadro ocupa todo el alto y el texto va al medio.
    sp = sp.replace(/(<a:xfrm>\s*<a:off\b[^>]*\by=")\d+(")/, `$1${0}$2`)
      .replace(/(<a:xfrm>[\s\S]*?<a:ext\b[^>]*\bcy=")\d+(")/, `$1${alto}$2`)
      .replace(/<a:bodyPr\b([^>]*?)\/>/, (_, a) => `<a:bodyPr${a.replace(/\sanchor="[^"]*"/, '')} anchor="ctr"/>`)
      .replace(/<a:bodyPr\b([^>]*?)>([\s\S]*?)<\/a:bodyPr>/, (_, a) => `<a:bodyPr${a.replace(/\sanchor="[^"]*"/, '')} anchor="ctr"/>`);
    xml = xml.replace(versiculo, sp);
  }
  if (referencia) xml = xml.replace(referencia, reemplazarTexto(referencia, portada.referencia));
  return xml;
}

/** Si el versículo es largo, la letra se achica para que quepa en la diapositiva (la plantilla usa 58 pt). */
function tamañoVersiculo(texto: string, sp: string): number | null {
  const sz = +(sp.match(/<a:rPr\b[^>]*\bsz="(\d+)"/)?.[1] ?? 0);
  if (!sz) return null;
  const cabe = 170; // caracteres que caben a 58 pt en 6 renglones
  if (texto.length <= cabe) return null;
  return Math.max(2400, Math.round((sz * Math.sqrt(cabe / texto.length)) / 100) * 100);
}

/** Deja un solo párrafo con un solo trozo de texto, con el formato del primero (pPr y rPr). */
function reemplazarTexto(sp: string, texto: string, sz: number | null = null): string {
  return sp.replace(/(<p:txBody>[\s\S]*?<a:lstStyle\s*\/>|<p:txBody>[\s\S]*?<\/a:lstStyle>)([\s\S]*?)(<\/p:txBody>)/, (_, ini, cuerpo, fin) => {
    // pPr: o se cierra solo (<a:pPr .../>) o tiene hijos hasta </a:pPr> (OJO: sus hijos también terminan en "/>").
    const pPr = cuerpo.match(/<a:pPr\b[^>]*\/>|<a:pPr\b[^>]*>[\s\S]*?<\/a:pPr>/)?.[0] ?? '';
    let rPr = cuerpo.match(/<a:rPr\b[^>]*\/>|<a:rPr\b[\s\S]*?<\/a:rPr>/)?.[0] ?? '<a:rPr lang="es-ES"/>';
    if (sz) rPr = rPr.replace(/\bsz="\d+"/, `sz="${sz}"`);
    const end = cuerpo.match(/<a:endParaRPr\b[^>]*\/>|<a:endParaRPr\b[\s\S]*?<\/a:endParaRPr>/)?.[0] ?? '';
    return `${ini}<a:p>${pPr}<a:r>${rPr}<a:t>${esc(texto)}</a:t></a:r>${end}</a:p>${fin}`;
  });
}
