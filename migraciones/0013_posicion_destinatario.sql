-- 1.13.2 (Josué): dónde dejó (y de qué tamaño) un post-it la persona que lo RECIBIÓ. Antes se guardaba solo en su
-- celular; ahora también aquí, para que quien lo envió lo vea en esa misma posición en la vista "Enviados".
ALTER TABLE recordatorios ADD COLUMN pos_x_para REAL;
ALTER TABLE recordatorios ADD COLUMN pos_y_para REAL;
ALTER TABLE recordatorios ADD COLUMN tam_para REAL;
