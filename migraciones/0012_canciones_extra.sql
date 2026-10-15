-- 1.13.0 (Josué): canciones que NO están en el himnario, guardadas para volver a usarlas (aparecen en Himnario →
-- "Canciones que no están en el himnario" y en los buscadores). clave = título normalizado (sin tildes, minúsculas).
-- imagen = id de la imagen subida (Cloudflare KV, clave "img-<id>"), opcional: es un sustituto provisorio de la letra.
CREATE TABLE canciones_extra (
  id TEXT PRIMARY KEY,
  clave TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  tonalidad TEXT,
  imagen TEXT,
  creada_por TEXT,
  creado TEXT NOT NULL,
  actualizado TEXT NOT NULL
);
