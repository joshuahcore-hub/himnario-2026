"""
Extrae del PDF del himnario cada himno como imagen (formato de la app) y sus datos.

Uso:  python -I scripts/himnario-pdf/extraer.py <himnario.pdf> <carpeta-salida> [--escala 2]
Deja en <carpeta-salida>:
  claro/N.png   un himno por imagen: lienzo A4 blanco (1400x1980), recortado del PDF (vectorial, nítido),
                ajustado al ancho y centrado verticalmente (mismo formato que las imágenes anteriores)
  oscuro/N.png  la misma imagen para modo oscuro: fondo #0E0D0C, lo negro pasa a blanco, rojo/azul se mantienen
  himnos.json   número, título, primera línea, tono (primer acorde), página impresa, autor y notas
"""
import json
import os
import re
import sys

import pymupdf

# (1.17.1) "--escala 2" = versión nítida para el zoom (2800x1980*2): mismas proporciones, el doble de píxeles.
ESCALA = float(sys.argv[sys.argv.index("--escala") + 1]) if "--escala" in sys.argv else 1.0
ANCHO, ALTO = int(1400 * ESCALA), int(1980 * ESCALA)   # lienzo A4 vertical
MARGEN = int(56 * ESCALA)                              # margen mínimo alrededor del himno, en px del lienzo
FONDO_OSCURO = (14, 13, 12)       # #0E0D0C (las imágenes oscuras anteriores usaban este fondo)
TITULO = re.compile(r"^\s*(\d{1,3})\s*\.\s*-\s*(.+?)\s*$")
# Algunos títulos vienen sin ".-" (p. ej. "29 Cuan hermosa..."): se aceptan solo si la línea está en negrita.
TITULO_SIN_GUION = re.compile(r"^\s*(\d{1,3})\s+([^\d\s].+?)\s*$")


def es_negrita(linea) -> bool:
    return any(s["flags"] & 16 or "bold" in s["font"].lower() for s in linea["spans"])


def titulo_de(linea):
    return TITULO.match(linea["texto"]) or (es_negrita(linea) and TITULO_SIN_GUION.match(linea["texto"]))
ENCABEZADO = re.compile(r"himnario para m", re.I)
# Una nota verde a esta distancia (pt) o menos sobre un título es indicación de ese himno; más lejos, del anterior.
SEPARACION_NOTA_TITULO = 12


def es_rojo(color: int) -> bool:
    r, g, b = (color >> 16) & 255, (color >> 8) & 255, color & 255
    return r > 150 and g < 90 and b < 90


def es_verde(color: int) -> bool:
    r, g, b = (color >> 16) & 255, (color >> 8) & 255, color & 255
    return g > 100 and r < 110 and b < 130 and g > r + 30


def es_nota_verde(linea) -> bool:
    """Indicación para guitarra en verde: va ENCIMA del título del himno al que pertenece."""
    return all(es_verde(s["color"]) for s in linea["spans"])


def lineas_de(pagina):
    """Líneas de texto con su caja y sus fragmentos (texto, color)."""
    salida = []
    for bloque in pagina.get_text("dict")["blocks"]:
        for linea in bloque.get("lines", []):
            spans = [s for s in linea["spans"] if s["text"].strip()]
            if not spans:
                continue
            texto = "".join(s["text"] for s in linea["spans"])
            salida.append({"texto": texto, "caja": pymupdf.Rect(linea["bbox"]), "spans": spans})
    salida.sort(key=lambda l: (round(l["caja"].y0, 1), l["caja"].x0))
    return salida


def numero_impreso(lineas):
    for l in lineas[:4]:
        if re.fullmatch(r"\s*\d{1,3}\s*", l["texto"]):
            return int(l["texto"])
    return None


def limpiar_titulo(resto: str):
    """'Las Aguas del río Jordán (solo bautismos)' -> título, autor, notas."""
    partes = re.findall(r"\(([^)]*)\)", resto)
    titulo = re.sub(r"\s*\([^)]*\)", "", resto).strip()
    autor, notas = None, []
    for p in partes:
        if re.search(r"solo|bautismo|santa cena|cena|boda|funeral", p, re.I):
            notas.append(p.strip())
        elif autor is None:
            autor = p.strip()
        else:
            notas.append(p.strip())
    return titulo, autor, notas


