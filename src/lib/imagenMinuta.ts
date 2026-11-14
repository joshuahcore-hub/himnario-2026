// Compartir una minuta como IMAGEN (1.10.0, Josué): la portada del lector (título, fecha y cantos), dibujada en un
// canvas con los colores del tema en uso, y enviada con el menú de compartir del celular (WhatsApp, etc.).
// Se dibuja a mano (no captura de pantalla): funciona sin internet y sale igual en todos los celulares.
import type { ParsedSong } from '@/lib/types';
import { cadena, comienzoLetra, esCita, formatearFecha, renumerar } from '@/lib/minutaUtils';
import { getHymn } from '@/lib/hymnCache';
import { tempoDe } from '@/components/Portada';
import { colorTempoActivo } from '@/lib/colorTempo';

export interface TextosPortada {
  titulo: string;
  palabra: string;
  oracion: string;
  noEncontrado: string;
  /** (1.13.0) "Especial" y la etiqueta de las alabanzas fuera del himnario. */
  especial?: string;
  fuera?: string;
  /** (1.18.2) "Ofrenda" (aviso arriba de una alabanza). */
  ofrenda?: string;
}

// (1.31.11, Josué: para imprimir) Más grande: 1920 px de ancho (antes 1080). Todo se escala igual.
const ANCHO = 1920;
const S = ANCHO / 400;          // la portada del lector mide ~400 px de ancho: todo se escala igual
const MARGEN = 34 * S;
const ALTO_MIN = 2400;          // 4:5, como una foto vertical

/** Color de una variable del tema (p. ej. --foreground) ya convertido a rgb (el canvas no lee variables CSS). */
function colorDe(variable: string): string {
  const el = document.createElement('span');
  el.style.color = `hsl(var(${variable}))`;
  el.style.display = 'none';
  document.body.appendChild(el);
  const c = getComputedStyle(el).color;
  el.remove();
  return c;
}

type Trozo = { texto: string; color: string; peso: number; tam: number; italica?: boolean };

