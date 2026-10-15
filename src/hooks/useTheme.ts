import { useState, useEffect, useCallback } from 'react';
import { COLORES_TEMA, FONDOS, archivoManifiesto, type ColorTema } from '@/lib/colores';

type Theme = 'light' | 'dark';

const colorActual = (): ColorTema =>
  COLORES_TEMA.find(c => c !== 'estandar' && document.documentElement.classList.contains(`color-${c}`)) ?? 'estandar';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [color, setColor] = useState<ColorTema>(colorActual);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
      setColor(colorActual());
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }, [theme]);

  return { theme, color, toggleTheme };
}

/** Colores del sistema según tema y color: barra del celular, fondo inicial y manifiesto (apertura de Android). */
export function aplicarColoresDelSistema(oscuro: boolean, color: ColorTema = colorActual()) {
  const fondo = FONDOS[color][oscuro ? 'oscuro' : 'claro'];
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', fondo);
  const manifiesto = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifiesto) manifiesto.href = '/' + archivoManifiesto(color, oscuro);
}

/** Cambia entre las clases sin animar los colores a medias (theme-switching apaga las transiciones). */
function cambiarSinParpadeo(cambio: () => void) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  cambio();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('theme-switching'));
  });
}

export function applyTheme(next: Theme) {
  cambiarSinParpadeo(() => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    aplicarColoresDelSistema(next === 'dark');
    localStorage.setItem('theme', next);
  });
}

/** Color de la app (1.8.0): Estándar, Rosa, Lila, Damasco, Azul o Verde salvia. */
export function applyColor(next: ColorTema) {
  cambiarSinParpadeo(() => {
    const root = document.documentElement;
    COLORES_TEMA.forEach(c => root.classList.remove(`color-${c}`));
    if (next !== 'estandar') root.classList.add(`color-${next}`);
    aplicarColoresDelSistema(root.classList.contains('dark'), next);
    try { localStorage.setItem('color', next); } catch { /* sin espacio */ }
  });
}
