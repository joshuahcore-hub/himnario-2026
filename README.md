# Himnario 2026

App web instalable (PWA) con los himnos del Himnario 2026. Funciona sin internet una vez abierta:
la lista, la búsqueda y las 326 imágenes (modo claro y oscuro) quedan guardadas en el celular.

## Estructura
- `src/` — la app (React + Vite + Tailwind).
- `src/datos/himnos.json` — número, título, primera línea, tono y página de cada himno.
- `public/himnos/{claro,oscuro}/N.webp` — imágenes de los himnos (generadas, no editar a mano).
- `scripts/preparar-imagenes.mjs` — convierte las imágenes maestras PNG (guardadas fuera del repositorio,
  en `../imagenes-originales/`) a WebP.

## Comandos
```
npm install
npm run dev        # desarrollo
npm run imagenes   # tras agregar o cambiar una imagen maestra
npm run build      # genera dist/ (lo que se publica)
npm run preview    # prueba local de dist/
```

## Agregar o cambiar un himno
1. Poner el PNG en `../imagenes-originales/claro/N.png` y `../imagenes-originales/oscuro/N.png`.
2. `npm run imagenes`.
3. Agregar o editar su entrada en `src/datos/himnos.json`.
4. Publicar (subir a GitHub; Cloudflare publica solo).
