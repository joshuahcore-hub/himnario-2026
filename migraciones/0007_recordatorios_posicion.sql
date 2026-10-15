-- 1.9.0 (Josué): los post-it se pueden mover y quedar sobre cualquier parte de la letra. Posición = esquina superior
-- izquierda como fracción (0..1) del recuadro de la letra; NULL = en su lugar de siempre (arriba de la letra).
-- La guarda quien lo escribió; quien lo recibe lo mueve solo en su celular.
ALTER TABLE recordatorios ADD COLUMN pos_x REAL;
ALTER TABLE recordatorios ADD COLUMN pos_y REAL;
