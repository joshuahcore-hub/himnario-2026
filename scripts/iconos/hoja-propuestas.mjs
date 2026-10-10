// Genera una imagen con las propuestas, cada una vista como ícono de celular (esquinas redondeadas).
// Uso: node scripts/iconos/hoja-propuestas.mjs <salida.png>
import sharp from 'sharp';
import { propuestas, svgIcono } from './propuestas.mjs';

const salida = process.argv[2] || 'propuestas-iconos.png';
const T = 260, G = 56, ETIQUETA = 64, COLUMNAS = 3;
const lista = Object.entries(propuestas);
const filas = Math.ceil(lista.length / COLUMNAS);
const ancho = COLUMNAS * T + (COLUMNAS + 1) * G;
const alto = filas * (T + ETIQUETA) + (filas + 1) * G;

const capas = [];
for (const [i, [nombre, dibujo]] of lista.entries()) {
  const x = G + (i % COLUMNAS) * (T + G);
  const y = G + Math.floor(i / COLUMNAS) * (T + ETIQUETA + G);
  const icono = await sharp(Buffer.from(svgIcono(dibujo, { margen: 0.06 }))).resize(T, T).png().toBuffer();
  const mascara = Buffer.from(`<svg width="${T}" height="${T}"><rect width="${T}" height="${T}" rx="${T * 0.22}" fill="#fff"/></svg>`);
  const redondo = await sharp(icono).composite([{ input: mascara, blend: 'dest-in' }]).png().toBuffer();
  const sombra = Buffer.from(`<svg width="${T + 8}" height="${T + 8}"><rect x="4" y="6" width="${T}" height="${T}" rx="${T * 0.22}" fill="#000" opacity="0.10"/></svg>`);
  capas.push({ input: sombra, left: x - 4, top: y - 2 });
  capas.push({ input: redondo, left: x, top: y });
  capas.push({
    input: Buffer.from(`<svg width="${T}" height="${ETIQUETA}"><text x="${T / 2}" y="44" font-family="Segoe UI, Arial" font-size="34" font-weight="700" text-anchor="middle" fill="#333">${nombre}</text></svg>`),
    left: x, top: y + T + 4,
  });
}

await sharp({ create: { width: ancho, height: alto, channels: 3, background: '#E9EEF3' } })
  .composite(capas).png().toFile(salida);
console.log('Hoja:', salida);
