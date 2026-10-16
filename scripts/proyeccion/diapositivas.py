"""
Divide la letra de un himno (letras.py) en renglones cortos y diapositivas, al estilo de los PowerPoint del culto:
primera diapositiva "N.-  Título", un renglón vacío y hasta 4 renglones; las demás hasta 6. Renglones de ~30 letras
(caben a 48 pt); si alguno queda más largo, toda la canción baja un poco de tamaño (parejo en la canción).

Uso:  python -I scripts/proyeccion/diapositivas.py <letras.json> <salida.json>
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
    resultado = []
    for num, h in sorted(letras.items(), key=lambda kv: int(kv[0])):
        # Cada verso (renglón del himnario) queda ENTERO en una diapositiva; una estrofa nueva (línea vacía) empieza
        # diapositiva si la actual ya tiene algo.
        versos = [renglones(l) if l else [] for l in h["lineas"]]
        diapos: list[list[str]] = [[]]
        for v in versos:
            actual = diapos[-1]
            capacidad = 4 if len(diapos) == 1 else CAPACIDAD
            if not v:
                if len(actual) >= 3:
                    diapos.append([])
                continue
            if len(actual) + len(v) > capacidad:
                diapos.append([])
            diapos[-1].extend(v)
        diapos = [[(d[0][0].upper() + d[0][1:])] + d[1:] for d in diapos if d]
        largo = max(len(l) for d in diapos for l in d)
        # Tamaño PAREJO en toda la canción: el mayor en que cabe su renglón más largo (48 como las demás; mín. 36).
        tam = max(36, min(48, int(48 * 31 / largo) // 2 * 2))
        titulo = f"{int(num)}.-  {h['titulo']}"
        resultado.append({"numero": int(num), "titulo": h["titulo"], "encabezado": titulo, "tam": tam, "diapositivas": diapos})
    json.dump(resultado, open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    for r in resultado:
        print(r["encabezado"], "· tam", r["tam"], "·", len(r["diapositivas"]), "diapositivas")


if __name__ == "__main__":
    main()
