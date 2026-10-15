// Claves de las notificaciones (1.11.0): par VAPID propio de la app (P-256). Se crean al azar y se guardan DIRECTO como
// secretos de Cloudflare (VAPID_PRIVADA y VAPID_PUBLICA), sin mostrarse ni quedar en archivos. Nadie necesita saberlas.
//   node scripts/claves-notificaciones.mjs            → secretos del proyecto en Cloudflare (luego volver a publicar)
//   node scripts/claves-notificaciones.mjs --local    → par de PRUEBA en .dev.vars (no se sube) para wrangler pages dev
// OJO: cambiar las claves en Cloudflare deja sin efecto las suscripciones existentes (cada celular se vuelve a suscribir
// solo al abrir la app). Hacerlo una sola vez.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const par = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const privada = JSON.stringify(await crypto.subtle.exportKey('jwk', par.privateKey));
const publica = Buffer.from(await crypto.subtle.exportKey('raw', par.publicKey)).toString('base64url');

if (process.argv.includes('--local')) {
  const archivo = '.dev.vars';
  const lineas = (fs.existsSync(archivo) ? fs.readFileSync(archivo, 'utf8') : '').split(/\r?\n/)
    .filter(l => l && !l.startsWith('VAPID_'));
  lineas.push(`VAPID_PRIVADA='${privada}'`, `VAPID_PUBLICA=${publica}`);
  fs.writeFileSync(archivo, lineas.join('\n') + '\n');
  console.log('Claves de prueba guardadas en .dev.vars.');
} else {
  for (const [nombre, valor] of [['VAPID_PRIVADA', privada], ['VAPID_PUBLICA', publica]]) {
    const r = spawnSync('npx', ['wrangler', 'pages', 'secret', 'put', nombre, '--project-name', 'himnario-2026'],
      { input: valor, stdio: ['pipe', 'inherit', 'inherit'], shell: true });
    if (r.status !== 0) { console.error(`No se pudo guardar ${nombre}.`); process.exit(1); }
  }
  console.log('Claves guardadas en Cloudflare. Vuelve a publicar para que se activen.');
}
