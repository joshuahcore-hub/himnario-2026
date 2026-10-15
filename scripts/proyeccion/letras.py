"""
Letra (sin acordes ni notas) de algunos himnos, sacada del PDF del himnario, para armar sus PowerPoint.

Uso:  python -I scripts/proyeccion/letras.py <himnario.pdf> <salida.json> 1 5 6 ...
Deja {numero: {"titulo": ..., "lineas": [...]}}; las líneas vacías separan estrofas.
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "himnario-pdf"))
import pymupdf  # noqa: E402
from extraer import ENCABEZADO, es_nota_verde, es_rojo, limpiar_titulo, lineas_de, titulo_de  # noqa: E402


def main():
    pdf, salida, numeros = sys.argv[1], sys.argv[2], {int(x) for x in sys.argv[3:]}
    doc = pymupdf.open(pdf)
    himnos, actual = {}, None
    for pagina in doc:
        for l in lineas_de(pagina):
            if ENCABEZADO.search(l["texto"]) or re.fullmatch(r"\s*\d{1,3}\s*", l["texto"]) or es_nota_verde(l):
                continue
            m = titulo_de(l)
            if m:
                n = int(m.group(1))
                titulo, _, _ = limpiar_titulo(m.group(2))
                actual = himnos.setdefault(n, {"titulo": titulo, "lineas": [], "y": None}) if n in numeros else None
                continue
            if actual is None:
                continue
            negros = "".join(s["text"] for s in l["spans"] if not es_rojo(s["color"]))
            texto = re.sub(r"\s+", " ", negros).strip()
            if not texto or re.fullmatch(r"(\(.*\)\s*)+", texto):
                continue  # línea de acordes o solo autor/notas entre paréntesis
            # Estrofa nueva: un salto vertical grande desde la línea anterior de letra.
            if actual["y"] is not None and l["caja"].y0 - actual["y"] > 30 and actual["lineas"] and actual["lineas"][-1] != "":
                actual["lineas"].append("")
            actual["lineas"].append(texto)
            actual["y"] = l["caja"].y1
    for h in himnos.values():
        h.pop("y", None)
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(himnos, f, ensure_ascii=False, indent=2)
    print("himnos:", sorted(himnos))


if __name__ == "__main__":
    main()
