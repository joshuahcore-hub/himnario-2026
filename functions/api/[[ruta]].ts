// API del Himnario 2026 (Cloudflare Pages Functions + D1).
// Roles:
//   visor   — cualquiera: lee minutas (GET), sin llave.
//   creador — celular aprobado por el admin: crea/edita/borra minutas.
//   admin   — celular activado con la clave de administrador (secreto ADMIN_KEY): aprueba creadores, ve historial.
// Cada celular se identifica con "Authorization: Bearer <llave>"; aquí solo se guarda el SHA-256 de la llave.

interface Env {
  DB: D1Database;
  ADMIN_KEY?: string;
  /** Clave gratis de Google AI Studio (secreto). Sin ella, la lectura de fotos usa solo el PC de respaldo. */
  GEMINI_API_KEY?: string;
  /** Modelo de Gemini a usar (opcional; por defecto se prueban los de MODELOS_GEMINI). */
  GEMINI_MODELO?: string;
  /** Secreto compartido con el PC de respaldo (Ollama) para que pueda avisar que está en línea. */
  PC_SECRET?: string;
}

interface Dispositivo {
  id: string;
  nombre: string;
  color: string;
  rol: 'creador' | 'admin';
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'deshabilitado';
}

const COLORES = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB',
  '#64B5F6', '#4DB6AC', '#81C784', '#FFD54F', '#FF8A65',
];
const MAX_PENDIENTES = 30;        // solicitudes pendientes en total
const MAX_SOLICITUDES_IP_DIA = 5; // solicitudes nuevas por IP en 24 h
const MAX_INTENTOS_ADMIN_HORA = 5;

class ErrorApi extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const ahora = () => new Date().toISOString();
const haceHoras = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function llaveDe(request: Request): string | null {
  const auth = request.headers.get('authorization') || '';
  const llave = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  return /^[A-Za-z0-9_-]{40,100}$/.test(llave) ? llave : null;
}

async function dispositivoActual(request: Request, env: Env): Promise<Dispositivo | null> {
  const llave = llaveDe(request);
  if (!llave) return null;
  return env.DB.prepare('SELECT id, nombre, color, rol, estado FROM dispositivos WHERE llave_hash = ?')
    .bind(await sha256(llave)).first<Dispositivo>();
}

function exigirEditor(d: Dispositivo | null): Dispositivo {
  if (!d || d.estado !== 'aprobado') throw new ErrorApi(403, 'No tienes permiso para crear o editar minutas.');
  return d;
}

function exigirAdmin(d: Dispositivo | null): Dispositivo {
  if (!d || d.estado !== 'aprobado' || d.rol !== 'admin') throw new ErrorApi(403, 'Solo el administrador puede hacer esto.');
  return d;
}

async function leerJson(request: Request, maximo = 100_000): Promise<any> {
  const texto = await request.text();
  if (texto.length > maximo) throw new ErrorApi(413, 'Datos demasiado grandes.');
  try { return texto ? JSON.parse(texto) : {}; } catch { throw new ErrorApi(400, 'Datos inválidos.'); }
}

/** Para fotos (la app las achica antes de enviarlas; aquí se acepta hasta ~6 MB). */
const leerJsonGrande = (request: Request) => leerJson(request, 6_000_000);

function validarNombre(nombre: unknown): string {
  const n = typeof nombre === 'string' ? nombre.trim().replace(/\s+/g, ' ') : '';
  if (n.length < 1 || n.length > 40) throw new ErrorApi(400, 'El nombre debe tener entre 1 y 40 letras.');
  return n;
}

function validarColor(color: unknown): string {
  if (typeof color !== 'string' || !COLORES.includes(color)) throw new ErrorApi(400, 'Color no válido.');
  return color;
}

function validarFecha(fecha: unknown): string {
  if (typeof fecha !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) throw new ErrorApi(400, 'Fecha no válida.');
  return fecha;
}

function validarTitulo(titulo: unknown): string {
  const t = typeof titulo === 'string' ? titulo.trim() : '';
  return (t || 'Minuta').slice(0, 80);
}

function validarCantos(cantos: unknown): string {
  if (!Array.isArray(cantos) || cantos.length > 60) throw new ErrorApi(400, 'Lista de cantos no válida.');
  return JSON.stringify(cantos);
}

