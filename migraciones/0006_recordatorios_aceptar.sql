-- 1.7.1 (Josué):
-- * Recordatorios dejados a otra persona: estado para quien lo dejó: 'enviado' → 'visto' (cuando le aparece a quien
--   lo recibe) → 'eliminado' (quien lo recibió lo borró: deja de verlo, y quien lo dejó ve "Eliminado por …").
-- * Músicos: personas con nombre que NO crean minutas (crea_minutas = 0); pueden recibir recordatorios.
-- * Dejar recordatorios a otros: solo el admin y quienes él autorice (recordatorios_otros = 1).
ALTER TABLE recordatorios ADD COLUMN estado TEXT NOT NULL DEFAULT 'enviado';
ALTER TABLE dispositivos ADD COLUMN crea_minutas INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dispositivos ADD COLUMN recordatorios_otros INTEGER NOT NULL DEFAULT 0;
