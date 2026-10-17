"""
(1.19.12, Josué) Imagen de un himno "acomodada" para la app (ver acomodos.json): se arma renglón por renglón desde el
PDF (vectorial) y permite:
  - cortes: partir una línea de letra antes de una frase; la parte derecha (con sus acordes y números de arriba, como
    una franja vertical) baja a un renglón nuevo, alineada a la izquierda. Cada acorde sigue sobre su sílaba porque se
    mueve junto con ella. El acorde que suena solo en el hueco entre frases queda arriba (regla de Josué).
  - verdes_abajo: lo verde (cambio de tono) sale de los renglones y va al final del himno.
"""
import pymupdf


def _renglones(pagina, caja_himno, es_verde):
    """Renglones visuales dentro de la caja del himno: cajas de líneas que se solapan en altura se juntan."""
    filas = []
    for b in pagina.get_text("rawdict")["blocks"]:
        for l in b.get("lines", []):
            r = pymupdf.Rect(l["bbox"])
            if not r.intersects(caja_himno) or r.y0 < caja_himno.y0 - 1 or r.y1 > caja_himno.y1 + 1:
                continue
            chars = []
            for s in l["spans"]:
                for c in s["chars"]:
                    chars.append({"c": c["c"], "x0": c["bbox"][0], "x1": c["bbox"][2], "color": s["color"],
                                  "negrita": bool(s["flags"] & 16 or "bold" in s["font"].lower())})
            if not any(c["c"].strip() for c in chars):
                continue
            # (fila de números de los acordes, p. ej. "11" del 68): renglón propio aunque esté a la altura de la letra
            solo_numeros = all(c["c"].isdigit() or not c["c"].strip() for c in chars)
            for f in filas:
                if f.get("numeros", False) != solo_numeros:
                    continue
                alto = min(f["caja"].y1, r.y1) - max(f["caja"].y0, r.y0)
                if alto > 0.8 * min(f["caja"].height, r.height):
                    f["caja"] |= r
                    f["chars"] += chars
                    break
            else:
                filas.append({"caja": pymupdf.Rect(r), "chars": chars, "numeros": solo_numeros})
    for f in filas:
        f["chars"].sort(key=lambda c: c["x0"])
        f["texto"] = "".join(c["c"] for c in f["chars"])
        visibles = [c for c in f["chars"] if c["c"].strip()]
        # ancho real: solo lo visible (las líneas del PDF traen espacios al final que ensanchan sin mostrar nada)
        f["x0v"] = min(c["x0"] for c in visibles)
        f["x1v"] = max(c["x1"] for c in visibles)
        f["letra"] = any(not c["negrita"] and not es_verde(c["color"]) and (c["color"] >> 16) < 150 for c in visibles)
    filas.sort(key=lambda f: f["caja"].y0)
    return filas


def _fichas(fila):
    """Palabras/acordes de un renglón: (x0, x1)."""
    out, cur = [], None
    for c in fila["chars"]:
        if c["c"].strip():
            if cur is None:
                cur = [c["x0"], c["x1"]]
            cur[1] = c["x1"]
        elif cur is not None:
            out.append(tuple(cur)); cur = None
    if cur is not None:
        out.append(tuple(cur))
    return out


