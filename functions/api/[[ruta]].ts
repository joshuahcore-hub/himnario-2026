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
  /** 0 = músico: tiene nombre (recibe recordatorios) pero no crea minutas (1.7.1). */
  crea_minutas: number;
  /** 1 = puede dejar recordatorios a otras personas (el admin siempre puede). */
  recordatorios_otros: number;
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
  return env.DB.prepare('SELECT id, nombre, color, rol, estado, crea_minutas, recordatorios_otros FROM dispositivos WHERE llave_hash = ?')
    .bind(await sha256(llave)).first<Dispositivo>();
}

function exigirEditor(d: Dispositivo | null): Dispositivo {
  if (!d || d.estado !== 'aprobado' || (d.rol !== 'admin' && !d.crea_minutas)) throw new ErrorApi(403, 'No tienes permiso para crear o editar minutas.');
  return d;
}

/** Cualquier persona aprobada con nombre (creador, músico o admin): recordatorios en el servidor. */
function exigirConNombre(d: Dispositivo | null): Dispositivo {
  if (!d || d.estado !== 'aprobado') throw new ErrorApi(403, 'Necesitas tener tu nombre aprobado en la app.');
  return d;
}

/** Dejar recordatorios a otras personas: el admin y quienes él autorice. */
const puedeDejarAOtros = (d: Dispositivo) => d.rol === 'admin' || !!d.recordatorios_otros;

