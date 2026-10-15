# Proyección (1.12.0): Biblia RVR1960 compacta para los selectores Libro → Capítulo → Versículo de la app.
# Fuente: el archivo de Josué con el que se armó su conector (texto exacto RVR1960):
#   G:\Mi unidad\Joshuah\Estudio\Biblia RV1960\biblia_rv1960.json  (31.103 versículos)
# Uso: python -I scripts/proyeccion/biblia.py "<biblia_rv1960.json>" ..\proyeccion\biblia.json
# Salida: {"libros": [{"n": "Génesis", "c": [["v1", "v2", ...], ...]}, ...]} — 66 libros en orden.
# OJO derechos: la RVR1960 es de Sociedades Bíblicas Unidas. Este archivo NO va al repositorio ni a la app pública:
# se sube a Cloudflare KV y solo lo entrega el servidor a quien tiene el permiso "Generar proyección".
import json, sys

fuente, salida = sys.argv[1], sys.argv[2]
datos = json.load(open(fuente, encoding='utf-8'))
libros = {}
for v in datos:
    libro = libros.setdefault(v['libro_num'], {'n': v['libro'], 'c': {}})
    libro['c'].setdefault(v['capitulo'], {})[v['versiculo']] = v['texto'].strip()
salida_libros = []
for num in sorted(libros):
    l = libros[num]
    caps = []
    for c in sorted(l['c']):
        vs = l['c'][c]
        assert sorted(vs) == list(range(1, len(vs) + 1)), (l['n'], c)
        caps.append([vs[i] for i in range(1, len(vs) + 1)])
    salida_libros.append({'n': l['n'], 'c': caps})
assert len(salida_libros) == 66, len(salida_libros)
json.dump({'libros': salida_libros}, open(salida, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f"{len(salida_libros)} libros, {sum(len(c) for l in salida_libros for c in l['c'])} versículos")
