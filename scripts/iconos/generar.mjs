// Genera los íconos y pantallas de apertura definitivos de Himnario 2026 en public/.
// Diseño elegido por Josué (10-10-2026): libreta anillada grande (escala 1.2) con el símbolo de
// Nuevo Cántico al centro (ancho 140, corrido 4 a la derecha), trazo celeste, fondo blanco.
// Uso: node scripts/iconos/generar.mjs
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { iconoConLogo } from './logo-en-libreta.mjs';

const PUBLIC = path.resolve('public');
const DISENO = { anchoLogo: 140, corrimiento: 4 };
const escala = e => ({ ...DISENO, margen: (1 - e) / 2 });

const guardar = async (archivo, buffer) => {
  await sharp(buffer).png({ compressionLevel: 9 }).toFile(path.join(PUBLIC, archivo));
  console.log('  ', archivo);
};

// Ícono normal ("any"): diseño grande, como lo eligió Josué.
const normal = await iconoConLogo(512, escala(1.2));
await guardar('icon-512.png', normal);
await guardar('icon-192.png', await sharp(normal).resize(192, 192).png().toBuffer());
// iPhone redondea las esquinas solo; el diseño queda dentro sin cortes.
await guardar('apple-touch-icon.png', await sharp(normal).resize(180, 180).png().toBuffer());
await guardar('favicon.png', await sharp(normal).resize(64, 64).png().toBuffer());

// Android "maskable": el celular puede recortarlo en círculo; el dibujo debe caber en el 80 % central.
await guardar('icon-maskable-512.png', await iconoConLogo(512, escala(0.92)));

// Versión oscura (mismo dibujo celeste sobre el fondo oscuro de la app, hsl(30 8% 10%)).
export const FONDO_OSCURO = '#1C1A18';
const oscuro = await iconoConLogo(512, { ...escala(1.2), fondo: FONDO_OSCURO });
await guardar('icon-oscuro-512.png', oscuro);

// Pantallas de apertura de iPhone (Safari no las genera solo): ícono al centro y el nombre,
// en claro (fondo blanco) y en oscuro (cuando el iPhone está en modo oscuro).
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
  for (const [modo, imagen, fondo] of [['claro', normal, '#FFFFFF'], ['oscuro', oscuro, FONDO_OSCURO]]) {
    // Misma composición que #apertura en index.html: ícono de 56 % del ancho (máx. 300 px) y el nombre
    // debajo (8 px de separación, letra de 22 px), todo el bloque centrado en la pantalla.
    const W = w * d, H = h * d;
    const lado = Math.round(Math.min(w * 0.56, 300) * d);
    const altoTexto = Math.round(22 * 1.2 * d), separacion = 8 * d;
    const top = Math.round((H - (lado + separacion + altoTexto)) / 2);
    const icono = await sharp(imagen).resize(lado, lado).png().toBuffer();
    const texto = Buffer.from(`<svg width="${W}" height="${altoTexto}">
      <text x="${W / 2}" y="${Math.round(21 * d)}" font-family="Segoe UI, Helvetica, Arial" font-size="${22 * d}"
            font-weight="600" letter-spacing="${d}" text-anchor="middle" fill="#4AA8E8">Himnario 2026</text></svg>`);
    const archivo = `apertura-${modo}-${W}x${H}.png`;
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
if (nuevo === html && !html.includes('apertura-iphone:inicio')) throw new Error('Faltan los marcadores apertura-iphone en index.html');
fs.writeFileSync(indexHtml, nuevo);
console.log('   index.html actualizado');