/** Lo que el celular necesita saber de sí mismo. */
const datosAcceso = (d: { nombre: string; color: string; rol: string; estado: string; crea_minutas?: number; recordatorios_otros?: number }) => ({
  nombre: d.nombre, color: d.color, rol: d.rol, estado: d.estado,
  crea_minutas: d.rol === 'admin' || d.crea_minutas !== 0,
  recordatorios_otros: d.rol === 'admin' || !!d.recordatorios_otros,
});

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
  const conAutores = true; // (1.5.5, Josué) "Creada por" lo ven todos, no solo el administrador.
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
      // Los recordatorios "solo en esta minuta" pasan a la copia SOLO si quien duplica podía verlos (los escribió o
      // eran para él). Los personales de otra persona no se copian: nadie ve recordatorios ajenos (Josué, 1.7.0).
      env.DB.prepare(`INSERT INTO recordatorios (id, himno, autor_id, para_id, texto, minuta_id, estado, pos_x, pos_y, tam, creado, actualizado)
                      SELECT lower(hex(randomblob(16))), himno, autor_id, para_id, texto, ?, estado, pos_x, pos_y, tam, creado, ?
                      FROM recordatorios WHERE minuta_id = ? AND (autor_id = ? OR para_id = ?)`).bind(nueva, t, id, yo.id, yo.id),
    ]);
    return json(await obtenerMinuta(env, nueva, conAutores, yo.id), 201);
  }

  if (metodo === 'PATCH' && id) {
    const actual = await obtenerMinuta(env, id, conAutores, yo.id);
    // Editar (y fijar, publicar o dejar privada) SOLO quien la creó: tampoco el administrador (Josué, 1.5.4).
    // En una minuta ajena se puede solo ver y duplicar; la copia es de quien duplica.
    if (!actual.mia) throw new ErrorApi(403, 'Esta minuta es de otra persona: solo puedes duplicarla y editar tu copia.');
    const body = await leerJson(request);
    const cambios: string[] = [];
    const valores: unknown[] = [];
    if (body.titulo !== undefined) { cambios.push('titulo = ?'); valores.push(validarTitulo(body.titulo)); }
    if (body.fecha !== undefined) { cambios.push('fecha = ?'); valores.push(validarFecha(body.fecha)); }
    if (body.cantos !== undefined) { cambios.push('cantos = ?'); valores.push(validarCantos(body.cantos)); }
    if (body.fijada !== undefined) { cambios.push('fijada = ?'); valores.push(body.fijada ? 1 : 0); }
    let cambioVisibilidad: 'publicada' | 'privada' | null = null;
    if (body.publicada !== undefined && !!body.publicada !== actual.publicada) {
      // Publicar o volver a privada: SOLO quien la creó (tampoco el administrador: dejar privada una ajena la
      // escondía para todos menos su autor). Si alguien quiere una para sí, la duplica.
      if (!actual.mia) throw new ErrorApi(403, 'Solo quien creó la minuta puede cambiar si es pública o privada. Si quieres una para ti, duplícala.');
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
    // Borrar SOLO quien la creó (tampoco el administrador).
    // Se marca como borrada (no se pierde): el administrador puede restaurarla.
    const actual = await obtenerMinuta(env, id, conAutores, yo.id);
    if (!actual.mia) throw new ErrorApi(403, 'Esta minuta es de otra persona: solo puedes duplicarla y editar tu copia.');
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
    return json(d ? datosAcceso(d) : { estado: 'ninguno' });
  }

  if (accion === 'yo' && request.method === 'PATCH') {
    const d = await dispositivoActual(request, env);
    if (!d) throw new ErrorApi(404, 'Este dispositivo no ha pedido acceso.');
    const body = await leerJson(request);
    const nombre = body.nombre !== undefined ? validarNombre(body.nombre) : d.nombre;
    const color = body.color !== undefined ? validarColor(body.color) : d.color;
    await env.DB.prepare('UPDATE dispositivos SET nombre = ?, color = ?, actualizado = ? WHERE id = ?')
      .bind(nombre, color, ahora(), d.id).run();
    return json(datosAcceso({ ...d, nombre, color }));
  }

  if (accion === 'solicitar' && request.method === 'POST') {
    const body = await leerJson(request);
    const nombre = validarNombre(body.nombre);
    const color = validarColor(body.color);
    // (1.7.1, Josué) Registrarse: la persona pone su nombre y color y QUEDA REGISTRADA al instante (sin solicitud):
    // ya se le pueden dejar recordatorios. Crear minutas y dejar recordatorios a otros los activa el admin.
    const creaMinutas = 0;
    const llave = llaveDe(request);
    if (!llave) throw new ErrorApi(400, 'Falta la llave del dispositivo.');
    const hash = await sha256(llave);
    const existente = await env.DB.prepare('SELECT id, rol, estado, crea_minutas, recordatorios_otros FROM dispositivos WHERE llave_hash = ?')
      .bind(hash).first<Dispositivo>();
    if (existente) {
      if (existente.estado === 'deshabilitado') throw new ErrorApi(403, 'Este dispositivo fue deshabilitado por el administrador.');
      const estado = 'aprobado';
      await env.DB.prepare('UPDATE dispositivos SET nombre = ?, color = ?, estado = ?, actualizado = ? WHERE id = ?')
        .bind(nombre, color, estado, ahora(), existente.id).run();
      return json(datosAcceso({ ...existente, nombre, color, estado }));
    }
    const pendientes = await env.DB.prepare("SELECT COUNT(*) AS n FROM dispositivos WHERE estado = 'pendiente'").first<{ n: number }>();
    if ((pendientes?.n ?? 0) >= MAX_PENDIENTES) throw new ErrorApi(429, 'Hay demasiadas solicitudes pendientes. Intenta más tarde.');
    const deIp = await env.DB.prepare('SELECT COUNT(*) AS n FROM dispositivos WHERE ip = ? AND creado > ?')
      .bind(ip, haceHoras(24)).first<{ n: number }>();
    if ((deIp?.n ?? 0) >= MAX_SOLICITUDES_IP_DIA) throw new ErrorApi(429, 'Demasiadas solicitudes desde esta conexión. Intenta mañana.');
    const t = ahora();
    await env.DB.prepare(`INSERT INTO dispositivos (id, llave_hash, nombre, color, rol, estado, crea_minutas, ip, creado, actualizado)
                          VALUES (?, ?, ?, ?, 'creador', 'aprobado', ?, ?, ?, ?)`)
      .bind(crypto.randomUUID(), hash, nombre, color, creaMinutas, ip, t, t).run();
    return json(datosAcceso({ nombre, color, rol: 'creador', estado: 'aprobado', crea_minutas: creaMinutas }), 201);
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
    return json(datosAcceso({ nombre, color, rol: 'admin', estado: 'aprobado' }));
  }

  const yo = exigirAdmin(await dispositivoActual(request, env));

  if (seccion === 'dispositivos' && request.method === 'GET') {
    const { results } = await env.DB.prepare(`
      SELECT d.id, d.nombre, d.color, d.rol, d.estado, d.creado, d.actualizado, d.crea_minutas, d.recordatorios_otros,
             (SELECT COUNT(*) FROM minutas m WHERE m.creada_por = d.id AND m.borrada = 0) AS minutas
      FROM dispositivos d ORDER BY d.estado = 'pendiente' DESC, d.actualizado DESC`).all();
    return json(results.map((d: any) => ({ ...d, yo: d.id === yo.id })));
  }

  if (seccion === 'dispositivos' && request.method === 'PATCH' && partes[2]) {
    const body = await leerJson(request);
    if (partes[2] === yo.id) throw new ErrorApi(400, 'No puedes cambiar tu propio acceso.');
    // Estado (aprobar, rechazar, deshabilitar) y, desde 1.7.1, los permisos: crear minutas y dejar recordatorios a otros.
    const cambios: string[] = [];
    const valores: unknown[] = [];
    if (body.estado !== undefined) {
      if (!['aprobado', 'rechazado', 'deshabilitado'].includes(body.estado)) throw new ErrorApi(400, 'Estado no válido.');
      cambios.push('estado = ?'); valores.push(body.estado);
    }
    if (body.crea_minutas !== undefined) { cambios.push('crea_minutas = ?'); valores.push(body.crea_minutas ? 1 : 0); }
    if (body.recordatorios_otros !== undefined) { cambios.push('recordatorios_otros = ?'); valores.push(body.recordatorios_otros ? 1 : 0); }
    if (cambios.length === 0) throw new ErrorApi(400, 'Nada que cambiar.');
    const r = await env.DB.prepare(`UPDATE dispositivos SET ${cambios.join(', ')}, actualizado = ? WHERE id = ? AND rol != 'admin'`)
      .bind(...valores, ahora(), partes[2]).run();
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
const PAUSA_SATURADO_MS = 2 * 60_000; // tras "saturado" (500/503) aun con reintentos: gris por 2 min

const INSTRUCCION_OCR = `Esta imagen es una minuta: la lista de cantos para un culto, escrita a mano o enviada por WhatsApp.
Transcribe SOLO su contenido, una línea por renglón y en el mismo orden.
Copia los números de himno tal como aparecen. Si dos cantos están en el mismo renglón, déjalos en el mismo renglón.
Incluye las palabras Palabra, Predicación u Oración si aparecen, y la fecha o el día (miércoles, domingo) si aparecen.
Si hay una raya o línea horizontal dibujada entre cantos (un separador), escribe en su lugar un renglón con solo: ---
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
  const permitido = !!yo && yo.estado === 'aprobado' && (admin || (paraCreadores && !!yo.crea_minutas));
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

/** Error de Gemini con el motivo: 'cupo' (429), 'saturado' (500/503, pasa seguido en el plan gratis) u 'otro'. */
class ErrorGemini extends Error {
  constructor(public motivo: 'cupo' | 'saturado' | 'otro', detalle: string) { super(detalle); }
}

async function ocrGemini(env: Env, imagen: string, mime: string): Promise<string> {
  const modelos = env.GEMINI_MODELO ? [env.GEMINI_MODELO] : MODELOS_GEMINI;
  const detalles: string[] = [];
  let saturado = false;
  for (const modelo of modelos) {
    // "Saturado" (500/503) suele pasar en segundos: se reintenta el mismo modelo una vez antes de pasar al siguiente.
    for (let intento = 0; intento < 2; intento++) {
      let r: Response;
      try {
        r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY! },
          body: JSON.stringify({
            contents: [{ parts: [{ text: INSTRUCCION_OCR }, { inline_data: { mime_type: mime, data: imagen } }] }],
            generationConfig: { temperature: 0 },
          }),
        });
      } catch (e) {
        detalles.push(`${modelo}: red ${(e as Error).message}`);
        saturado = true;
        continue;
      }
      if (r.ok) {
        const datos: any = await r.json();
        const texto = (datos?.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('\n').trim();
        if (texto) return texto;
        detalles.push(`${modelo}: sin texto (${datos?.candidates?.[0]?.finishReason ?? '?'})`);
        break; // siguiente modelo
      }
      const cuerpo = (await r.text().catch(() => '')).slice(0, 160).replace(/\s+/g, ' ');
      detalles.push(`${modelo}: ${r.status} ${cuerpo}`);
      if (r.status === 429) {
        await guardarConfig(env, 'gemini_pausa_hasta', String(Date.now() + PAUSA_GEMINI_MS));
        throw new ErrorGemini('cupo', detalles.join(' | ')); // cupo agotado: otro modelo del mismo proyecto tampoco sirve
      }
      if (r.status === 401 || r.status === 403 || /API key not valid|API_KEY_INVALID/i.test(cuerpo)) {
        // Clave inválida o revocada: ningún modelo va a servir; gris por 10 min (no decir "disponible").
        await guardarConfig(env, 'gemini_pausa_hasta', String(Date.now() + PAUSA_GEMINI_MS));
        throw new ErrorGemini('otro', detalles.join(' | '));
      }
      if (r.status >= 500) { saturado = true; await new Promise(ok => setTimeout(ok, 900)); continue; } // reintentar
      break; // 400/404 (modelo no disponible) u otro: probar el siguiente modelo
    }
  }
  throw new ErrorGemini(saturado ? 'saturado' : 'otro', detalles.join(' | '));
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
    let motivo: ErrorGemini['motivo'] | null = null;
    if (estado.gemini) {
      try { texto = await ocrGemini(env, imagen, mime); fuente = 'gemini'; } catch (e) {
        errores.push(String((e as Error).message));
        motivo = e instanceof ErrorGemini ? e.motivo : 'otro';
      }
    }
    if (!texto && estado.pc) {
      try { texto = await ocrPc(env, imagen); fuente = 'pc'; } catch (e) { errores.push(String((e as Error).message)); }
    }
    if (!texto) {
      console.error('IA sin resultado', errores);
      // Queda registrado el último error (para revisarlo desde el PC con wrangler d1 execute … "SELECT * FROM config").
      await guardarConfig(env, 'ia_ultimo_error', `${ahora()} ${errores.join(' || ')}`.slice(0, 1500));
      // Saturado: el indicador pasa a gris un par de minutos (que no diga "disponible" si no lo está).
      if (motivo === 'saturado') await guardarConfig(env, 'gemini_pausa_hasta', String(Date.now() + PAUSA_SATURADO_MS));
      throw new ErrorApi(503, motivo === 'cupo'
        ? 'Se acabó por ahora el cupo gratis de la IA. Pega el texto o usa el modo manual; vuelve a estar disponible más tarde.'
        : motivo === 'saturado'
          ? 'La IA está saturada en este momento. Intenta de nuevo en un par de minutos, o pega el texto.'
          : 'La IA no pudo leer la foto. Intenta con otra foto, o pega el texto.');
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

// ---------- Recordatorios (1.7.0) ----------
// Personas con nombre aprobado (creadores, músicos y admin). Cada una recibe los que escribió y los que le dejaron.
// Solo el autor edita. Dejar a otros: admin y autorizados. Quien recibe uno lo puede borrar: deja de verlo y el autor
// ve "Eliminado por …" (1.7.1). Los visores no pasan por aquí: los suyos quedan en su celular.

const MAX_RECORDATORIOS_AUTOR = 500;

function validarTexto(texto: unknown): string {
  const t = typeof texto === 'string' ? texto.trim() : '';
  if (t.length < 1 || t.length > 300) throw new ErrorApi(400, 'El recordatorio debe tener entre 1 y 300 letras.');
  return t;
}

/** null = siempre en este canto; un id = solo en esa minuta. */
function validarMinutaId(minuta: unknown): string | null {
  if (minuta === undefined || minuta === null || minuta === '') return null;
  if (typeof minuta !== 'string' || minuta.length > 64) throw new ErrorApi(400, 'Minuta no válida.');
  return minuta;
}

function validarHimno(himno: unknown): number {
  const n = Number(himno);
  if (!Number.isInteger(n) || n < 1 || n > 9999) throw new ErrorApi(400, 'Himno no válido.');
  return n;
}

/** El destinatario debe ser una persona aprobada. Sin "para" = para uno mismo. Para otros: solo con permiso. */
async function validarPara(env: Env, para: unknown, yo: Dispositivo): Promise<string> {
  if (para === undefined || para === null || para === '' || para === yo.id) return yo.id;
  if (!puedeDejarAOtros(yo)) throw new ErrorApi(403, 'No tienes permiso para dejar recordatorios a otras personas.');
  if (typeof para !== 'string') throw new ErrorApi(400, 'Destinatario no válido.');
  const d = await env.DB.prepare("SELECT id FROM dispositivos WHERE id = ? AND estado = 'aprobado'").bind(para).first();
  if (!d) throw new ErrorApi(400, 'Esa persona ya no está en la app.');
  return para;
}

const SELECT_RECORDATORIOS = `
  SELECT r.id, r.himno, r.texto, r.minuta_id, r.estado, r.pos_x, r.pos_y, r.tam, r.creado, r.actualizado, r.autor_id, r.para_id,
         a.nombre AS autor_nombre, a.color AS autor_color, p.nombre AS para_nombre, p.color AS para_color
  FROM recordatorios r
  LEFT JOIN dispositivos a ON a.id = r.autor_id
  LEFT JOIN dispositivos p ON p.id = r.para_id`;

function filaARecordatorio(f: any, yo: Dispositivo) {
  return {
    id: f.id, himno: f.himno, texto: f.texto, estado: f.estado ?? 'enviado', minuta: f.minuta_id ?? null,
    pos: f.pos_x != null && f.pos_y != null ? { x: f.pos_x, y: f.pos_y } : null,
    tam: f.tam ?? null, creado: f.creado, actualizado: f.actualizado,
    mio: f.autor_id === yo.id, // lo escribí yo: puedo editarlo y borrarlo
    autor: f.autor_id === yo.id ? null : { nombre: f.autor_nombre ?? '—', color: f.autor_color ?? '#999' },
    para: f.para_id === yo.id ? null : { id: f.para_id, nombre: f.para_nombre ?? '—', color: f.para_color ?? '#999' },
  };
}

async function rutasRecordatorios(request: Request, env: Env, partes: string[]): Promise<Response> {
  const yo = exigirConNombre(await dispositivoActual(request, env));
  const id = partes[1];

  if (!id && request.method === 'GET') {
    // Los que me dejaron y borré ya no los veo (quien los dejó sí, como "Eliminado por …").
    const { results } = await env.DB.prepare(`${SELECT_RECORDATORIOS}
      WHERE r.autor_id = ? OR (r.para_id = ? AND r.estado != 'eliminado') ORDER BY r.creado`)
      .bind(yo.id, yo.id).all();
    return json(results.map(f => filaARecordatorio(f, yo)));
  }

  if (!id && request.method === 'POST') {
    const body = await leerJson(request);
    const himno = validarHimno(body.himno);
    const texto = validarTexto(body.texto);
    const para = await validarPara(env, body.para, yo);
    const minuta = validarMinutaId(body.minuta);
    const cuantos = await env.DB.prepare('SELECT COUNT(*) AS n FROM recordatorios WHERE autor_id = ?').bind(yo.id).first<{ n: number }>();
    if ((cuantos?.n ?? 0) >= MAX_RECORDATORIOS_AUTOR) throw new ErrorApi(429, 'Tienes demasiados recordatorios. Borra algunos.');
    const nuevo = crypto.randomUUID(), t = ahora();
    await env.DB.prepare('INSERT INTO recordatorios (id, himno, autor_id, para_id, texto, minuta_id, creado, actualizado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(nuevo, himno, yo.id, para, texto, minuta, t, t).run();
    const f = await env.DB.prepare(`${SELECT_RECORDATORIOS} WHERE r.id = ?`).bind(nuevo).first();
    return json(filaARecordatorio(f, yo), 201);
  }

  // Mover un post-it sobre la letra (1.9.0): solo quien lo escribió guarda la posición en el servidor.
  if (id && request.method === 'PATCH' && partes[2] === 'posicion') {
    const actual = await env.DB.prepare('SELECT autor_id FROM recordatorios WHERE id = ?').bind(id).first<{ autor_id: string }>();
    if (!actual) throw new ErrorApi(404, 'Ese recordatorio ya no existe.');
    if (actual.autor_id !== yo.id) throw new ErrorApi(403, 'Solo quien escribió el recordatorio guarda su posición.');
    const body = await leerJson(request);
    const valido = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= -5 && v <= 5; // fuera de la letra también (arriba del título, a los lados)
    // Posición y/o tamaño (1.9.1): lo que no venga, no cambia.
    if (body.pos !== undefined) {
      const pos = body.pos == null ? null : valido(body.pos.x) && valido(body.pos.y) ? body.pos : undefined;
      if (pos === undefined) throw new ErrorApi(400, 'Posición no válida.');
      await env.DB.prepare('UPDATE recordatorios SET pos_x = ?, pos_y = ? WHERE id = ?').bind(pos?.x ?? null, pos?.y ?? null, id).run();
    }
    if (body.tam !== undefined) {
      const tam = body.tam == null ? null : typeof body.tam === 'number' && body.tam >= 0.6 && body.tam <= 2 ? body.tam : undefined;
      if (tam === undefined) throw new ErrorApi(400, 'Tamaño no válido.');
      await env.DB.prepare('UPDATE recordatorios SET tam = ? WHERE id = ?').bind(tam, id).run();
    }
    return json({ ok: true });
  }

  if (id && (request.method === 'PATCH' || request.method === 'DELETE' || (request.method === 'POST' && partes[2] === 'visto'))) {
    const actual = await env.DB.prepare('SELECT autor_id, para_id FROM recordatorios WHERE id = ?').bind(id).first<{ autor_id: string; para_id: string }>();
    if (!actual) throw new ErrorApi(404, 'Ese recordatorio ya no existe.');
    // Visto: lo marca el celular de quien lo recibe cuando le aparece.
    if (request.method === 'POST') {
      if (actual.para_id !== yo.id) throw new ErrorApi(403, 'Este recordatorio no es para ti.');
      await env.DB.prepare("UPDATE recordatorios SET estado = 'visto' WHERE id = ? AND estado = 'enviado'").bind(id).run();
      return json({ ok: true });
    }
    // Borrar: quien lo escribió lo elimina del todo. Quien lo recibió deja de verlo y quien lo dejó ve
    // "Eliminado por …" (Josué, 1.7.1).
    if (request.method === 'DELETE') {
      if (actual.autor_id === yo.id) {
        await env.DB.prepare('DELETE FROM recordatorios WHERE id = ?').bind(id).run();
        return json({ ok: true });
      }
      if (actual.para_id !== yo.id) throw new ErrorApi(403, 'Este recordatorio no es tuyo.');
      await env.DB.prepare("UPDATE recordatorios SET estado = 'eliminado' WHERE id = ?").bind(id).run();
      return json({ ok: true });
    }
    // Editar: solo quien lo escribió.
    if (actual.autor_id !== yo.id) throw new ErrorApi(403, 'Solo quien escribió el recordatorio puede cambiarlo.');
    const body = await leerJson(request);
    const texto = validarTexto(body.texto);
    const para = await validarPara(env, body.para, yo);
    const minuta = validarMinutaId(body.minuta);
    // Cambiado: vuelve a "enviado" (la otra persona lo verá de nuevo, aunque lo hubiera borrado).
    await env.DB.prepare(`UPDATE recordatorios SET texto = ?, para_id = ?, minuta_id = ?, actualizado = ?, estado = 'enviado'
                          WHERE id = ?`)
      .bind(texto, para, minuta, ahora(), id).run();
    const f = await env.DB.prepare(`${SELECT_RECORDATORIOS} WHERE r.id = ?`).bind(id).first();
    return json(filaARecordatorio(f, yo));
  }

  throw new ErrorApi(404, 'Ruta no encontrada.');
}

/** Personas a quienes se les puede dejar un recordatorio: todas las aprobadas (músicos incluidos), menos uno mismo. */
async function rutasPersonas(request: Request, env: Env): Promise<Response> {
  const yo = exigirConNombre(await dispositivoActual(request, env));
  if (!puedeDejarAOtros(yo)) throw new ErrorApi(403, 'No tienes permiso para dejar recordatorios a otras personas.');
  if (request.method !== 'GET') throw new ErrorApi(404, 'Ruta no encontrada.');
  const { results } = await env.DB.prepare("SELECT id, nombre, color FROM dispositivos WHERE estado = 'aprobado' AND id != ? ORDER BY nombre")
    .bind(yo.id).all();
  return json(results);
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
      case 'recordatorios': return await rutasRecordatorios(request, env, partes);
      case 'personas': return await rutasPersonas(request, env);
      case 'salud': return json({ ok: true });
      default: throw new ErrorApi(404, 'Ruta no encontrada.');
    }
  } catch (e) {
    if (e instanceof ErrorApi) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Error del servidor.' }, 500);
  }
};
