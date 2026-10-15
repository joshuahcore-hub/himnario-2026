-- 1.9.1 (Josué): tamaño de cada post-it (se estira desde su esquina). 1 = normal; entre 0.75 y 1.6. NULL = normal.
ALTER TABLE recordatorios ADD COLUMN tam REAL;