def componer(doc, indice, caja_himno, caja_titulo, cfg, es_verde, espacio_titulo):
    """Devuelve la lista de renglones finales: (y0, y1, [(x0, x1, dx)], espacio_antes) en pt del PDF."""
    pagina = doc[indice]
    filas = _renglones(pagina, caja_himno, es_verde)
    izq = min(c["x0"] for f in filas for c in f["chars"] if c["c"].strip())
    salida = []           # renglones principales
    verdes = []           # renglones del bloque verde (al final)
    i_titulo = max((k for k, f in enumerate(filas) if f["caja"].y0 <= caja_titulo.y1 - 1), default=0)
    cortes = {c["linea"].lower(): (c["antes_de"].lower(), c.get("vez", 1)) for c in cfg.get("cortes", [])}
    previo = None
    grupo = []            # renglones de acordes/números desde la última letra
    for k, f in enumerate(filas):
        r = f["caja"]
        espacio = 0 if previo is None else max(0.0, r.y0 - previo.y1)
        if f.get("numeros") and previo is not None and r.y0 < previo.y1:
            espacio = 0.0  # números a la altura de la letra de arriba: van justo debajo de ella
        if k == i_titulo + 1:
            espacio = espacio_titulo
        previo = r
        piezas = [(f["x0v"] - 2, f["x1v"] + 2, 0.0)]
        # verde a la derecha: sale del renglón (no en el título ni en las notas de arriba)
        if cfg.get("verdes_abajo") and k > i_titulo:
            vis = [c for c in f["chars"] if c["c"].strip()]
            iv = [n for n, c in enumerate(vis) if es_verde(c["color"])]
            if iv:
                # lo que va pegado a lo verde (p. ej. "//" o "/" de otro color) se va con él; se corta en el primer
                # hueco grande antes de lo verde
                a = iv[0]
                while a > 0 and vis[a]["x0"] - vis[a - 1]["x1"] < 10:
                    a -= 1
                gx = vis[a]["x0"]
                verdes.append((r.y0, r.y1, gx - 1, f["x1v"] + 2))
                resto = [c for c in f["chars"] if c["c"].strip() and c["x1"] <= gx]
                if not resto:
                    continue  # renglón solo verde: se va entero
                piezas = [(f["x0v"] - 2, min(gx - 1, max(c["x1"] for c in resto) + 2), 0.0)]
        salida.append({"y0": r.y0, "y1": r.y1, "piezas": piezas, "espacio": espacio, "fila": f})
        if not f["letra"]:
            grupo.append(salida[-1])
            continue
        # renglón de letra: ¿hay que partirlo?
        texto = f["texto"].lower()
        clave = next((ini for ini in cortes if texto.lstrip().startswith(ini)), None)
        corte, vez = cortes[clave] if clave else (None, 1)
        if corte and texto.count(corte) >= vez:
            j = -1
            for _ in range(vez):
                j = texto.index(corte, j + 1)
            wx = f["chars"][j]["x0"]
            letra_izq = min(c["x0"] for c in f["chars"] if c["c"].strip())
            dx = -(wx - letra_izq)
            bloque = grupo + [salida[-1]]
            abajo = []
            for n, ren in enumerate(bloque):
                fichas = _fichas(ren["fila"])
                if ren is salida[-1]:
                    cx = wx - 1
                else:
                    # acordes que empiezan desde la frase de abajo bajan; los del hueco quedan arriba
                    quedan = [x1 for x0, x1 in fichas if x0 < wx - 2]
                    bajan = [x0 for x0, x1 in fichas if x0 >= wx - 2]
                    if not bajan:
                        continue
                    cx = (max(quedan) + min(bajan)) / 2 if quedan else min(bajan) - 1
                x0, x1, _ = ren["piezas"][0]
                # si arriba no queda nada visible de este renglón, se elimina (no deja un trozo vacío ni su alto)
                queda_algo = ren is salida[-1] or any(c["x1"] <= cx for c in ren["fila"]["chars"] if c["c"].strip())
                ren["piezas"] = [(x0, cx, 0.0)] if queda_algo else []
                abajo.append({"y0": ren["y0"], "y1": ren["y1"], "piezas": [(cx, x1, dx)],
                              "espacio": ren["espacio"] if n else (bloque[0]["espacio"] if bloque[0]["espacio"] > 0 else 2)})
            salida[:] = [x for x in salida if x["piezas"]]
            salida.extend(abajo)
            del cortes[clave]
        grupo = []
    if verdes:
        primero = True
        for y0, y1, x0, x1 in verdes:
            salida.append({"y0": y0, "y1": y1, "piezas": [(x0, x1, izq - x0)], "espacio": 14.3 if primero else 1.5})
            primero = False
    return salida, izq, cortes
