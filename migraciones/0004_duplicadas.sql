-- Minutas duplicadas: la copia es de quien la duplicó (puede editarla y dejarla privada).
-- duplicada_de guarda de qué minuta salió; el administrador ve "Duplicada por …" en vez de "Creada por …".
ALTER TABLE minutas ADD COLUMN duplicada_de TEXT;
