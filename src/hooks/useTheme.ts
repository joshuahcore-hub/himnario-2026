import { useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  }, [theme]);

  return { theme, toggleTheme };
}

/** Colores del sistema según el tema: barra del celular y manifiesto (apertura de Android al instalar). */
export function aplicarColoresDelSistema(oscuro: boolean) {
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', oscuro ? '#1C1A18' : '#ffffff');
  const manifiesto = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (manifiesto) manifiesto.href = oscuro ? '/manifest-oscuro.webmanifest' : '/manifest.webmanifest';
}

export function applyTheme(next: Theme) {
  const root = document.documentElement;
  root.classList.add('theme-switching');
  root.classList.toggle('dark', next === 'dark');
  aplicarColoresDelSistema(next === 'dark');
  localStorage.setItem('theme', next);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => root.classList.remove('theme-switching'));
  });
}
