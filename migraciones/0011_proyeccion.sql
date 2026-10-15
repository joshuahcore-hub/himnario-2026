-- 1.12.0 (Josué): permiso "Generar proyección" (PowerPoint del culto desde una minuta, en el computador).
-- Apagado para todos; el administrador lo tiene siempre.
ALTER TABLE dispositivos ADD COLUMN proyeccion INTEGER NOT NULL DEFAULT 0;
