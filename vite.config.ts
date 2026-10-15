import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { readFileSync } from "fs";
import { VitePWA, type ManifestOptions } from "vite-plugin-pwa";
import { COLORES_TEMA, FONDOS, archivoManifiesto } from "./src/lib/colores";

// Manifiesto de la app instalable. La pantalla de apertura de Android la arma el celular con
// background_color + ícono, y solo admite UN color: por eso hay dos manifiestos (claro y oscuro)
// y la app enlaza el que corresponde al tema elegido (ver index.html y src/hooks/useTheme.ts).
const manifiesto: Partial<ManifestOptions> = {
  id: "/",
  name: "Himnario 2026",
  short_name: "Himnario 2026",
  description: "Himnario 2026 — himnos y minutas, también sin internet",
  lang: "es",
  start_url: "/",
  scope: "/",
  display: "standalone",
  orientation: "any", // se puede girar solo en el himno abierto y el lector (ver src/hooks/useHorizontal.ts)
  background_color: "#ffffff",
  theme_color: "#ffffff",
  icons: [
    { src: "/icono-v5-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icono-v5-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    // Versión con margen para los Android que recortan el ícono en círculo u otra forma.
    { src: "/icono-v5-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};

/** Genera manifest-oscuro.webmanifest (fondo oscuro) y, desde 1.8.0, uno por cada color en claro y en oscuro
 *  (manifest-rosa.webmanifest, manifest-rosa-oscuro.webmanifest…): la apertura de Android usa ese fondo. */
const manifiestoOscuro = (): Plugin => ({
  name: "manifiesto-oscuro",
  apply: "build",
  generateBundle() {
    for (const color of COLORES_TEMA) {
      for (const oscuro of [false, true]) {
        const archivo = archivoManifiesto(color, oscuro);
        if (archivo === "manifest.webmanifest") continue; // lo genera vite-plugin-pwa
        const fondo = FONDOS[color][oscuro ? "oscuro" : "claro"];
        this.emitFile({ type: "asset", fileName: archivo, source: JSON.stringify({ ...manifiesto, background_color: fondo, theme_color: fondo }) });
      }
    }
  },
});

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port: 5000,
    proxy: {
      // En desarrollo, las llamadas /api van al Worker local (wrangler dev)
      "/api": { target: "http://localhost:8787", changeOrigin: true },
    },
  },
  define: {
    // Número de versión de package.json ("version"): subirlo en cada publicación
    // (1.0.1, 1.0.2… arreglos; 1.1.0, 1.2.0… funciones nuevas). Se muestra al final de Ajustes.
    __APP_VERSION__: JSON.stringify(JSON.parse(readFileSync(path.resolve(__dirname, "package.json"), "utf8")).version),
  },
  plugins: [
    react(),
    manifiestoOscuro(),
    VitePWA({
      // Cuando se publica una versión nueva, el celular la descarga en silencio y la deja en espera:
      // nunca recarga ni cambia la pantalla mientras se usa (ver src/main.tsx).
      registerType: "prompt",
      injectRegister: false,
      // Íconos con versión en el nombre (scripts/iconos/generar.mjs): así nadie ve uno viejo guardado.
      includeAssets: ["icono-v5-64.png", "icono-v5-apple-180.png"],
      manifest: manifiesto,
      workbox: {
        // Todo queda guardado en el celular al instalar: la app y las 326 imágenes de los himnos.
        // (también el PDF del himnario, para poder descargarlo sin internet)
        globPatterns: ["**/*.{js,css,html,png,svg,woff2,webp,pdf}"],
        // Las pantallas de apertura de iPhone las pide el sistema al instalar; no hace falta guardarlas.
        globIgnores: ["apertura/**"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith("/api/"), handler: "NetworkOnly" },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
