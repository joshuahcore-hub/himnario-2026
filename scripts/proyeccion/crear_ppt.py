"""
Crea el PowerPoint de una alabanza del himnario copiando el DISEÑO de otra ya hecha (fondo, letra, formato del título)
y poniendo los textos de diapositivas.py. Solo cambia texto XML: no hace falta PowerPoint.

Uso:  python -I scripts/proyeccion/crear_ppt.py <base.pptx> <diapositivas.json> <carpeta-salida>
"""
import json
import os
import re
import sys
import zipfile
from xml.sax.saxutils import escape


def parrafos(slide: str) -> list[str]:
    cuerpo = re.search(r"<p:txBody>.*?</p:txBody>", slide, re.S).group(0)
    return re.findall(r"<a:p>.*?</a:p>", cuerpo, re.S)


def con_texto(p: str, texto: str, sz: int) -> str:
    p = re.sub(r'\bsz="\d+"', f'sz="{sz}"', p)
    if not texto:
        # Renglón vacío: sin trozos de texto (solo el formato del final del párrafo).
        return re.sub(r"<a:r>.*?</a:r>", "", p, flags=re.S)
    p = re.sub(r"(<a:r>.*?<a:t>).*?(</a:t></a:r>)", lambda m: m.group(1) + escape(texto) + m.group(2), p, count=1, flags=re.S)
    return re.sub(r"(</a:r>)(<a:r>.*?</a:r>)+", r"\1", p, flags=re.S)  # un solo trozo por renglón


def main():
    base, datos, salida = sys.argv[1], sys.argv[2], sys.argv[3]
    os.makedirs(salida, exist_ok=True)
    z = zipfile.ZipFile(base)
    archivos = {n: z.read(n) for n in z.namelist()}
    s1 = archivos["ppt/slides/slide1.xml"].decode("utf-8")
    s2 = archivos["ppt/slides/slide2.xml"].decode("utf-8")
    p1 = parrafos(s1)
    titulo_p, vacio_p, linea_p = p1[0], p1[1], p1[2]
    rels2 = re.sub(r'<Relationship\b[^>]*notesSlide[^>]*/>', "", archivos["ppt/slides/_rels/slide2.xml.rels"].decode("utf-8"))

    for cancion in json.load(open(datos, encoding="utf-8")):
        sz = cancion["tam"] * 100
        nuevos = dict(archivos)
        pres = nuevos["ppt/presentation.xml"].decode("utf-8")
        prels = nuevos["ppt/_rels/presentation.xml.rels"].decode("utf-8")
        tipos = nuevos["[Content_Types].xml"].decode("utf-8")
        ids = re.findall(r'<p:sldId id="(\d+)" r:id="(rId\d+)"/>', pres)
        max_id = max(int(i) for i, _ in ids)
        max_rid = max(int(x) for x in re.findall(r'Id="rId(\d+)"', prels))
        lista = ids[:2]
        for k, lineas in enumerate(cancion["diapositivas"], start=1):
            if k == 1:
                ps = [con_texto(titulo_p, cancion["encabezado"], sz), con_texto(vacio_p, "", sz)]
                plantilla = s1
            else:
                ps, plantilla = [], s2
            ps += [con_texto(linea_p, l, sz) for l in lineas]
            cuerpo = re.search(r"<p:txBody>.*?</p:txBody>", plantilla, re.S).group(0)
            inicio = cuerpo[: cuerpo.index("<a:p>")]
            # Sin "ajustar al cuadro" de PowerPoint: achicaba cada diapositiva distinto. El tamaño ya viene parejo.
            inicio = re.sub(r"<a:normAutofit[^>]*/>|<a:normAutofit[^>]*>.*?</a:normAutofit>", "<a:noAutofit/>", inicio, flags=re.S)
            nuevo = plantilla.replace(cuerpo, inicio + "".join(ps) + "</p:txBody>")
            nuevos[f"ppt/slides/slide{k}.xml"] = nuevo.encode("utf-8")
            if k > 2:
                nuevos[f"ppt/slides/_rels/slide{k}.xml.rels"] = rels2.encode("utf-8")
                max_id += 1
                max_rid += 1
                lista.append((str(max_id), f"rId{max_rid}"))
                prels = prels.replace("</Relationships>", f'<Relationship Id="rId{max_rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide{k}.xml"/></Relationships>')
                tipos = tipos.replace("</Types>", f'<Override PartName="/ppt/slides/slide{k}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>')
        n = len(cancion["diapositivas"])
        if n == 1:  # sobra la 2.ª del diseño base
            lista = lista[:1]
        pres = re.sub(r"<p:sldIdLst>.*?</p:sldIdLst>", "<p:sldIdLst>" + "".join(f'<p:sldId id="{i}" r:id="{r}"/>' for i, r in lista) + "</p:sldIdLst>", pres, flags=re.S)
        nuevos["ppt/presentation.xml"] = pres.encode("utf-8")
        nuevos["ppt/_rels/presentation.xml.rels"] = prels.encode("utf-8")
        nuevos["[Content_Types].xml"] = tipos.encode("utf-8")
        nombre = f'{cancion["numero"]} {cancion["titulo"]}.pptx'.replace("/", "-")
        with zipfile.ZipFile(os.path.join(salida, nombre), "w", zipfile.ZIP_DEFLATED) as out:
            for k, v in nuevos.items():
                out.writestr(k, v)
        print("listo:", nombre, n, "diapositivas")


if __name__ == "__main__":
    main()