// ---------- Minutas ----------

const SELECT_MINUTAS = `
  SELECT m.id, m.titulo, m.fecha, m.cantos, m.texto_original, m.fijada, m.creada, m.actualizada,
         m.publicada, m.creada_por, m.duplicada_de,
         c.nombre AS creador_nombre, c.color AS creador_color,
         e.nombre AS editor_nombre, e.color AS editor_color
  FROM minutas m
  LEFT JOIN dispositivos c ON c.id = m.creada_por
  LEFT JOIN dispositivos e ON e.id = m.editada_por`;

// Quién creó/editó cada minuta solo lo ve el administrador: para los demás esos datos no se envían.
// "mia" indica si la creó quien pregunta (para mostrarle si está publicada o es solo suya).
function filaAMinuta(f: any, conAutores: boolean, quienId: string | null) {
  return {
    id: f.id,
    titulo: f.titulo,
    fecha: f.fecha,
    cantos: JSON.parse(f.cantos),
    texto_original: f.texto_original,
    fijada: !!f.fijada,
    publicada: !!f.publicada,
    mia: !!quienId && f.creada_por === quienId,
    creada: f.creada,
    actualizada: f.actualizada,
    creador: conAutores && f.creador_nombre ? { nombre: f.creador_nombre, color: f.creador_color } : null,
    editor: conAutores && f.editor_nombre ? { nombre: f.editor_nombre, color: f.editor_color } : null,
    duplicada: conAutores && !!f.duplicada_de, // el admin ve "Duplicada por" en vez de "Creada por"
  };
}

const esAdmin = (d: Dispositivo | null) => !!d && d.estado === 'aprobado' && d.rol === 'admin';

// Visibilidad: las publicadas las ve todo el mundo; las privadas, solo quien las creó.
const VISIBLE = '(m.publicada = 1 OR m.creada_por = ?)';

async function obtenerMinuta(env: Env, id: string, conAutores: boolean, quienId: string | null, verificarVisible = true) {
  const f = verificarVisible
    ? await env.DB.prepare(`${SELECT_MINUTAS} WHERE m.id = ? AND m.borrada = 0 AND ${VISIBLE}`).bind(id, quienId ?? '').first()
    : await env.DB.prepare(`${SELECT_MINUTAS} WHERE m.id = ? AND m.borrada = 0`).bind(id).first();
  if (!f) throw new ErrorApi(404, 'Minuta no encontrada.');
  return filaAMinuta(f, conAutores, quienId);
}

const registrar = (env: Env, minutaId: string, dispositivoId: string, accion: string, titulo: string) =>
  env.DB.prepare('INSERT INTO historial (minuta_id, dispositivo_id, accion, titulo, fecha) VALUES (?, ?, ?, ?, ?)')
    .bind(minutaId, dispositivoId, accion, titulo, ahora());

