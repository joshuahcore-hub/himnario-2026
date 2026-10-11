// Genera la versión de modo oscuro de cada himno a partir de la clara (fondo blanco).
// Cada píxel se ve como "tinta sobre blanco": se calcula cuánta tinta tiene y de qué color.
// La tinta negra/gris pasa a blanco; la de color (acordes rojos, notas azules y verdes) se mantiene.
// Después se compone sobre el fondo oscuro #0E0D0C (el mismo de las imágenes oscuras anteriores).
// Uso: node scripts/himnario-pdf/oscuro.mjs <carpeta-claro> <carpeta-oscuro>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [origen, destino] = process.argv.slice(2);
const FONDO = [14, 13, 12];
fs.mkdirSync(destino, { recursive: true });

for (const archivo of fs.readdirSync(origen).filter(f => f.endsWith('.png'))) {
  const { data, info } = await sharp(path.join(origen, archivo)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const salida = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const tinta = 1 - Math.min(r, g, b) / 255; // cuánto cubre la tinta (0 = blanco)
    if (tinta < 0.015) {
      salida[i] = FONDO[0]; salida[i + 1] = FONDO[1]; salida[i + 2] = FONDO[2];
      continue;
    }
    // Color de la tinta pura (sin el blanco que la rodea).
    let cr = (r - 255 * (1 - tinta)) / tinta;
    let cg = (g - 255 * (1 - tinta)) / tinta;
    let cb = (b - 255 * (1 - tinta)) / tinta;
    const max = Math.max(cr, cg, cb), min = Math.min(cr, cg, cb);
    if (max - min < 45 && max < 150) { cr = 255; cg = 255; cb = 255; } // negro/gris → blanco
    salida[i] = Math.round(cr * tinta + FONDO[0] * (1 - tinta));
    salida[i + 1] = Math.round(cg * tinta + FONDO[1] * (1 - tinta));
    salida[i + 2] = Math.round(cb * tinta + FONDO[2] * (1 - tinta));
  }
  await sharp(salida, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png({ compressionLevel: 9 }).toFile(path.join(destino, archivo));
}
console.log('oscuras generadas:', fs.readdirSync(destino).length);
