// Proyección (1.12.0): sube a Cloudflare KV el PowerPoint maestro (en partes de 20 MB), su índice y la Biblia.
// Uso (después de armar_maestro.ps1 y biblia.py):
//   node scripts/proyeccion/subir.mjs ..\proyeccion\maestro.pptx ..\proyeccion\maestro.json ..\proyeccion\biblia.json
// Los computadores con el permiso bajan el maestro nuevo la próxima vez que generen una proyección.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const [maestro, indice, biblia] = process.argv.slice(2);
const ID = '7d1818aa98554f1aa8f0deb1bbfc61cd'; // KV "himnario-proyeccion" (wrangler.toml → PROYECCION)
const PARTE = 20 * 1024 * 1024;

function poner(clave, archivo) {
  const r = spawnSync('npx', ['wrangler', 'kv', 'key', 'put', clave, '--path', `"${archivo}"`, '--namespace-id', ID, '--remote'],
    { stdio: ['ignore', 'pipe', 'inherit'], shell: true });
  if (r.status !== 0) { console.error(`No se pudo subir ${clave}.`); process.exit(1); }
  console.log('subido', clave);
}

const datos = fs.readFileSync(maestro);
const idx = JSON.parse(fs.readFileSync(indice, 'utf8'));
const version = idx.version.replace(/[^\w-]/g, '-');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-'));
const partes = Math.ceil(datos.length / PARTE);
for (let i = 0; i < partes; i++) {
  const f = path.join(tmp, `parte-${i}`);
  fs.writeFileSync(f, datos.subarray(i * PARTE, (i + 1) * PARTE));
  poner(`maestro-${version}-${i}`, f);
}
if (biblia) poner('biblia', path.resolve(biblia));
// meta al final: recién entonces los computadores ven la versión nueva (todas sus partes ya están).
const meta = path.join(tmp, 'meta.json');
fs.writeFileSync(meta, JSON.stringify({ version, partes, bytes: datos.length, indice: idx }));
poner('meta', meta);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`Listo: maestro ${version} (${(datos.length / 1048576).toFixed(1)} MB en ${partes} partes).`);
