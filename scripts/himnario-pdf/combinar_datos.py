"""
Combina los datos extraídos del PDF nuevo con los datos actuales de la app (src/datos/himnos.json).

Uso: python -I scripts/himnario-pdf/combinar_datos.py <himnos-actual.json> <himnos-pdf.json> <salida.json>

Reglas:
- Himnos nuevos: todo sale del PDF.
- Título: si solo cambian mayúsculas/tildes/espacios se conserva el título actual (mejor acentuado);
  si cambian las palabras, se usa el del PDF.
- Primera línea: se conserva la actual si coincide con el comienzo de la letra del PDF; si no, la del PDF limpia.
- Tono: tonalidad del primer acorde del PDF (raíz + "m" si es menor). Si para un himno existente da distinto
  al tono actual, se conserva el actual y se informa (el primer acorde no siempre es la tonalidad).
- Página: la impresa en el PDF nuevo.
"""
import json
import re
import sys
import unicodedata


# Revisados a mano (11-10-2026): se conserva el dato actual.
# 29: el PDF dice "Cuan hermosa son" pero la letra dice "Cuan hermosas son" (error de tipeo del PDF).
# 40, 89, 132: el PDF trae alargues de canto ("caarne", "Señoooor") o variantes menores; para la lista y la
# búsqueda se deja la versión limpia (la imagen muestra el PDF tal cual).
CONSERVAR_TITULO = {29}
CONSERVAR_PRIMERA_LINEA = {40, 89, 132}
# Errores de tipeo del PDF corregidos solo en los datos (lista y búsqueda); la imagen muestra el PDF tal cual.
CORREGIR_PRIMERA_LINEA = {166: "Adopción liberadora me has concedido tú, mi Santo Dios"}


def normalizar(t):
    t = unicodedata.normalize("NFD", t or "")
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9ñ]+", " ", t).strip()


ACORDE = re.compile(r"^\(?([A-G])([#b]?)(m(?!aj))?")


def tonalidad(texto):
    m = ACORDE.match((texto or "").strip())
    return f"{m.group(1)}{m.group(2)}{'m' if m.group(3) else ''}" if m else None


def limpiar_linea(t):
    t = re.sub(r"[\\/]{2,}", " ", t or "")
    t = re.sub(r"(\w)\s+-\s+(\w)", r"\1\2", t)   # sílabas cortadas: "alaba - ré" -> "alabaré"
    return re.sub(r"\s+", " ", t).strip(" ,.")


def main():
    actual = {h["hymn_number"]: h for h in json.load(open(sys.argv[1], encoding="utf-8"))}
    pdf = json.load(open(sys.argv[2], encoding="utf-8"))
    resultado, avisos = [], []
    for p in pdf:
        n = p["hymn_number"]
        a = actual.get(n)
        primera_pdf = limpiar_linea(p["first_line"])
        tono_pdf = tonalidad(p["key"])
        if a is None:
            titulo, primera, tono, alt = p["title"], primera_pdf, tono_pdf, []
        else:
            titulo = a["title"] if n in CONSERVAR_TITULO or normalizar(a["title"]) == normalizar(p["title"]) or \
                normalizar(re.sub(r"\(.*?\)", "", a["title"])) == normalizar(p["title"]) else p["title"]
            if titulo != a["title"]:
                avisos.append(f"título {n}: «{a['title']}» → «{titulo}»")
            na, np_ = normalizar(a.get("first_line")), normalizar(primera_pdf)
            primera = a.get("first_line") if n in CONSERVAR_PRIMERA_LINEA or (
                na and (np_.startswith(na) or na.startswith(np_))) else primera_pdf
            if primera != a.get("first_line"):
                avisos.append(f"primera línea {n}: «{a.get('first_line')}» → «{primera}»")
            tono = a.get("key") or tono_pdf
            if tono_pdf and a.get("key") and tono_pdf != a["key"]:
                avisos.append(f"tono {n}: se mantiene {a['key']} (el primer acorde del PDF es {tono_pdf})")
            alt = a.get("alt_titles") or []
        primera = CORREGIR_PRIMERA_LINEA.get(n, primera)
        resultado.append({
            "hymn_number": n,
            "title": titulo,
            "first_line": primera,
            "key": tono,
            "page_number": p["page_number"],
            "alt_titles": alt,
            "search_text": normalizar(f"{titulo} {primera}"),
        })
    with open(sys.argv[3], "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(sys.argv[3].replace(".json", "-avisos.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(avisos) + "\n")
    print(f"himnos: {len(resultado)}  avisos: {len(avisos)}")


if __name__ == "__main__":
    main()
