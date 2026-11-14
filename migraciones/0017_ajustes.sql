-- (1.30.0, Josué 14-11-2026) AJUSTES GLOBALES que pone el administrador y valen para todos los equipos.
-- Primero: el modo Compañerismo (antes era un interruptor de cada celular).
CREATE TABLE IF NOT EXISTS ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  cambiado TEXT NOT NULL
);
INSERT OR IGNORE INTO ajustes (clave, valor, cambiado) VALUES ('compa', '0', '2026-11-14T00:00:00Z');
