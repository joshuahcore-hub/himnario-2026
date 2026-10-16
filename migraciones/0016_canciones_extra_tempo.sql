-- 1.18.2 (Josué): las alabanzas fuera del himnario llevan tempo ('lenta' o 'rapida'), igual que se clasifican las del
-- himnario. Las de antes quedan sin tempo (NULL) hasta que alguien las edite.
ALTER TABLE canciones_extra ADD COLUMN tempo TEXT;
