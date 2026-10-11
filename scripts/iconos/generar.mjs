// Genera los íconos y pantallas de apertura definitivos de Himnario 2026 en public/.
// Diseño definido por Josué (10-10-2026): fondo celeste con la libreta anillada y el símbolo de
// Nuevo Cántico en blanco (libreta escala 1.2, símbolo ancho 140, corrido 4 a la derecha).
// Uso: node scripts/iconos/generar.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { iconoConLogo } from './logo-en-libreta.mjs';
import { CELESTE } from './propuestas.mjs';

const PUBLIC = path.resolve('public');
// dx -8 (11-10-2026, pedido de Josué): todo el dibujo un poco a la izquierda; antes quedaba 3 px a la
// derecha del centro y no se sentía equilibrado.
const DISENO = { anchoLogo: 140, corrimiento: 4, fondo: CELESTE, color: '#FFFFFF', dx: -8 };
const escala = e => ({ ...DISENO, margen: (1 - e) / 2 });
export const FONDO_OSCURO = '#1C1A18';
export const CELESTE_CLARO = '#7CC4F2';

// Los nombres llevan versión: al cambiar el diseño se sube VERSION, así ningún celular ni navegador
// puede seguir mostrando un ícono viejo guardado (lo guardan por nombre de archivo).
// Si se cambia VERSION, actualizar también vite.config.ts e index.html (buscar "icono-v").
const VERSION = 'v4';
for (const f of fs.readdirSync(PUBLIC)) if (/^(icon-|icono-v|apple-touch-icon|favicon)/.test(f)) fs.rmSync(path.join(PUBLIC, f));

const guardar = async (archivo, buffer) => {
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, archivo));
  console.log('  ', archivo);
};

// Ícono normal ("any"): diseño grande. iPhone y Android le redondean las esquinas solos.
const normal = await iconoConLogo(512, escala(1.2));
await guardar(`icono-${VERSION}-512.png`, normal);
await guardar(`icono-${VERSION}-192.png`, await sharp(normal).resize(192, 192).png().toBuffer());
await guardar(`icono-${VERSION}-apple-180.png`, await sharp(normal).resize(180, 180).png().toBuffer());
await guardar(`icono-${VERSION}-64.png`, await sharp(normal).resize(64, 64).png().toBuffer());

// Android "maskable": el celular puede recortarlo en círculo; el dibujo debe caber en el 80 % central.
// También es el que muestra Android en su apertura (dentro de un círculo).
await guardar(`icono-${VERSION}-maskable-512.png`, await iconoConLogo(512, escala(0.92)));

// Pantallas de apertura de iPhone (Safari no las genera solo): el ícono (esquinas redondeadas) al centro
// y el nombre debajo, en claro (fondo blanco) y en oscuro (cuando el iPhone está en modo oscuro).
// [ancho CSS, alto CSS, densidad]
const IPHONES = [
  [440, 956, 3], [430, 932, 3], [420, 912, 3], [402, 874, 3], [393, 852, 3], [428, 926, 3],
  [390, 844, 3], [375, 812, 3], [414, 896, 3], [414, 896, 2], [414, 736, 3], [375, 667, 2], [320, 568, 2],
];
const dirApertura = path.join(PUBLIC, 'apertura');
fs.rmSync(dirApertura, { recursive: true, force: true });
fs.mkdirSync(dirApertura, { recursive: true });
const etiquetas = [];
for (const [w, h, d] of IPHONES) {
  for (const [modo, fondo, colorTexto] of [['claro', '#FFFFFF', CELESTE], ['oscuro', FONDO_OSCURO, CELESTE_CLARO]]) {
    // Ícono de 40 % del ancho (máx. 200 px) con esquinas redondeadas, y el nombre debajo; todo centrado.
    const W = w * d, H = h * d;
    const lado = Math.round(Math.min(w * 0.4, 200) * d);
    const altoTexto = Math.round(22 * 1.2 * d), separacion = 16 * d;
    const top = Math.round((H - (lado + separacion + altoTexto)) / 2);
    const esquinas = Buffer.from(`<svg width="${lado}" height="${lado}"><rect width="${lado}" height="${lado}" rx="${lado * 0.23}" fill="#fff"/></svg>`);
    const icono = await sharp(normal).resize(lado, lado).composite([{ input: esquinas, blend: 'dest-in' }]).png().toBuffer();
    const texto = Buffer.from(`<svg width="${W}" height="${altoTexto}">
      <text x="${W / 2}" y="${Math.round(21 * d)}" font-family="Segoe UI, Helvetica, Arial" font-size="${22 * d}"
            font-weight="600" letter-spacing="${d}" text-anchor="middle" fill="${colorTexto}">Himnario 2026</text></svg>`);
    const archivo = `apertura-${VERSION}-${modo}-${W}x${H}.png`;
    await sharp({ create: { width: W, height: H, channels: 3, background: fondo } })
      .composite([
        { input: icono, left: Math.round((W - lado) / 2), top },
        { input: texto, left: 0, top: top + lado + separacion },
      ])
      .png({ compressionLevel: 9 }).toFile(path.join(dirApertura, archivo));
    etiquetas.push(`<link rel="apple-touch-startup-image" media="screen and (device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${d}) and (orientation: portrait) and (prefers-color-scheme: ${modo === 'claro' ? 'light' : 'dark'})" href="/apertura/${archivo}" />`);
  }
}
console.log(`   apertura/ (${IPHONES.length} pantallas de iPhone, en claro y en oscuro)`);

// Las etiquetas <link> van en index.html, entre los comentarios marcadores.
const indexHtml = path.resolve('index.html');
const html = fs.readFileSync(indexHtml, 'utf8');
const nuevo = html.replace(
  /<!-- apertura-iphone:inicio -->[\s\S]*?<!-- apertura-iphone:fin -->/,
  `<!-- apertura-iphone:inicio -->\n    ${etiquetas.join('\n    ')}\n    <!-- apertura-iphone:fin -->`,
);
if (!html.includes('apertura-iphone:inicio')) throw new Error('Faltan los marcadores apertura-iphone en index.html');
fs.writeFileSync(indexHtml, nuevo);
console.log('   index.html actualizado');
