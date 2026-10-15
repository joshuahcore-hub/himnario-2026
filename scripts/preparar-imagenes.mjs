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
// WebP SIN PÉRDIDA (11-10-2026): con pérdida (calidad 82) el fondo quedaba 1–2 tonos corrido y con manchitas por
// bloques, y se notaba una franja entre la imagen y la pantalla (Josué). Sin pérdida el fondo es EXACTO y, como
// las partituras tienen pocos colores, los archivos pesan ~60 % menos.
const todo = process.argv.includes('--todo');

// FONDO TRANSPARENTE (1.8.0, temas de color): se quita el fondo de cada imagen ("color a transparencia" respecto
// al fondo original: blanco en claro, #0E0D0C en oscuro). La letra y los acordes quedan sobre cualquier color de la
// app (Estándar, Rosa, Lila…); sobre el fondo estándar se ve igual que antes. Antes (hasta 1.7.x) el fondo se
// pintaba con el color exacto de la app y no servía para otros colores.
const FONDO = {
  oscuro: [14, 13, 12],
  claro: [255, 255, 255],
};
/** Quita el fondo: alfa = cuánto se aleja cada píxel del fondo; el color se "des-mezcla" con ese fondo. */
function aTransparente(rgb, fondo) {
  const out = Buffer.alloc((rgb.length / 3) * 4);
  for (let i = 0, j = 0; i < rgb.length; i += 3, j += 4) {
    let a = 0;
    for (let c = 0; c < 3; c++) {
      const v = rgb[i + c], b = fondo[c];
      const ac = v > b ? (v - b) / (255 - b) : v < b ? (b - v) / b : 0;
      if (ac > a) a = ac;
    }
    for (let c = 0; c < 3; c++) {
      const v = rgb[i + c], b = fondo[c];
      out[j + c] = a > 0 ? Math.max(0, Math.min(255, Math.round((v - b) / a + b))) : 0;
    }
    out[j + 3] = Math.round(a * 255);
  }
  return out;
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
    const { data, info } = await sharp(entrada)
      .flatten({ background: { r: fondo[0], g: fondo[1], b: fondo[2] } })
      .resize({ width: ANCHO_MAX, withoutEnlargement: true })
      .raw()
      .toBuffer({ resolveWithObject: true });
    await sharp(aTransparente(data, fondo), { raw: { width: info.width, height: info.height, channels: 4 } })
      .webp({ lossless: true, effort: 6 })
      .toFile(salida);
    convertidas++;
    bytes += fs.statSync(salida).size;
  }
}
console.log(`Convertidas: ${convertidas}  Sin cambios: ${saltadas}  Total: ${(bytes / 1024 / 1024).toFixed(1)} MB`);