export async function imagenDeMinuta(fecha: string, cantos: ParsedSong[], txt: TextosPortada): Promise<Blob> {
  const familia = getComputedStyle(document.body).fontFamily || 'sans-serif';
  await Promise.all([400, 500, 600, 700].map(p => document.fonts?.load(`${p} 40px ${familia}`).catch(() => null)));

  const col = {
    fondo: colorDe('--background'), texto: colorDe('--foreground'), suave: colorDe('--muted-foreground'),
    tono: colorDe('--hymn-key'), numero: colorDe('--hymn-number'), palabra: colorDe('--palabra'),
    oracion: colorDe('--oracion'), raya: colorDe('--hymn-number'), especial: colorDe('--especial'),
    ofrenda: colorDe('--ofrenda'), nota: colorDe('--nota'),
  };
  // (1.31.11, Josué) Igual que el lector: franja celeste (lentas) o morada (rápidas), si está encendido en Ajustes.
  const conFranjas = colorTempoActivo();
  const oscuro = document.documentElement.classList.contains('dark');
  const colorFranja = (tp: 'lenta' | 'rapida') => `hsla(${tp === 'lenta' ? '199, 85%, 60%' : '265, 60%, 62%'}, ${oscuro ? 0.2 : 0.16})`;
  const fs = 14 * S;             // text-sm
  const alto = fs * 1.45;
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d')!;
  const fuente = (t: Trozo) => `${t.italica ? 'italic ' : ''}${t.peso} ${t.tam}px ${familia}`;

  // Arma las líneas (con salto de línea si un título es largo) y anota qué dibujar; primero mide, después dibuja.
  type Linea = { trozos: { t: Trozo; x: number }[]; y: number };
  const ops: (Linea | { raya: [number, number] } | { caja: [number, number, string] })[] = [];
  const anchoUtil = ANCHO - 2 * MARGEN;
  let y = MARGEN + 20 * S * 1.2 + 16 * S; // título (text-xl) + mb-4

  const escribir = (trozos: Trozo[], sangria = 0) => {
    let linea: Linea = { trozos: [], y };
    let x = 0;
    for (const t of trozos) {
      ctx.font = fuente(t);
      for (const palabra of t.texto.split(/(?<= )/)) {
        const w = ctx.measureText(palabra).width;
        if (x + w > anchoUtil && x > sangria) {
          ops.push(linea);
          y += alto;
          linea = { trozos: [], y };
          x = sangria;
        }
        linea.trozos.push({ t: { ...t, texto: palabra }, x });
        x += w;
      }
    }
    ops.push(linea);
    y += alto;
  };
  const lineaCanto = (s: ParsedSong, pos: number) => {
    ctx.font = `500 ${fs}px ${familia}`;
    const sangria = ctx.measureText(`${pos} - `).width;
    const trozos: Trozo[] = [
      { texto: `${pos} - `, color: col.suave, peso: 500, tam: fs },
      { texto: s.title, color: col.texto, peso: 500, tam: fs },
    ];
    // (1.31.11) Títulos que son una cita: entre paréntesis cómo empieza la letra (como en el lector).
    const comienzo = s.hymnNumber && esCita(s.title) ? comienzoLetra(s.firstLine ?? getHymn(s.hymnNumber)?.first_line) : null;
    if (comienzo) trozos.push({ texto: ` (${comienzo.join(' ').replace(/[,;:.!?¡¿]+$/, '')}…)`, color: col.suave, peso: 400, tam: fs, italica: true });
    if (s.key) trozos.push({ texto: `  ${s.key}`, color: col.tono, peso: 600, tam: fs });
    if (s.hymnNumber) trozos.push({ texto: ` (${s.hymnNumber})`, color: col.numero, peso: 500, tam: fs });
    if (s.found === false) trozos.push({ texto: `  ${txt.noEncontrado}`, color: col.suave, peso: 400, tam: 10 * S, italica: true });
    if (s.fuera && txt.fuera) trozos.push({ texto: `  · ${txt.fuera}`, color: col.suave, peso: 400, tam: 10 * S, italica: true });
    const tp = conFranjas ? tempoDe(s) : null;
    if (!tp) { escribir(trozos, sangria); return; }
    // Franja: 5 px arriba y abajo, 8 px más ancha a cada lado (como .franja-tempo).
    const donde = ops.length;
    y += 5 * S;
    const y0 = y - 5 * S;
    escribir(trozos, sangria);
    ops.splice(donde, 0, { caja: [y0, y + 5 * S, colorFranja(tp)] });
    y += 5 * S;
  };

  renumerar(cantos).forEach((s, i) => {
    if (i > 0) y += 8 * S; // space-y-2
    if (s.isEspecial) {
      // "Especial Javiera" (1.13.0): "Especial" en celeste y el nombre en el color del texto.
      y += 8 * S;
      escribir([
        { texto: txt.especial ?? 'Especial', color: col.especial, peso: 600, tam: fs },
        ...(s.nombre ? [{ texto: ` ${s.nombre}`, color: col.especial, peso: 600, tam: fs }] : []),
      ]);
      y += 8 * S;
    } else if (s.isPalabra || s.isOracion) {
      y += 8 * S;
      escribir([{ texto: s.isPalabra ? txt.palabra : txt.oracion, color: s.isPalabra ? col.palabra : col.oracion, peso: 600, tam: fs }]);
      y += 8 * S;
    } else if (s.isTexto) {
      // (1.18.2) Texto libre, en naranjo, tal cual.
      y += 8 * S;
      escribir([{ texto: s.texto ?? '', color: col.nota, peso: 500, tam: fs }]);
      y += 8 * S;
    } else {
      // (1.18.2) Ofrenda: aviso pequeño arriba de la alabanza.
      if (s.ofrenda && txt.ofrenda) {
        escribir([{ texto: txt.ofrenda, color: col.ofrenda, peso: 600, tam: 11 * S }]);
        y -= 4 * S;
      }
      const grupo = cadena(s);
      if (grupo.length > 1) {
        // Corchete: de la mitad del primer renglón a la mitad del último (apunta a los números).
        const centros: number[] = [];
        grupo.forEach((x, k) => {
          if (k > 0) y += 4 * S;
          centros.push(y + alto / 2);
          lineaCanto({ ...x, found: x.found ?? true }, s.position + k);
        });
        ops.push({ raya: [centros[0], centros[centros.length - 1]] });
      } else {
        lineaCanto(s, s.position);
      }
    }
  });

  const altoContenido = y + MARGEN;
  const altoTotal = Math.max(ALTO_MIN, Math.ceil(altoContenido));
  const dy = (altoTotal - altoContenido) / 2; // centrada si sobra alto
  lienzo.width = ANCHO;
  lienzo.height = altoTotal;
  ctx.fillStyle = col.fondo;
  ctx.fillRect(0, 0, ANCHO, altoTotal);
  ctx.textBaseline = 'alphabetic';

  // Encabezado: "Minuta" a la izquierda y la fecha a la derecha.
  const base = MARGEN + dy + 20 * S;
  ctx.fillStyle = col.texto;
  ctx.font = `700 ${20 * S}px ${familia}`;
  ctx.fillText(txt.titulo, MARGEN, base);
  ctx.fillStyle = col.suave;
  ctx.font = `500 ${fs}px ${familia}`;
  ctx.textAlign = 'right';
  ctx.fillText(formatearFecha(fecha), ANCHO - MARGEN, base - 2 * S);
  ctx.textAlign = 'left';

  for (const op of ops) {
    if ('caja' in op) {
      const [a, b, c] = op.caja;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.roundRect(MARGEN - 8 * S, a + dy, ANCHO - 2 * MARGEN + 16 * S, b - a, 8 * S);
      ctx.fill();
      continue;
    }
    if ('raya' in op) {
      // Corchete de los cantos agrupados, a la izquierda (como en la portada).
      // (1.18.2) Línea fina en el color de los números, con las puntas hacia el centro de cada número.
      const [a, b] = op.raya;
      const g = 1.5 * S, x = MARGEN - (conFranjas ? 17 : 9) * S, w = 6 * S, r = 3 * S;
      ctx.strokeStyle = col.raya;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = g;
      ctx.beginPath();
      ctx.moveTo(x + w, a + dy);
      ctx.arcTo(x, a + dy, x, b + dy, r);
      ctx.arcTo(x, b + dy, x + w, b + dy, r);
      ctx.lineTo(x + w, b + dy);
      ctx.stroke();
      ctx.globalAlpha = 1;
      continue;
    }
    for (const { t, x } of op.trozos) {
      ctx.font = fuente(t);
      ctx.fillStyle = t.color;
      ctx.fillText(t.texto, MARGEN + x, op.y + dy + fs);
    }
  }

  // (1.31.13) JPEG casi sin pérdida: va dentro de un PDF (ver compartirImagen).
  return new Promise((ok, mal) => lienzo.toBlob(b => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/jpeg', 0.97));
}

/** (1.31.13, Josué: "que esté HD al tiro") PDF de una página con la imagen adentro. WhatsApp no deja que otra app le
 *  active el HD a una foto (la achica); un PDF lo manda como documento, intacto, y sirve directo para imprimir.
 *  PDF mínimo escrito a mano: la imagen va tal cual (JPEG = DCTDecode), sin librerías. */
export async function pdfDeImagen(jpeg: Blob): Promise<Blob> {
  const datos = new Uint8Array(await jpeg.arrayBuffer());
  const bmp = await createImageBitmap(jpeg);
  const w = bmp.width, h = bmp.height;
  bmp.close();
  const anchoPt = 595.28, altoPt = (anchoPt * h) / w; // ancho de una hoja A4; el alto, el de la minuta
  const enc = new TextEncoder();
  const partes: Uint8Array[] = [];
  const offsets: number[] = [];
  let largo = 0;
  const poner = (x: string | Uint8Array) => { const b = typeof x === 'string' ? enc.encode(x) : x; partes.push(b); largo += b.length; };
  const NL = '\n';
  const contenido = `q ${anchoPt.toFixed(2)} 0 0 ${altoPt.toFixed(2)} 0 0 cm /Im0 Do Q`;
  poner('%PDF-1.4' + NL);
  const obj = (n: number, cuerpo: () => void) => { offsets[n] = largo; poner(`${n} 0 obj${NL}`); cuerpo(); poner(`${NL}endobj${NL}`); };
  obj(1, () => poner('<< /Type /Catalog /Pages 2 0 R >>'));
  obj(2, () => poner('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'));
  obj(3, () => poner(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${anchoPt.toFixed(2)} ${altoPt.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => {
    poner(`<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${datos.length} >>${NL}stream${NL}`);
    poner(datos);
    poner(`${NL}endstream`);
  });
  obj(5, () => poner(`<< /Length ${contenido.length} >>${NL}stream${NL}${contenido}${NL}endstream`));
  const xref = largo;
  const filas = [1, 2, 3, 4, 5].map(n => `${String(offsets[n]).padStart(10, '0')} 00000 n ${NL}`).join('');
  poner(`xref${NL}0 6${NL}0000000000 65535 f ${NL}${filas}trailer${NL}<< /Size 6 /Root 1 0 R >>${NL}startxref${NL}${xref}${NL}%%EOF${NL}`);
  return new Blob(partes as BlobPart[], { type: 'application/pdf' });
}

/** Abre el menú de compartir del celular con la imagen; si no se puede (computador), la descarga. */
export async function compartirImagen(blob: Blob, nombre: string): Promise<void> {
  const archivo = new File([await pdfDeImagen(blob)], `${nombre}.pdf`, { type: 'application/pdf' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e; // cerrar el menú sin elegir no es un error
    }
    return;
  }
  const url = URL.createObjectURL(archivo);
  const a = document.createElement('a');
  a.href = url;
  a.download = archivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
