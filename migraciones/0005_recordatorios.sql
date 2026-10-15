-- Recordatorios (1.7.0, Josué): notas amarillas sobre un himno. Las escribe un creador o el admin para sí mismo
-- (para_id = autor_id) o para otra persona con nombre en la app. Solo quien la escribió la edita o la borra;
-- quien la recibe solo la ve. Los visores guardan las suyas solo en su celular (no pasan por aquí).
-- minuta_id NULL = "siempre en este canto" (himnario y toda minuta); con valor = "solo en esa minuta" (y sus copias).
CREATE TABLE IF NOT EXISTS recordatorios (
  id TEXT PRIMARY KEY,
  himno INTEGER NOT NULL,
  autor_id TEXT NOT NULL,
  para_id TEXT NOT NULL,
  texto TEXT NOT NULL,
  minuta_id TEXT,
  creado TEXT NOT NULL,
  actualizado TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_recordatorios_autor ON recordatorios (autor_id);
CREATE INDEX IF NOT EXISTS idx_recordatorios_para ON recordatorios (para_id);
