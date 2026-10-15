// Colores de la app (1.8.0, Josué): Estándar (el de siempre) + Rosa, Lila, Damasco, Azul y Verde salvia.
// Cada color tiene versión clara y oscura según el Tema (Claro/Oscuro). Los tonos de la interfaz están en
// src/index.css (clases .color-*); aquí, el fondo en hex de cada combinación (barra del celular y apertura de
// Android, que se arman con un solo color) y la muestra que se ve en el menú. Sin dependencias del navegador:
// también lo usa vite.config.ts para generar un manifiesto por combinación.

export type ColorTema = 'estandar' | 'rosa' | 'lila' | 'damasco' | 'azul' | 'salvia';

export const COLORES_TEMA: ColorTema[] = ['estandar', 'rosa', 'lila', 'damasco', 'azul', 'salvia'];

/** Fondo de cada color en claro y en oscuro (mismo valor que --background de index.css). */
export const FONDOS: Record<ColorTema, { claro: string; oscuro: string }> = {
  estandar: { claro: '#ffffff', oscuro: '#1C1A18' }, // como siempre (barra del celular blanca en claro)
  rosa: { claro: '#F8DBE5', oscuro: '#24141B' },
  lila: { claro: '#E3D3F3', oscuro: '#1D1528' },
  damasco: { claro: '#FCE5D5', oscuro: '#241A14' },
  azul: { claro: '#DBEBFA', oscuro: '#121A26' },
  salvia: { claro: '#DEEDE3', oscuro: '#161D1A' },
};

/** Circulito de muestra en el menú Color. */
export const MUESTRAS: Record<ColorTema, string> = {
  estandar: 'linear-gradient(135deg, #F7F5F3 50%, #2A2724 50%)',
  rosa: '#E58BAA',
  lila: '#A98BD6',
  damasco: '#F2A779',
  azul: '#6FA8E0',
  salvia: '#8DB89A',
};

/** Manifiesto de cada combinación (la apertura de Android usa su fondo). */
export function archivoManifiesto(color: ColorTema, oscuro: boolean): string {
  if (color === 'estandar') return oscuro ? 'manifest-oscuro.webmanifest' : 'manifest.webmanifest';
  return `manifest-${color}${oscuro ? '-oscuro' : ''}.webmanifest`;
}
