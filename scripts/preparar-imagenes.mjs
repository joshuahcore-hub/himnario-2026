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

// El fondo de cada imagen se lleva exactamente al fondo de la app (para que canto e imagen sean una sola
// superficie, sin recuadro): oscuro #0E0D0C → #1C1A18 (hsl 30 8% 10%), claro #FFFFFF → #F7F5F3 (hsl 36 20% 96%).
// Ajuste lineal por canal: el fondo pasa al color de la app y el otro extremo (blanco en oscuro, negro en
// claro) no cambia, así el texto y los acordes conservan su color.
const FONDO = {
  oscuro: { origen: [14, 13, 12], app: [28, 26, 24], fijo: 255 },
  claro: { origen: [255, 255, 255], app: [247, 245, 243], fijo: 0 },
};
function ajusteDeFondo({ origen, app, fijo }) {
  const a = origen.map((o, i) => (app[i] - fijo) / (o - fijo));
  const b = a.map((ai, i) => fijo - ai * fijo);
  return { a, b };
}

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
    const fondo = FONDO[tema];
    const { a, b } = ajusteDeFondo(fondo);
    await sharp(entrada)
      .flatten({ background: { r: fondo.origen[0], g: fondo.origen[1], b: fondo.origen[2] } })
      .linear(a, b)
      .resize({ width: ANCHO_MAX, withoutEnlargement: true })
      .webp({ quality: CALIDAD, effort: 6 })
      .toFile(salida);
    convertidas++;
    bytes += fs.statSync(salida).size;
  }
}
console.log(`Convertidas: ${convertidas}  Sin cambios: ${saltadas}  Total: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
