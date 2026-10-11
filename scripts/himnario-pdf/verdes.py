# Revisa las notas VERDES del PDF: texto, distancia a la línea anterior y al título siguiente.
# Sirve para comprobar a qué himno queda cada una (ver la regla en extraer.py, SEPARACION_NOTA_TITULO).
# Uso:  python -I scripts/himnario-pdf/verdes.py <himnario.pdf> scripts/himnario-pdf <salida.txt>
import re
import sys

import pymupdf

sys.path.insert(0, sys.argv[2])
import extraer  # noqa: E402  (scripts/himnario-pdf/extraer.py)

doc = pymupdf.open(sys.argv[1])
salida = []
for indice, pagina in enumerate(doc):
    lineas = [l for l in extraer.lineas_de(pagina)
              if not (extraer.ENCABEZADO.search(l["texto"]) or re.fullmatch(r"\s*\d{1,3}\s*", l["texto"]))]
    for i, l in enumerate(lineas):
        if not extraer.es_nota_verde(l):
            continue
        anterior = next((x for x in reversed(lineas[:i]) if not extraer.es_nota_verde(x)), None)
        siguiente = next((x for x in lineas[i + 1:] if not extraer.es_nota_verde(x)), None)
        tit = extraer.titulo_de(siguiente) if siguiente else None
        salida.append(
            f"pág {indice + 1}: '{l['texto'].strip()}' | antes: '{anterior['texto'].strip()[:30] if anterior else '-'}' "
            f"(dist {l['caja'].y0 - anterior['caja'].y1 if anterior else 0:.0f}) | después: "
            f"'{siguiente['texto'].strip()[:30] if siguiente else '-'}' (dist {siguiente['caja'].y0 - l['caja'].y1 if siguiente else 0:.0f})"
            f"{' [TITULO]' if tit else ''}")
with open(sys.argv[3], "w", encoding="utf-8") as f:
    f.write("\n".join(salida))
print(len(salida))
