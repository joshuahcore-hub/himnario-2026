# Proyección (1.12.0): empareja cada alabanza del himnario de la app con su PowerPoint en la carpeta de canciones.
# Uso: python -I scripts/proyeccion/emparejar.py "<carpeta de canciones>" <salida.json>
# Regla: el NÚMERO del archivo ("153 Bendita locura.pptx") debe ser el del himnario Y el nombre debe parecerse; si el
# nombre no se parece se deja fuera (p. ej. 35 "Dame un nuevo corazón" ≠ 35 "El gran sanador"). Un archivo sin número
# se acepta si el nombre coincide. La subcarpeta "Otros" no se usa. Avisos en <salida>-avisos.txt.
import json, os, re, sys, unicodedata

carpeta, salida = sys.argv[1], sys.argv[2]
himnos = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'src', 'datos', 'himnos.json'), encoding='utf-8'))

# Correcciones conocidas (revisadas con Josué). Número del himnario -> nombre exacto del archivo.
FORZAR = {82: '82 Visniste desde los cielos.pptx'}  # error de tipeo en el archivo


def norm(s):
    s = unicodedata.normalize('NFD', s)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'\s+', ' ', re.sub(r'[^a-z0-9 ]', ' ', s.lower())).strip()


def parecido(a, b):
    a, b = norm(a), norm(b)
    return bool(a) and bool(b) and (a[:12] in b or b[:12] in a)


archivos = [f for f in os.listdir(carpeta) if f.lower().endswith('.pptx') and os.path.isfile(os.path.join(carpeta, f))]
por_numero, sin_numero = {}, []
for f in archivos:
    m = re.match(r'^0*(\d+)\s*(.*)\.pptx$', f, re.I)
    if m:
        por_numero.setdefault(int(m.group(1)), []).append((f, m.group(2)))
    else:
        sin_numero.append(f)

lista, avisos = [], []
for h in himnos:
    n, titulo = h['hymn_number'], h['title']
    nombres = [titulo] + list(h.get('alt_titles') or [])
    elegido = FORZAR.get(n)
    if not elegido:
        cand = [f for f, nombre in por_numero.get(n, []) if any(parecido(nombre, t) for t in nombres)]
        if not cand:
            cand = [f for f in sin_numero if any(parecido(os.path.splitext(f)[0], t) for t in nombres)]
        if len(cand) == 1:
            elegido = cand[0]
        elif len(cand) > 1:
            avisos.append(f'{n} {titulo}: varios archivos {cand}; se usa el primero')
            elegido = cand[0]
        else:
            otros = [f for f, _ in por_numero.get(n, [])]
            avisos.append(f'{n} {titulo}: SIN diapositivas' + (f' (con ese número está {otros})' if otros else ''))
    if elegido:
        lista.append({'clave': str(n), 'titulo': titulo, 'archivo': os.path.normpath(os.path.join(carpeta, elegido))})

# Canciones que NO están en el himnario (archivos sin número, o con un número que no corresponde a esa alabanza):
# también van al maestro, con clave "t:<nombre normalizado>", para las alabanzas "fuera del himnario" de una minuta
# (la app las busca por su título).
usados = {os.path.basename(x['archivo']) for x in lista}
for f in sorted(archivos):
    if f in usados:
        continue
    nombre = re.sub(r'^0*\d+\s*', '', os.path.splitext(f)[0]).strip(' .')
    lista.append({'clave': 't:' + norm(nombre), 'titulo': nombre, 'archivo': os.path.normpath(os.path.join(carpeta, f))})
    avisos.append(f'fuera del himnario: {f}')

json.dump(lista, open(salida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
open(os.path.splitext(salida)[0] + '-avisos.txt', 'w', encoding='utf-8').write('\n'.join(avisos) + '\n')
print(f'{sum(1 for x in lista if not x["clave"].startswith("t:"))} del himnario + {sum(1 for x in lista if x["clave"].startswith("t:"))} fuera del himnario; avisos en el archivo')
