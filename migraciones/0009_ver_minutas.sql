-- 1.10.0 (Josué): permiso "Ver minutas" por persona registrada. Por defecto SÍ (al registrarse y quienes ya
-- estaban registrados); el admin lo puede apagar. Sin él, la persona solo ve las minutas que ella misma creó.
ALTER TABLE dispositivos ADD COLUMN ve_minutas INTEGER NOT NULL DEFAULT 1;
