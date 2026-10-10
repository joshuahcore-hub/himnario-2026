// Ícono: libreta anillada (propuesta 1) con el logo de Nuevo Cántico en el centro, todo en celeste.
// Exporta `iconoConLogo(tamaño, { margen, variante })` → PNG (Buffer) con fondo blanco.
// Uso directo: node scripts/iconos/logo-en-libreta.mjs <hoja-comparacion.png>
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { propuestas, svgIcono, CELESTE } from './propuestas.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const SIMBOLO = path.join(aqui, 'simbolo-nc-celeste.png');
const LOGO_COMPLETO = path.resolve(aqui, '../../../recursos/logo-nc/Logo NC Negro (PNG).png');

// Interior de la libreta en el lienzo de 512: x 171–369, y 115–397 → centro (270, 256).
const CENTRO = { x: 270, y: 256 };

async function logoCompletoCeleste(ancho) {
  const alfa = await sharp(LOGO_COMPLETO).ensureAlpha().extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
  const { width, height } = alfa.info;
  return sharp({ create: { width, height, channels: 3, background: CELESTE } })
    .joinChannel(alfa.data, { raw: { width, height, channels: 1 } })
    .png().toBuffer().then(b => sharp(b).trim().resize({ width: ancho }).png().toBuffer());
}

export const variantes = {
  'Símbolo mediano': { fuente: 'simbolo', ancho: 128 },
  'Símbolo grande': { fuente: 'simbolo', ancho: 158 },
  'Logo con letras': { fuente: 'completo', ancho: 162 },
};

/** Cambia el color de una imagen de un solo color (conserva su transparencia). */
async function teñir(imagen, color) {
  const alfa = await sharp(imagen).ensureAlpha().extractChannel('alpha').raw().toBuffer({ resolveWithObject: true });
  const { width, height } = alfa.info;
  return sharp({ create: { width, height, channels: 3, background: color } })
    .joinChannel(alfa.data, { raw: { width, height, channels: 1 } }).png().toBuffer();
}

export async function iconoConLogo(tam = 512, { margen = 0, variante = 'Símbolo mediano', anchoLogo, corrimiento = 0, fondo = '#FFFFFF', color = CELESTE } = {}) {
  const v = { ...variantes[variante], ...(anchoLogo ? { ancho: anchoLogo } : {}) };
  // El color se cambia solo en el dibujo (no en el fondo, que puede ser celeste).
  const svg = svgIcono(propuestas['1'].replaceAll(CELESTE, color), { margen, fondo });
  const base = await sharp(Buffer.from(svg)).png().toBuffer();
  let logo = v.fuente === 'simbolo'
    ? await sharp(SIMBOLO).resize({ width: Math.round(v.ancho * (1 - margen * 2)) }).png().toBuffer()
    : await logoCompletoCeleste(Math.round(v.ancho * (1 - margen * 2)));
  if (color !== CELESTE) logo = await teñir(logo, color);
  const meta = await sharp(logo).metadata();
  const s = 1 - margen * 2, t = 256 * (1 - s);
  const cx = t + (CENTRO.x + corrimiento) * s, cy = t + CENTRO.y * s;
  const compuesto = await sharp(base)
    .composite([{ input: logo, left: Math.round(cx - meta.width / 2), top: Math.round(cy - meta.height / 2) }])
    .png().toBuffer();
  return tam === 512 ? compuesto : sharp(compuesto).resize(tam, tam).png().toBuffer();
}

// Hoja de comparación de tamaños (cuando se ejecuta directamente). `escala` agranda libreta + logo juntos.
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const salida = process.argv[2] || 'logo-en-libreta.png';
  const T = 300, G = 56, ETQ = 64;
  // Libreta tamaño "C" (escala 1.2); se comparan tamaño y corrimiento del logo.
  const opciones = {
    'Corrido 4': { anchoLogo: 140, corrimiento: 4 },
    'Corrido 7': { anchoLogo: 140, corrimiento: 7 },
    'Corrido 10': { anchoLogo: 140, corrimiento: 10 },
  };
  const nombres = Object.keys(opciones);
  const capas = [];
  for (const [i, nombre] of nombres.entries()) {
    const x = G + i * (T + G);
    const icono = await sharp(await iconoConLogo(512, { margen: -0.1, ...opciones[nombre] })).resize(T, T).png().toBuffer();
    const mascara = Buffer.from(`<svg width="${T}" height="${T}"><rect width="${T}" height="${T}" rx="${T * 0.22}" fill="#fff"/></svg>`);
    const redondo = await sharp(icono).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();
    const sombra = Buffer.from(`<svg width="${T + 8}" height="${T + 8}"><rect x="4" y="6" width="${T}" height="${T}" rx="${T * 0.22}" fill="#000" opacity="0.10"/></svg>`);
    capas.push({ input: sombra, left: x - 4, top: G - 2 }, { input: redondo, left: x, top: G });
    capas.push({
      input: Buffer.from(`<svg width="${T}" height="${ETQ}"><text x="${T / 2}" y="44" font-family="Segoe UI, Arial" font-size="28" font-weight="700" text-anchor="middle" fill="#333">${String.fromCharCode(65 + i)} · ${nombre}</text></svg>`),
      left: x, top: G + T + 4,
    });
  }
  await sharp({ create: { width: nombres.length * (T + G) + G, height: T + ETQ + 2 * G, channels: 3, background: '#E9EEF3' } })
    .composite(capas).png().toFile(salida);
  console.log('Hoja:', salida);
}
