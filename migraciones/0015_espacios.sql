-- (1.16.0, Josué) ESPACIOS de minutas: Batuco y Talca (el admin puede agregar más). Cada minuta es de un espacio; las
-- que ya existían quedan en Batuco. Quien ve minutas ve las de todos los espacios (arriba en Minutas se cambia).
CREATE TABLE IF NOT EXISTS espacios (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  creado TEXT NOT NULL
);
INSERT OR IGNORE INTO espacios (id, nombre, orden, creado) VALUES ('batuco', 'Batuco', 1, '2026-10-15T00:00:00Z');
INSERT OR IGNORE INTO espacios (id, nombre, orden, creado) VALUES ('talca', 'Talca', 2, '2026-10-15T00:00:00Z');
ALTER TABLE minutas ADD COLUMN espacio TEXT NOT NULL DEFAULT 'batuco';
