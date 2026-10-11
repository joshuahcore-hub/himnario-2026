-- Minutas privadas o publicadas: "publicada" = 1 la ven todos; 0 solo quien la creó.
-- Las minutas que ya existían quedan publicadas (como se veían hasta ahora).
-- Las nuevas se crean privadas (la API envía publicada = 0 salvo que se publique al guardar).
ALTER TABLE minutas ADD COLUMN publicada INTEGER NOT NULL DEFAULT 1;
