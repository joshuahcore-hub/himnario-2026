// Compartir una minuta como IMAGEN (1.10.0, Josué): la portada del lector (título, fecha y cantos), dibujada en un
// canvas con los colores del tema en uso, y enviada con el menú de compartir del celular (WhatsApp, etc.).
// Se dibuja a mano (no captura de pantalla): funciona sin internet y sale igual en todos los celulares.
import type { ParsedSong } from '@/lib/types';
import { formatearFecha, renumerar } from '@/lib/minutaUtils';

export interface TextosPortada {
  titulo: string;
  palabra: string;
  oracion: string;
  noEncontrado: string;
}

const ANCHO = 1080;
const S = ANCHO / 400;          // la portada del lector mide ~400 px de ancho: todo se escala igual
const MARGEN = 34 * S;
const ALTO_MIN = 1350;          // 4:5, como una foto vertical

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
    oracion: colorDe('--oracion'), raya: colorDe('--border'),
  };
  const fs = 14 * S;             // text-sm
  const alto = fs * 1.45;
  const lienzo = document.createElement('canvas');
  const ctx = lienzo.getContext('2d')!;
  const fuente = (t: Trozo) => `${t.italica ? 'italic ' : ''}${t.peso} ${t.tam}px ${familia}`;

  // Arma las líneas (con salto de línea si un título es largo) y anota qué dibujar; primero mide, después dibuja.
  type Linea = { trozos: { t: Trozo; x: number }[]; y: number };
  const ops: (Linea | { raya: [number, number] })[] = [];
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
    if (s.key) trozos.push({ texto: `  ${s.key}`, color: col.tono, peso: 600, tam: fs });
    if (s.hymnNumber) trozos.push({ texto: ` (${s.hymnNumber})`, color: col.numero, peso: 500, tam: fs });
    if (s.found === false) trozos.push({ texto: `  ${txt.noEncontrado}`, color: col.suave, peso: 400, tam: 10 * S, italica: true });
    escribir(trozos, sangria);
  };

  renumerar(cantos).forEach((s, i) => {
    if (i > 0) y += 8 * S; // space-y-2
    if (s.isPalabra || s.isOracion) {
      y += 8 * S;
      escribir([{ texto: s.isPalabra ? txt.palabra : txt.oracion, color: s.isPalabra ? col.palabra : col.oracion, peso: 600, tam: fs }]);
      y += 8 * S;
    } else if (s.groupedWith) {
      const desde = y;
      lineaCanto(s, s.position);
      y += 4 * S;
      lineaCanto({ ...s.groupedWith, found: s.groupedWith.found ?? true }, s.position + 1);
      ops.push({ raya: [desde, y] });
    } else {
      lineaCanto(s, s.position);
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
    if ('raya' in op) {
      // Corchete de los cantos agrupados, a la izquierda (como en la portada).
      const [a, b] = op.raya;
      const x = MARGEN - 5 * S, g = 2.5 * S;
      ctx.fillStyle = col.raya;
      ctx.fillRect(x - g, a + dy + 3 * S, g, b - a - 6 * S);
      ctx.fillRect(x - g, a + dy + 3 * S, 7 * S, g);
      ctx.fillRect(x - g, b + dy - 3 * S - g, 7 * S, g);
      continue;
    }
    for (const { t, x } of op.trozos) {
      ctx.font = fuente(t);
      ctx.fillStyle = t.color;
      ctx.fillText(t.texto, MARGEN + x, op.y + dy + fs);
    }
  }

  return new Promise((ok, mal) => lienzo.toBlob(b => (b ? ok(b) : mal(new Error('No se pudo crear la imagen'))), 'image/png'));
}

/** Abre el menú de compartir del celular con la imagen; si no se puede (computador), la descarga. */
export async function compartirImagen(blob: Blob, nombre: string): Promise<void> {
  const archivo = new File([blob], `${nombre}.png`, { type: 'image/png' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo] });
    } catch (e) {
      if ((e as Error).name !== 'AbortError') throw e; // cerrar el menú sin elegir no es un error
    }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = archivo.name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
