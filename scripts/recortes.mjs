// Calcula dónde empieza y termina el contenido de cada himno dentro de su imagen (las imágenes tienen un lienzo fijo
// con el himno centrado). En el celular girado (1.6.0) se muestra solo esa franja, a todo el ancho, sin el fondo
// vacío de arriba y abajo. Correr después de `npm run imagenes`:  node scripts/recortes.mjs
import sharp from 'sharp';
import { readdirSync, writeFileSync } from 'fs';

const carpeta = 'public/himnos/claro';
const MARGEN = 24; // px de aire arriba y abajo
const recortes = {};
for (const archivo of readdirSync(carpeta).filter(f => f.endsWith('.webp'))) {
  const n = archivo.replace('.webp', '');
  const { data, info } = await sharp(`${carpeta}/${archivo}`).trim({ threshold: 30 }).toBuffer({ resolveWithObject: true });
  const meta = await sharp(`${carpeta}/${archivo}`).metadata();
  const arriba = Math.max(0, -info.trimOffsetTop - MARGEN);
  const alto = Math.min(meta.height - arriba, info.height + 2 * MARGEN);
  recortes[n] = [meta.width, arriba, alto, meta.height];
  void data;
}
writeFileSync('src/datos/recortes.json', JSON.stringify(recortes));
console.log(Object.keys(recortes).length, 'himnos', JSON.stringify(recortes).slice(0, 200));
