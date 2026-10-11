-- IA para leer fotos de minutas.
-- config: ajustes que cambia el administrador (p. ej. ia_creadores = '1' permite la IA a los creadores)
--         y estado interno (gemini_pausa_hasta, pc_url, pc_visto).
CREATE TABLE config (
  clave       TEXT PRIMARY KEY,
  valor       TEXT NOT NULL,
  actualizado TEXT NOT NULL
);

-- Cada lectura de foto (para el límite diario por persona).
CREATE TABLE ia_uso (
  dispositivo_id TEXT NOT NULL,
  fecha          TEXT NOT NULL,
  fuente         TEXT NOT NULL
);
CREATE INDEX ia_uso_dispositivo ON ia_uso (dispositivo_id, fecha);
