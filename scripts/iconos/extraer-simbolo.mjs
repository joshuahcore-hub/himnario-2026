// Extrae del logo "Nuevo Cántico" solo el símbolo central (sin las letras) y lo pinta de celeste,
// con fondo transparente. Uso: node scripts/iconos/extraer-simbolo.mjs <logo.png> <salida.png>
import sharp from 'sharp';
import { CELESTE } from './propuestas.mjs';

const [entrada, salida] = process.argv.slice(2);
const { data, info } = await sharp(entrada).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const opaco = (x, y) => data[(y * W + x) * 4 + 3] > 40;

// Bandas horizontales con tinta: arriba "NUEVO", al medio el símbolo, abajo "CÁNTICO".
// Se busca la banda que contiene el centro de la imagen, mirando solo la franja central.
const x0 = Math.round(W * 0.3), x1 = Math.round(W * 0.7);
const filaConTinta = y => { for (let x = x0; x < x1; x++) if (opaco(x, y)) return true; return false; };
let arriba = Math.round(H / 2), abajo = Math.round(H / 2);
while (arriba > 0 && filaConTinta(arriba - 1)) arriba--;
while (abajo < H - 1 && filaConTinta(abajo + 1)) abajo++;

// Ancho real del símbolo: se mide sin las últimas filas, donde ya asoman las puntas de la "C" y la "O" de CÁNTICO.
let izq = W, der = 0;
for (let y = arriba; y <= abajo - Math.round(H * 0.04); y++) for (let x = 0; x < W; x++) if (opaco(x, y)) { izq = Math.min(izq, x); der = Math.max(der, x); }

const ancho = der - izq + 1, alto = abajo - arriba + 1;
const mascara = await sharp(entrada).extract({ left: izq, top: arriba, width: ancho, height: alto })
  .ensureAlpha().extractChannel('alpha').toBuffer();
await sharp({ create: { width: ancho, height: alto, channels: 3, background: CELESTE } })
  .joinChannel(mascara).png().toFile(salida);
console.log(`Símbolo: ${ancho}x${alto} (x ${izq}-${der}, y ${arriba}-${abajo}) → ${salida}`);
