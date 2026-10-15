-- (1.15.1, Josué) Quien RECIBE un post-it lo puede editar para sí ("como rayar mi propio cuaderno"): su texto va
-- aparte. Si quien lo escribió lo cambia después, se borra (vuelve a verse el del autor).
ALTER TABLE recordatorios ADD COLUMN texto_para TEXT;
