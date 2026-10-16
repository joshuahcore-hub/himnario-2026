"""
Divide la letra de un himno (letras.py) en renglones cortos y diapositivas, al estilo de los PowerPoint del culto:
primera diapositiva "N.-  Título", un renglón vacío y hasta 4 renglones; las demás hasta 6. Renglones de ~30 letras
(caben a 48 pt); si alguno queda más largo, toda la canción baja un poco de tamaño (parejo en la canción).

Uso:  python -I scripts/proyeccion/diapositivas.py <letras.json> <salida.json> [estructura.json]
"""
import json
import re
import sys

MAX = 32          # letras por renglón (Calibri negrita: caben ~31 a 48 pt en una diapositiva 4:3)
CAPACIDAD = 6     # renglones por diapositiva (la primera: título + vacío + 4)


def renglones(linea: str) -> list[str]:
    """Un verso del himnario en 1–2 renglones: se corta en la coma más cercana a la mitad; si no hay, en un espacio."""
    linea = linea.strip()
    if len(linea) <= MAX:
        return [linea]
    mitad = len(linea) // 2
    comas = [m.end() for m in re.finditer(r"[,;:]\s", linea)]
    buenas = [c for c in comas if abs(c - mitad) <= len(linea) * 0.3]
    if buenas:
        c = min(buenas, key=lambda x: abs(x - mitad))
    else:
        espacios = [m.start() for m in re.finditer(" ", linea)]
        c = min(espacios, key=lambda x: abs(x - mitad)) if espacios else len(linea)
    a, b = linea[:c].strip(), linea[c:].strip()
    # Si una mitad sigue larga, se parte otra vez (versos muy largos: 3 renglones, la letra queda grande y pareja).
    return (renglones(a) if len(a) > MAX + 2 else [a]) + ((renglones(b) if len(b) > MAX + 2 else [b]) if b else [])


def main():
    letras = json.load(open(sys.argv[1], encoding="utf-8"))
    # Opcional: qué versos van en cada diapositiva (estrofa / coro), p. ej. ../proyeccion/estructura-faltantes.json.
    estructura = json.load(open(sys.argv[3], encoding="utf-8")) if len(sys.argv) > 3 else {}
    resultado = []
    for num, h in sorted(letras.items(), key=lambda kv: int(kv[0])):
        versos = [renglones(l) for l in h["lineas"] if l]
        if num in estructura:
            diapos = [[r for i in grupo for r in versos[i - 1]] for grupo in estructura[num]]
        else:
            # Sin estructura: cada verso ENTERO en una diapositiva; hasta 4 renglones en la 1.ª y 6 en las demás.
            diapos = [[]]
            for v in versos:
                capacidad = 4 if len(diapos) == 1 else CAPACIDAD
                if len(diapos[-1]) + len(v) > capacidad:
                    diapos.append([])
                diapos[-1].extend(v)
        diapos = [[(d[0][0].upper() + d[0][1:])] + d[1:] for d in diapos if d]
        largo = max(len(l) for d in diapos for l in d)
        # Tamaño PAREJO en toda la canción: el mayor en que cabe su renglón más largo y su diapositiva con más
        # renglones (la 1.ª suma el título y un renglón vacío). 48 como las demás; mín. 32.
        titulo = f"{int(num)}.-  {h['titulo']}"
        lineas_titulo = 2 if len(titulo) > MAX else 1  # un título largo ocupa dos renglones
        alto = max(len(d) + (lineas_titulo + 1 if i == 0 else 0) for i, d in enumerate(diapos))
        tam = max(32, min(48, int(48 * 31 / largo), int(495 / (1.2 * alto))) // 2 * 2)
        resultado.append({"numero": int(num), "titulo": h["titulo"], "encabezado": titulo, "tam": tam, "diapositivas": diapos})
    json.dump(resultado, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    for r in resultado:
        print(r["encabezado"], "· tam", r["tam"], "·", len(r["diapositivas"]), "diapositivas")


if __name__ == "__main__":
    main()