def main():
    pdf, salida = sys.argv[1], sys.argv[2]
    for sub in ("claro", "oscuro"):
        os.makedirs(os.path.join(salida, sub), exist_ok=True)
    doc = pymupdf.open(pdf)

    # 1) Recorrer el PDF y asignar cada línea al himno que la contiene.
    himnos, actual = {}, None
    for indice, pagina in enumerate(doc):
        lineas = lineas_de(pagina)
        impreso = numero_impreso(lineas)
        notas_pendientes = []  # notas verdes leídas que aún no se sabe a qué himno van
        for l in lineas:
            if ENCABEZADO.search(l["texto"]) or re.fullmatch(r"\s*\d{1,3}\s*", l["texto"]):
                continue  # encabezado "Himnario para músicos" y número de página
            if es_nota_verde(l):
                notas_pendientes.append(l)
                continue
            m = titulo_de(l)
            if m:
                n = int(m.group(1))
                titulo, autor, notas = limpiar_titulo(m.group(2))
                anterior = actual
                actual = himnos.setdefault(n, {"numero": n, "titulo": titulo, "autor": autor, "notas": notas,
                                               "pagina": impreso, "trozos": {}, "lineas": []})
                # Notas verdes antes de un título:
                #  - PEGADAS al título (indicación para guitarra, p. ej. "C III" sobre el 12) → son de ESTE himno.
                #  - Lejos del título o con "FIN" (final del himno anterior, p. ej. "FIN / G7 / C" bajo el 114,
                #    a 42 pt del 115) → son del himno ANTERIOR.
                es_final = any(re.search(r"\bfin\b", nota["texto"], re.I) for nota in notas_pendientes)
                for nota in notas_pendientes:
                    pegada = l["caja"].y0 - nota["caja"].y1 <= SEPARACION_NOTA_TITULO
                    destino = actual if (pegada and not es_final) or anterior is None else anterior
                    destino["trozos"].setdefault(indice, []).append(nota["caja"])
            elif actual is not None:
                # Una nota verde en medio de un himno (no antes de un título) es del himno actual.
                for nota in notas_pendientes:
                    actual["trozos"].setdefault(indice, []).append(nota["caja"])
            notas_pendientes = []
            if actual is None:
                continue  # índice y portada
            actual["trozos"].setdefault(indice, []).append(l["caja"])
            actual["lineas"].append(l)

    # 2) Datos de cada himno: primera línea de la letra (texto no rojo) y tono (primer acorde rojo).
    datos = []
    for n in sorted(himnos):
        h = himnos[n]
        primera, tono = None, None
        for l in h["lineas"][1:]:
            negros = "".join(s["text"] for s in l["spans"] if not es_rojo(s["color"])).strip()
            rojos = [s["text"].strip() for s in l["spans"] if es_rojo(s["color"])]
            if re.fullmatch(r"(\s*\([^)]*\))+\s*", negros) and not rojos:
                continue  # línea solo con el autor o notas entre paréntesis
            if tono is None and rojos:
                # Primer acorde real (los números sueltos como "11" o "9" son indicaciones de acorde).
                fichas = [f for r in rojos for f in re.split(r"[\s/]+", r) if re.match(r"^\(?[A-G]", f)]
                tono = fichas[0] if fichas else None
            if primera is None and negros and not rojos:
                primera = re.sub(r"\s+", " ", negros.replace("//", "")).strip(" ,")
            if primera and tono:
                break
        datos.append({"hymn_number": n, "title": h["titulo"], "first_line": primera, "key": tono,
                      "page_number": h["pagina"], "author": h["autor"], "notes": h["notas"]})

    # 3) Imágenes: recortar cada trozo (puede seguir en la página siguiente), apilarlos y centrar en el lienzo.
    for n in sorted(himnos):
        h = himnos[n]
        trozos = []
        for indice, cajas in sorted(h["trozos"].items()):
            caja = pymupdf.Rect(cajas[0])
            for c in cajas[1:]:
                caja |= c
            trozos.append((indice, caja + (-4, -3, 4, 3)))
        ancho_pt = max(c.width for _, c in trozos)
        alto_pt = sum(c.height for _, c in trozos)
        zoom = min((ANCHO - 2 * MARGEN) / ancho_pt, (ALTO - 2 * MARGEN) / alto_pt)
        lienzo = pymupdf.Pixmap(pymupdf.csRGB, pymupdf.IRect(0, 0, ANCHO, ALTO), False)
        lienzo.set_rect(lienzo.irect, (255, 255, 255))
        x0 = MARGEN
        y = int((ALTO - alto_pt * zoom) / 2)
        for indice, caja in trozos:
            # Todos los trozos alineados a la izquierda del margen común de la página.
            izquierda = min(c.x0 for _, c in trozos)
            clip = pymupdf.Rect(izquierda, caja.y0, izquierda + ancho_pt, caja.y1)
            pix = doc[indice].get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), clip=clip, alpha=False)
            pix.set_origin(x0, y)
            lienzo.copy(pix, pix.irect)
            y += pix.height
        lienzo.save(os.path.join(salida, "claro", f"{n}.png"))

    with open(os.path.join(salida, "himnos.json"), "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=2)
    print(f"himnos: {len(datos)}  ({min(himnos)}-{max(himnos)})")
    faltan = [i for i in range(1, max(himnos) + 1) if i not in himnos]
    print("faltan:", faltan)
    multipagina = [n for n in himnos if len(himnos[n]["trozos"]) > 1]
    print("himnos que siguen en otra página:", multipagina)


if __name__ == "__main__":
    main()
