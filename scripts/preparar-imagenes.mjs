// Convierte las imágenes maestras (PNG) de los himnos a WebP para la app.
// Origen:  ../imagenes-originales/{claro,oscuro}/N.png  (fuera del repositorio, no se sube a GitHub)
// Destino: public/himnos/{claro,oscuro}/N.webp
// Uso: npm run imagenes            (solo convierte las que falten o hayan cambiado)
//      npm run imagenes -- --todo  (vuelve a convertir todas)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ORIGEN = path.resolve('..', 'imagenes-originales');
const DESTINO = path.resolve('public', 'himnos');
const ANCHO_MAX = 1400;
const CALIDAD = 82;
const todo = process.argv.includes('--todo');

let convertidas = 0, saltadas = 0, bytes = 0;
for (const tema of ['claro', 'oscuro']) {
  const dirOrigen = path.join(ORIGEN, tema);
  const dirDestino = path.join(DESTINO, tema);
  fs.mkdirSync(dirDestino, { recursive: true });
  for (const archivo of fs.readdirSync(dirOrigen).filter(f => f.endsWith('.png'))) {
    const entrada = path.join(dirOrigen, archivo);
    const salida = path.join(dirDestino, archivo.replace(/\.png$/, '.webp'));
    if (!todo && fs.existsSync(salida) && fs.statSync(salida).mtimeMs >= fs.statSync(entrada).mtimeMs) {
      saltadas++;
      bytes += fs.statSync(salida).size;
      continue;
    }
    await sharp(entrada)
      .flatten({ background: tema === 'oscuro' ? '#0E0D0C' : '#FFFFFF' })
      .resize({ width: ANCHO_MAX, withoutEnlargement: true })
      .webp({ quality: CALIDAD, effort: 6 })
      .toFile(salida);
    convertidas++;
    bytes += fs.statSync(salida).size;
  }
}
console.log(`Convertidas: ${convertidas}  Sin cambios: ${saltadas}  Total: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
