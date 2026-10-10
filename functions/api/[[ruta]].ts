// API del Himnario 2026 (Cloudflare Pages Functions + D1).
// Roles:
//   visor   — cualquiera: lee minutas (GET), sin llave.
//   creador — celular aprobado por el admin: crea/edita/borra minutas.
//   admin   — celular activado con la clave de administrador (secreto ADMIN_KEY): aprueba creadores, ve historial.
// Cada celular se identifica con "Authorization: Bearer <llave>"; aquí solo se guarda el SHA-256 de la llave.

interface Env {
  DB: D1Database;
  ADMIN_KEY?: string;
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

async function leerJson(request: Request): Promise<any> {
  const texto = await request.text();
  if (texto.length > 100_000) throw new ErrorApi(413, 'Datos demasiado grandes.');
  try { return texto ? JSON.parse(texto) : {}; } catch { throw new ErrorApi(400, 'Datos inválidos.'); }
}

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
         c.nombre AS creador_nombre, c.color AS creador_color,
         e.nombre AS editor_nombre, e.color AS editor_color
  FROM minutas m
  LEFT JOIN dispositivos c ON c.id = m.creada_por
  LEFT JOIN dispositivos e ON e.id = m.editada_por`;

// Quién creó/editó cada minuta solo lo ve el administrador: para los demás esos datos no se envían.
function filaAMinuta(f: any, conAutores: boolean) {
  return {
    id: f.id,
    titulo: f.titulo,
    fecha: f.fecha,
    cantos: JSON.parse(f.cantos),
    texto_original: f.texto_original,
    fijada: !!f.fijada,
    creada: f.creada,
    actualizada: f.actualizada,
    creador: conAutores && f.creador_nombre ? { nombre: f.creador_nombre, color: f.creador_color } : null,
    editor: conAutores && f.editor_nombre ? { nombre: f.editor_nombre, color: f.editor_color } : null,
  };
}

const esAdmin = (d: Dispositivo | null) => !!d && d.estado === 'aprobado' && d.rol === 'admin';

async function obtenerMinuta(env: Env, id: string, conAutores: boolean) {
  const f = await env.DB.prepare(`${SELECT_MINUTAS} WHERE m.id = ? AND m.borrada = 0`).bind(id).first();
  if (!f) throw new ErrorApi(404, 'Minuta no encontrada.');
  return filaAMinuta(f, conAutores);
}

const registrar = (env: Env, minutaId: string, dispositivoId: string, accion: string, titulo: string) =>
  env.DB.prepare('INSERT INTO historial (minuta_id, dispositivo_id, accion, titulo, fecha) VALUES (?, ?, ?, ?, ?)')
    .bind(minutaId, dispositivoId, accion, titulo, ahora());

async function rutasMinutas(request: Request, env: Env, partes: string[]): Promise<Response> {
  const metodo = request.method;
  const id = partes[1];
  const quien = await dispositivoActual(request, env);
  const conAutores = esAdmin(quien);

  if (metodo === 'GET' && !id) {
    const { results } = await env.DB.prepare(`${SELECT_MINUTAS} WHERE m.borrada = 0 ORDER BY m.fecha, m.creada`).all();
    return json(results.map(f => filaAMinuta(f, conAutores)));
  }
  if (metodo === 'GET' && id) return json(await obtenerMinuta(env, id, conAutores));

  const yo = exigirEditor(quien);

  if (metodo === 'POST' && !id) {
    const body = await leerJson(request);
    const nueva = crypto.randomUUID();
    const titulo = validarTitulo(body.titulo);
    const t = ahora();
    await env.DB.batch([
      env.DB.prepare(`INSERT INTO minutas (id, titulo, fecha, cantos, texto_original, creada_por, editada_por, creada, actualizada)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(nueva, titulo, validarFecha(body.fecha), validarCantos(body.cantos),
              typeof body.texto_original === 'string' ? body.texto_original.slice(0, 5000) : null,
              yo.id, yo.id, t, t),
      registrar(env, nueva, yo.id, 'creada', titulo),
    ]);
    return json(await obtenerMinuta(env, nueva, conAutores), 201);
  }

  if (metodo === 'PATCH' && id) {
    const actual = await obtenerMinuta(env, id, conAutores);
    const body = await leerJson(request);
    const cambios: string[] = [];
    const valores: unknown[] = [];
    if (body.titulo !== undefined) { cambios.push('titulo = ?'); valores.push(validarTitulo(body.titulo)); }
    if (body.fecha !== undefined) { cambios.push('fecha = ?'); valores.push(validarFecha(body.fecha)); }
    if (body.cantos !== undefined) { cambios.push('cantos = ?'); valores.push(validarCantos(body.cantos)); }
    if (body.fijada !== undefined) { cambios.push('fijada = ?'); valores.push(body.fijada ? 1 : 0); }
    if (cambios.length === 0) return json(actual);
    cambios.push('editada_por = ?', 'actualizada = ?');
    valores.push(yo.id, ahora(), id);
    await env.DB.batch([
      env.DB.prepare(`UPDATE minutas SET ${cambios.join(', ')} WHERE id = ?`).bind(...valores),
      registrar(env, id, yo.id, 'editada', validarTitulo(body.titulo ?? actual.titulo)),
    ]);
    return json(await obtenerMinuta(env, id, conAutores));
  }

  if (metodo === 'DELETE' && id) {
    // Se marca como borrada (no se pierde): el administrador puede restaurarla.
    const actual = await obtenerMinuta(env, id, conAutores);
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

// ---------- Entrada ----------

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  const partes = (Array.isArray(params.ruta) ? params.ruta : [params.ruta]).filter(Boolean) as string[];
  const ip = request.headers.get('cf-connecting-ip') || 'local';
  try {
    switch (partes[0]) {
      case 'minutas': return await rutasMinutas(request, env, partes);
      case 'acceso': return await rutasAcceso(request, env, partes, ip);
      case 'admin': return await rutasAdmin(request, env, partes, ip);
      case 'salud': return json({ ok: true });
      default: throw new ErrorApi(404, 'Ruta no encontrada.');
    }
  } catch (e) {
    if (e instanceof ErrorApi) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Error del servidor.' }, 500);
  }
};