async function rutasMinutas(request: Request, env: Env, partes: string[]): Promise<Response> {
  const metodo = request.method;
  const id = partes[1];
  const quien = await dispositivoActual(request, env);
  const conAutores = esAdmin(quien);
  const quienId = quien?.estado === 'aprobado' ? quien.id : null;

  if (metodo === 'GET' && !id) {
    const { results } = await env.DB.prepare(
      `${SELECT_MINUTAS} WHERE m.borrada = 0 AND ${VISIBLE} ORDER BY m.fecha, m.creada`,
    ).bind(quienId ?? '').all();
    return json(results.map(f => filaAMinuta(f, conAutores, quienId)));
  }
  if (metodo === 'GET' && id) return json(await obtenerMinuta(env, id, conAutores, quienId));

  const yo = exigirEditor(quien);

  if (metodo === 'POST' && !id) {
    const body = await leerJson(request);
    const nueva = crypto.randomUUID();
    const titulo = validarTitulo(body.titulo);
    const publicada = body.publicada === true ? 1 : 0; // por defecto, privada (solo quien la crea)
    const t = ahora();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO minutas (id, titulo, fecha, cantos, texto_original, publicada, creada_por, editada_por, creada, actualizada)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(nueva, titulo, validarFecha(body.fecha), validarCantos(body.cantos),
              typeof body.texto_original === 'string' ? body.texto_original.slice(0, 5000) : null,
              publicada, yo.id, yo.id, t, t),
      registrar(env, nueva, yo.id, 'creada', titulo),
      ...(publicada ? [registrar(env, nueva, yo.id, 'publicada', titulo)] : []),
    ]);
    return json(await obtenerMinuta(env, nueva, conAutores, yo.id), 201);
  }

  // Duplicar: copia privada de quien duplica (cualquier minuta que pueda ver). Es suya: puede editarla y
  // dejarla privada, sin tocar la original.
  if (metodo === 'POST' && id && partes[2] === 'duplicar') {
    const original = await obtenerMinuta(env, id, false, yo.id);
    const nueva = crypto.randomUUID();
    const t = ahora();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO minutas (id, titulo, fecha, cantos, texto_original, publicada, creada_por, editada_por, creada, actualizada, duplicada_de)
                      VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`)
        .bind(nueva, original.titulo, original.fecha, JSON.stringify(original.cantos), original.texto_original,
              yo.id, yo.id, t, t, id),
      registrar(env, nueva, yo.id, 'duplicada', original.titulo),
    ]);
    return json(await obtenerMinuta(env, nueva, conAutores, yo.id), 201);
  }

  if (metodo === 'PATCH' && id) {
    const actual = await obtenerMinuta(env, id, conAutores, yo.id);
    const body = await leerJson(request);
    const cambios: string[] = [];
    const valores: unknown[] = [];
    if (body.titulo !== undefined) { cambios.push('titulo = ?'); valores.push(validarTitulo(body.titulo)); }
    if (body.fecha !== undefined) { cambios.push('fecha = ?'); valores.push(validarFecha(body.fecha)); }
    if (body.cantos !== undefined) { cambios.push('cantos = ?'); valores.push(validarCantos(body.cantos)); }
    if (body.fijada !== undefined) { cambios.push('fijada = ?'); valores.push(body.fijada ? 1 : 0); }
    let cambioVisibilidad: 'publicada' | 'privada' | null = null;
    if (body.publicada !== undefined && !!body.publicada !== actual.publicada) {
      // Publicar o volver a privada: solo quien la creó o el administrador.
      if (!actual.mia && !esAdmin(yo)) throw new ErrorApi(403, 'Solo quien creó la minuta puede cambiar si es pública o privada. Si quieres una para ti, duplícala.');
      cambios.push('publicada = ?');
      valores.push(body.publicada ? 1 : 0);
      cambioVisibilidad = body.publicada ? 'publicada' : 'privada';
    }
    if (cambios.length === 0) return json(actual);
    cambios.push('editada_por = ?', 'actualizada = ?');
    valores.push(yo.id, ahora(), id);
    const titulo = validarTitulo(body.titulo ?? actual.titulo);
    const soloVisibilidad = cambioVisibilidad && cambios.length === 3;
    await env.DB.batch([
      env.DB.prepare(`UPDATE minutas SET ${cambios.join(', ')} WHERE id = ?`).bind(...valores),
      ...(soloVisibilidad ? [] : [registrar(env, id, yo.id, 'editada', titulo)]),
      ...(cambioVisibilidad ? [registrar(env, id, yo.id, cambioVisibilidad, titulo)] : []),
    ]);
    // Sin verificar visibilidad: si el administrador dejó privada la minuta de otro, igual recibe la respuesta.
    return json(await obtenerMinuta(env, id, conAutores, yo.id, false));
  }

  if (metodo === 'DELETE' && id) {
    // Se marca como borrada (no se pierde): el administrador puede restaurarla.
    const actual = await obtenerMinuta(env, id, conAutores, yo.id);
    await env.DB.batch([
      env.DB.prepare('UPDATE minutas SET borrada = 1, editada_por = ?, actualizada = ? WHERE id = ?').bind(yo.id, ahora(), id),
      registrar(env, id, yo.id, 'borrada', actual.titulo),
    ]);
    return json({ ok: true });
  }

  throw new ErrorApi(405, 'Operación no permitida.');
}

// ---------- Acceso (pedir permiso de creador, ver mi estado) ----------

async function rutasAcceso(request: Request, env: Env, partes: string[], ip: string): Promise<Response> {
  const accion = partes[1];

  if (accion === 'yo' && request.method === 'GET') {
    const d = await dispositivoActual(request, env);
    return json(d ? { nombre: d.nombre, color: d.color, rol: d.rol, estado: d.estado } : { estado: 'ninguno' });
  }

  if (accion === 'yo' && request.method === 'PATCH') {
    const d = await dispositivoActual(request, env);
    if (!d) throw new ErrorApi(404, 'Este dispositivo no ha pedido acceso.');
    const body = await leerJson(request);
    const nombre = body.nombre !== undefined ? validarNombre(body.nombre) : d.nombre;
    const color = body.color !== undefined ? validarColor(body.color) : d.color;
    await env.DB.prepare('UPDATE dispositivos SET nombre = ?, color = ?, actualizado = ? WHERE id = ?')
      .bind(nombre, color, ahora(), d.id).run();
    return json({ nombre, color, rol: d.rol, estado: d.estado });
  }

  if (accion === 'solicitar' && request.method === 'POST') {
    const body = await leerJson(request);
    const nombre = validarNombre(body.nombre);
    const color = validarColor(body.color);
    const llave = llaveDe(request);
    if (!llave) throw new ErrorApi(400, 'Falta la llave del dispositivo.');
    const hash = await sha256(llave);
    const existente = await env.DB.prepare('SELECT id, rol, estado FROM dispositivos WHERE llave_hash = ?')
      .bind(hash).first<Dispositivo>();
    if (existente) {
      if (existente.estado === 'deshabilitado') throw new ErrorApi(403, 'Este dispositivo fue deshabilitado por el administrador.');
      const estado = existente.estado === 'rechazado' ? 'pendiente' : existente.estado;
      await env.DB.prepare('UPDATE dispositivos SET nombre = ?, color = ?, estado = ?, actualizado = ? WHERE id = ?')
        .bind(nombre, color, estado, ahora(), existente.id).run();
      return json({ nombre, color, rol: existente.rol, estado });
    }
    const pendientes = await env.DB.prepare("SELECT COUNT(*) AS n FROM dispositivos WHERE estado = 'pendiente'").first<{ n: number }>();
    if ((pendientes?.n ?? 0) >= MAX_PENDIENTES) throw new ErrorApi(429, 'Hay demasiadas solicitudes pendientes. Intenta más tarde.');
    const deIp = await env.DB.prepare('SELECT COUNT(*) AS n FROM dispositivos WHERE ip = ? AND creado > ?')
      .bind(ip, haceHoras(24)).first<{ n: number }>();
    if ((deIp?.n ?? 0) >= MAX_SOLICITUDES_IP_DIA) throw new ErrorApi(429, 'Demasiadas solicitudes desde esta conexión. Intenta mañana.');
    const t = ahora();
    await env.DB.prepare(`INSERT INTO dispositivos (id, llave_hash, nombre, color, rol, estado, ip, creado, actualizado)
                          VALUES (?, ?, ?, ?, 'creador', 'pendiente', ?, ?, ?)`)
      .bind(crypto.randomUUID(), hash, nombre, color, ip, t, t).run();
    return json({ nombre, color, rol: 'creador', estado: 'pendiente' }, 201);
  }

  throw new ErrorApi(404, 'Ruta no encontrada.');
}

// ---------- Administración ----------

async function rutasAdmin(request: Request, env: Env, partes: string[], ip: string): Promise<Response> {
  const seccion = partes[1];

  if (seccion === 'activar' && request.method === 'POST') {
    if (!env.ADMIN_KEY) throw new ErrorApi(503, 'La clave de administrador no está configurada en el servidor.');
    const fallidos = await env.DB.prepare('SELECT COUNT(*) AS n FROM intentos WHERE ip = ? AND fecha > ?')
      .bind(ip, haceHoras(1)).first<{ n: number }>();
    if ((fallidos?.n ?? 0) >= MAX_INTENTOS_ADMIN_HORA) throw new ErrorApi(429, 'Demasiados intentos. Espera una hora.');
    const body = await leerJson(request);
    const llave = llaveDe(request);
    if (!llave) throw new ErrorApi(400, 'Falta la llave del dispositivo.');
    const correcta = typeof body.clave === 'string' && (await sha256(body.clave)) === (await sha256(env.ADMIN_KEY));
    if (!correcta) {
      await env.DB.prepare('INSERT INTO intentos (ip, fecha) VALUES (?, ?)').bind(ip, ahora()).run();
      throw new ErrorApi(401, 'Clave incorrecta.');
    }
    const nombre = validarNombre(body.nombre);
    const color = validarColor(body.color);
    const hash = await sha256(llave);
    const t = ahora();
    await env.DB.prepare(`INSERT INTO dispositivos (id, llave_hash, nombre, color, rol, estado, ip, creado, actualizado)
                          VALUES (?, ?, ?, ?, 'admin', 'aprobado', ?, ?, ?)
                          ON CONFLICT (llave_hash) DO UPDATE SET nombre = excluded.nombre, color = excluded.color,
                            rol = 'admin', estado = 'aprobado', actualizado = excluded.actualizado`)
      .bind(crypto.randomUUID(), hash, nombre, color, ip, t, t).run();
    return json({ nombre, color, rol: 'admin', estado: 'aprobado' });
  }

  const yo = exigirAdmin(await dispositivoActual(request, env));

  if (seccion === 'dispositivos' && request.method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT d.id, d.nombre, d.color, d.rol, d.estado, d.creado, d.actualizado,
             (SELECT COUNT(*) FROM minutas m WHERE m.creada_por = d.id AND m.borrada = 0) AS minutas
      FROM dispositivos d ORDER BY d.estado = 'pendiente' DESC, d.actualizado DESC`).all();
    return json(results.map((d: any) => ({ ...d, yo: d.id === yo.id })));
  }

  if (seccion === 'dispositivos' && request.method === 'PATCH' && partes[2]) {
    const body = await leerJson(request);
    if (!['aprobado', 'rechazado', 'deshabilitado'].includes(body.estado)) throw new ErrorApi(400, 'Estado no válido.');
    if (partes[2] === yo.id) throw new ErrorApi(400, 'No puedes cambiar tu propio acceso.');
    const r = await env.DB.prepare('UPDATE dispositivos SET estado = ?, actualizado = ? WHERE id = ?')
      .bind(body.estado, ahora(), partes[2]).run();
    if (!r.meta.changes) throw new ErrorApi(404, 'Dispositivo no encontrado.');
    return json({ ok: true });
  }

  // Ajustes de la IA: permitir o no la lectura de fotos a los creadores.
  if (seccion === 'config' && request.method === 'GET') {
    return json({ ia_creadores: (await leerConfig(env, 'ia_creadores')) === '1' });
  }
  if (seccion === 'config' && request.method === 'PATCH') {
    const body = await leerJson(request);
    if (typeof body.ia_creadores === 'boolean') await guardarConfig(env, 'ia_creadores', body.ia_creadores ? '1' : '0');
    return json({ ia_creadores: (await leerConfig(env, 'ia_creadores')) === '1' });
  }

  if (seccion === 'historial' && request.method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT h.id, h.minuta_id, h.accion, h.titulo, h.fecha, d.nombre, d.color,
             (SELECT borrada FROM minutas m WHERE m.id = h.minuta_id) AS borrada
      FROM historial h LEFT JOIN dispositivos d ON d.id = h.dispositivo_id
      ORDER BY h.fecha DESC LIMIT 200`).all();
    return json(results);
  }

  if (seccion === 'restaurar' && request.method === 'POST' && partes[2]) {
    const f = await env.DB.prepare('SELECT titulo FROM minutas WHERE id = ? AND borrada = 1').bind(partes[2]).first<{ titulo: string }>();
    if (!f) throw new ErrorApi(404, 'No hay una minuta borrada con ese código.');
    await env.DB.batch([
      env.DB.prepare('UPDATE minutas SET borrada = 0, editada_por = ?, actualizada = ? WHERE id = ?').bind(yo.id, ahora(), partes[2]),
      registrar(env, partes[2], yo.id, 'restaurada', f.titulo),
    ]);
    return json({ ok: true });
  }

  throw new ErrorApi(404, 'Ruta no encontrada.');
}

// ---------- IA: leer fotos de minutas ----------
// La IA SOLO transcribe el texto de la foto; el emparejamiento con el himnario lo hace la app (src/lib/leerMinuta.ts).
// Primero Gemini (cupo gratis, clave en el secreto GEMINI_API_KEY); si falla o se agotó, el PC de respaldo (Ollama).

const MODELOS_GEMINI = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const LIMITE_FOTOS_CREADOR_DIA = 10;
const PC_EN_LINEA_MS = 2.5 * 60_000; // el PC avisa cada minuto; si no avisa en 2,5 min se considera apagado
const PAUSA_GEMINI_MS = 10 * 60_000;  // tras "demasiadas solicitudes", no reintentar Gemini por 10 min

const INSTRUCCION_OCR = `Esta imagen es una minuta: la lista de cantos para un culto, escrita a mano o enviada por WhatsApp.
Transcribe SOLO su contenido, una línea por renglón y en el mismo orden.
Copia los números de himno tal como aparecen. Si dos cantos están en el mismo renglón, déjalos en el mismo renglón.
Incluye las palabras Palabra, Predicación u Oración si aparecen, y la fecha si aparece.
No agregues explicaciones, títulos ni comentarios: solo el texto.`;

async function leerConfig(env: Env, clave: string): Promise<string | null> {
  const f = await env.DB.prepare('SELECT valor FROM config WHERE clave = ?').bind(clave).first<{ valor: string }>();
  return f?.valor ?? null;
}

const guardarConfig = (env: Env, clave: string, valor: string) =>
  env.DB.prepare(`INSERT INTO config (clave, valor, actualizado) VALUES (?, ?, ?)
                  ON CONFLICT (clave) DO UPDATE SET valor = excluded.valor, actualizado = excluded.actualizado`)
    .bind(clave, valor, ahora()).run();

async function estadoIa(env: Env, yo: Dispositivo | null) {
  const admin = esAdmin(yo);
  const paraCreadores = (await leerConfig(env, 'ia_creadores')) === '1';
  const permitido = !!yo && yo.estado === 'aprobado' && (admin || paraCreadores);
  const pausaGemini = Number((await leerConfig(env, 'gemini_pausa_hasta')) ?? 0);
  const pcVisto = Number((await leerConfig(env, 'pc_visto')) ?? 0);
  let restantes: number | null = null;
  if (permitido && !admin) {
    const usadas = await env.DB.prepare('SELECT COUNT(*) AS n FROM ia_uso WHERE dispositivo_id = ? AND fecha > ?')
      .bind(yo!.id, haceHoras(24)).first<{ n: number }>();
    restantes = Math.max(0, LIMITE_FOTOS_CREADOR_DIA - (usadas?.n ?? 0));
  }
  return {
    permitido,
    paraCreadores,
    gemini: !!env.GEMINI_API_KEY && Date.now() > pausaGemini,
    pc: Date.now() - pcVisto < PC_EN_LINEA_MS,
    restantes,
  };
}

async function ocrGemini(env: Env, imagen: string, mime: string): Promise<string> {
  const modelos = env.GEMINI_MODELO ? [env.GEMINI_MODELO] : MODELOS_GEMINI;
  let ultimo = '';
  for (const modelo of modelos) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
      body: JSON.stringify({
        contents: [{ parts: [{ text: INSTRUCCION_OCR }, { inline_data: { mime_type: mime, data: imagen } }] }],
        generationConfig: { temperature: 0 },
      }),
    });
    if (r.ok) {
      const datos: any = await r.json();
      const texto = (datos?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('\n').trim();
      if (texto) return texto;
      ultimo = 'sin texto';
      continue;
    }
    ultimo = `${r.status}`;
    if (r.status === 429) {
      await guardarConfig(env, 'gemini_pausa_hasta', String(Date.now() + PAUSA_GEMINI_MS));
      break; // cupo agotado: no tiene sentido probar otro modelo del mismo proyecto
    }
    if (r.status !== 404 && r.status !== 400) break; // 404/400: modelo no disponible → probar el siguiente
  }
  throw new Error(`Gemini: ${ultimo}`);
}

async function ocrPc(env: Env, imagen: string): Promise<string> {
  const url = await leerConfig(env, 'pc_url');
  if (!url || !env.PC_SECRET) throw new Error('PC no configurado');
  const r = await fetch(`${url}/leer`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-pc-secreto': env.PC_SECRET },
    body: JSON.stringify({ imagen, instruccion: INSTRUCCION_OCR }),
  });
  if (!r.ok) throw new Error(`PC: ${r.status}`);
  const datos: any = await r.json();
  if (!datos?.texto) throw new Error('PC: sin texto');
  return String(datos.texto).trim();
}

async function rutasIa(request: Request, env: Env, partes: string[]): Promise<Response> {
  const yo = await dispositivoActual(request, env);

  if (partes[1] === 'estado' && request.method === 'GET') return json(await estadoIa(env, yo));

  if (partes[1] === 'leer' && request.method === 'POST') {
    const estado = await estadoIa(env, yo);
    if (!estado.permitido) throw new ErrorApi(403, 'La lectura de fotos con IA no está habilitada para ti.');
    if (estado.restantes === 0) throw new ErrorApi(429, `Llegaste al límite de ${LIMITE_FOTOS_CREADOR_DIA} fotos por día. Usa el modo manual o pega el texto.`);
    const body = await leerJsonGrande(request);
    const imagen = typeof body.imagen === 'string' ? body.imagen.replace(/^data:[^,]+,/, '') : '';
    const mime = typeof body.mime === 'string' && /^image\/(jpeg|png|webp)$/.test(body.mime) ? body.mime : 'image/jpeg';
    if (!imagen) throw new ErrorApi(400, 'Falta la imagen.');

    let texto = '', fuente = '';
    const errores: string[] = [];
    if (estado.gemini) {
      try { texto = await ocrGemini(env, imagen, mime); fuente = 'gemini'; } catch (e) { errores.push(String((e as Error).message)); }
    }
    if (!texto && estado.pc) {
      try { texto = await ocrPc(env, imagen); fuente = 'pc'; } catch (e) { errores.push(String((e as Error).message)); }
    }
    if (!texto) {
      console.error('IA sin resultado', errores);
      throw new ErrorApi(503, 'La IA no está disponible ahora. Pega el texto o usa el modo manual.');
    }
    await env.DB.prepare('INSERT INTO ia_uso (dispositivo_id, fecha, fuente) VALUES (?, ?, ?)').bind(yo!.id, ahora(), fuente).run();
    return json({ texto, fuente });
  }

  throw new ErrorApi(404, 'Ruta no encontrada.');
}

/** El PC de respaldo avisa que está en línea y en qué dirección (túnel), con el secreto compartido. */
async function rutasPc(request: Request, env: Env, partes: string[]): Promise<Response> {
  if (partes[1] !== 'latido' || request.method !== 'POST') throw new ErrorApi(404, 'Ruta no encontrada.');
  if (!env.PC_SECRET || request.headers.get('x-pc-secreto') !== env.PC_SECRET) throw new ErrorApi(401, 'No autorizado.');
  const body = await leerJson(request);
  if (typeof body.url !== 'string' || !/^https:\/\/[a-z0-9.-]+$/i.test(body.url)) throw new ErrorApi(400, 'URL no válida.');
  await guardarConfig(env, 'pc_url', body.url);
  await guardarConfig(env, 'pc_visto', String(Date.now()));
  return json({ ok: true });
}

// ---------- Entrada ----------

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const partes = (Array.isArray(params.ruta) ? params.ruta : [params.ruta]).filter(Boolean) as string[];
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  try {
    switch (partes[0]) {
      case 'minutas': return await rutasMinutas(request, env, partes);
      case 'acceso': return await rutasAcceso(request, env, partes, ip);
      case 'admin': return await rutasAdmin(request, env, partes, ip);
      case 'ia': return await rutasIa(request, env, partes);
      case 'pc': return await rutasPc(request, env, partes);
      case 'salud': return json({ ok: true });
      default: throw new ErrorApi(404, 'Ruta no encontrada.');
    }
  } catch (e) {
    if (e instanceof ErrorApi) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Error del servidor.' }, 500);
  }
};
