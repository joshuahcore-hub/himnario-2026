-- Dispositivos: cada celular que pide acceso (creador) o que se activó como administrador.
-- La llave secreta vive solo en el celular; aquí se guarda su huella SHA-256.
CREATE TABLE dispositivos (
  id          TEXT PRIMARY KEY,
  llave_hash  TEXT NOT NULL UNIQUE,
  nombre      TEXT NOT NULL,
  color       TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'creador' CHECK (rol IN ('creador', 'admin')),
  estado      TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'deshabilitado')),
  ip          TEXT,
  creado      TEXT NOT NULL,
  actualizado TEXT NOT NULL
);

-- Minutas: públicas para todos. "cantos" es un JSON con la lista (formato ParsedSong de la app).
CREATE TABLE minutas (
  id             TEXT PRIMARY KEY,
  titulo         TEXT NOT NULL,
  fecha          TEXT NOT NULL,
  cantos         TEXT NOT NULL,
  texto_original TEXT,
  fijada         INTEGER NOT NULL DEFAULT 0,
  borrada        INTEGER NOT NULL DEFAULT 0,
  creada_por     TEXT REFERENCES dispositivos(id),
  editada_por    TEXT REFERENCES dispositivos(id),
  creada         TEXT NOT NULL,
  actualizada    TEXT NOT NULL
);
CREATE INDEX minutas_fecha ON minutas (borrada, fecha);

-- Historial: quién creó, editó, borró o restauró cada minuta.
CREATE TABLE historial (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  minuta_id      TEXT NOT NULL,
  dispositivo_id TEXT,
  accion         TEXT NOT NULL,
  titulo         TEXT,
  fecha          TEXT NOT NULL
);
CREATE INDEX historial_fecha ON historial (fecha);

-- Intentos fallidos de clave de administrador (para frenar a quien intente adivinarla).
CREATE TABLE intentos (
  ip    TEXT NOT NULL,
  fecha TEXT NOT NULL
);
CREATE INDEX intentos_ip ON intentos (ip, fecha);
