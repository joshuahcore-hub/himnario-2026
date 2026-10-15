-- 1.11.0 (Josué): notificaciones del celular (Web Push), aunque la app esté cerrada.
-- * notif_activas: interruptor general de la persona (por defecto encendido).
-- * notif_apagadas: JSON con los TIPOS que apagó (null = todos encendidos; así un tipo nuevo llega encendido).
-- * suscripciones: cada celular que acepta notificaciones (la "dirección" que da el navegador). Puede haber varias
--   por persona. idioma: es/en/pt, para escribir la notificación en el idioma de su app.
-- * notificaciones: cada aviso para cada persona. entregada = el celular ya lo mostró; vista = la persona lo vio
--   (lo tocó, "Marcar como vista" o entró a Administración / Minutas). Lo no visto queda como pendiente en la app.
ALTER TABLE dispositivos ADD COLUMN notif_activas INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dispositivos ADD COLUMN notif_apagadas TEXT;

CREATE TABLE suscripciones (
  endpoint TEXT PRIMARY KEY,
  dispositivo_id TEXT NOT NULL,
  idioma TEXT NOT NULL DEFAULT 'es',
  creada TEXT NOT NULL
);
CREATE INDEX idx_suscripciones_dispositivo ON suscripciones (dispositivo_id);

CREATE TABLE notificaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dispositivo_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  datos TEXT NOT NULL,
  url TEXT NOT NULL,
  creada TEXT NOT NULL,
  entregada INTEGER NOT NULL DEFAULT 0,
  vista INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_notificaciones_dispositivo ON notificaciones (dispositivo_id, vista);

-- (Josué) Administración: quitar a una persona de la lista (registros repetidos). No borra nada.
ALTER TABLE dispositivos ADD COLUMN oculta INTEGER NOT NULL DEFAULT 0;
