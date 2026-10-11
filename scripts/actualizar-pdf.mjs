// Pone el PDF del himnario disponible para descargar desde la app (Ajustes → Himnario en PDF).
// Uso: npm run pdf -- "<ruta del PDF nuevo>"
// Copia el PDF a public/himnario/Himnario-2026.pdf y anota la fecha y el tamaño en src/datos/pdf.json.
import fs from 'node:fs';
import path from 'node:path';

const origen = process.argv[2];
if (!origen || !fs.existsSync(origen)) {
  console.error('Indica la ruta del PDF: npm run pdf -- "D:\\ruta\\Himnario.pdf"');
  process.exit(1);
}
const destino = path.resolve('public', 'himnario', 'Himnario-2026.pdf');
fs.mkdirSync(path.dirname(destino), { recursive: true });
fs.copyFileSync(origen, destino);
const hoy = new Date();
const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
const datos = { archivo: '/himnario/Himnario-2026.pdf', actualizado: fecha, bytes: fs.statSync(destino).size };
fs.writeFileSync(path.resolve('src', 'datos', 'pdf.json'), JSON.stringify(datos, null, 2) + '\n');
console.log(`PDF listo: ${destino} (${(datos.bytes / 1024).toFixed(0)} KB, ${fecha})`);
