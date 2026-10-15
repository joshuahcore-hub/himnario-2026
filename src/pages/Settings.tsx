import { Moon, Sun, Globe, WifiOff, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/index';
import type { Locale } from '@/lib/i18n/translations';
import { useTheme, applyTheme, applyColor } from '@/hooks/useTheme';
import { COLORES_TEMA, MUESTRAS, type ColorTema } from '@/lib/colores';
import Desplegable from '@/components/Desplegable';
import { useOffline } from '@/lib/offline';
import { useRef } from 'react';
import MenuAcceso, { EVENTO_ACTIVAR_ADMIN } from '@/components/SeccionAcceso';
import SeccionPdf from '@/components/SeccionPdf';

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
  { code: 'pt', label: 'Português' },
];

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, color } = useTheme();
  const muestra = (c: ColorTema) => (
    <span className="inline-block w-3 h-3 rounded-full shrink-0 border border-foreground/15" style={{ background: MUESTRAS[c] }} />
  );
  const dark = theme === 'dark';
  const offline = useOffline();
  const toquesVersion = useRef<number[]>([]);
  const tocarVersion = () => {
    const ahora = Date.now();
    toquesVersion.current = [...toquesVersion.current.filter(t => ahora - t < 3000), ahora];
    if (toquesVersion.current.length >= 5) {
      toquesVersion.current = [];
      window.dispatchEvent(new Event(EVENTO_ACTIVAR_ADMIN));
    }
  };

  return (
    <div className="px-5 pt-4 pb-24 space-y-5 overflow-y-auto w-full max-w-lg mx-auto" style={{ height: 'calc(100dvh - var(--barra))' }}>
      {/* Título y, a la derecha, el menú ⋮ con las opciones avanzadas (creador, perfil, administración). */}
      {/* relative z-30: el menú desplegado queda por encima de las tarjetas de abajo. */}
      <div className="relative z-30 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t.settings_title}</h1>
        <MenuAcceso />
      </div>

      {/* Idioma, Tema y Color en una fila (Josué, 1.8.0); cada uno despliega sus opciones hacia abajo. */}
      {/* Celulares de menos de 360 px: Color pasa a una segunda fila para que todo se lea completo.
          Columnas de ancho FIJO (1.10.0, Josué): no dependen de lo elegido ni del idioma (antes, al pasar de Español a
          Português, Idioma se agrandaba y achicaba a los demás). Proporciones = lo que necesita la opción más larga de
          cada menú en los 3 idiomas (Português, Oscuro, Verde salvia): en 360 px cabe todo. */}
      <div className="grid grid-cols-[minmax(0,103fr)_minmax(0,86fr)_minmax(0,117fr)] max-[359px]:grid-cols-2 gap-2 [&>*:nth-child(3)]:max-[359px]:col-span-2">
        <Desplegable<Locale>
          titulo={t.settings_language}
          icono={<Globe size={13} className="text-muted-foreground" />}
          valor={locale}
          opciones={LANGUAGES.map(l => ({ valor: l.code, etiqueta: l.label }))}
          onElegir={setLocale}
        />
        <Desplegable<'light' | 'dark'>
          titulo={t.settings_theme}
          icono={dark ? <Moon size={13} className="text-muted-foreground" /> : <Sun size={13} className="text-muted-foreground" />}
          valor={theme}
          opciones={[
            { valor: 'light', etiqueta: t.theme_light_mode, corta: t.settings_theme_light, icono: <Sun size={13} />, iconoEnBoton: false },
            { valor: 'dark', etiqueta: t.theme_dark_mode, corta: t.settings_theme_dark, icono: <Moon size={13} />, iconoEnBoton: false },
          ]}
          onElegir={applyTheme}
          anchoFijo
        />
        <Desplegable<ColorTema>
          titulo={t.settings_color}
          // El circulito del color va junto al título (en el botón no cabía con el nombre, 1.9.3).
          icono={muestra(color)}
          valor={color}
          opciones={COLORES_TEMA.map(c => ({ valor: c, etiqueta: t.color_nombre[c], corta: t.color_corto[c], icono: muestra(c), iconoEnBoton: false }))}
          onElegir={applyColor}
          alinear="derecha"
        />
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <WifiOff size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t.offline_title}</span>
        </div>
        {!offline.soportado ? (
          <p className="text-[11px] text-muted-foreground">{t.offline_unsupported}</p>
        ) : !offline.revisado ? (
          // Contando (milisegundos): la misma línea de "Listo" pero invisible (idéntico alto), para que nada salte.
          <p className="text-[11px] flex items-center gap-1.5 invisible" aria-hidden>
            <CheckCircle2 size={14} className="shrink-0" />
            {t.offline_ready}
          </p>
        ) : offline.listo ? (
          <p className="text-[11px] text-foreground flex items-center gap-1.5 animate-in fade-in duration-200">
            <CheckCircle2 size={14} className="text-green-600 shrink-0" />
            {t.offline_ready}
          </p>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground mb-2">{t.offline_preparing(offline.guardadas, offline.total)}</p>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(offline.guardadas / offline.total) * 100}%` }}
              />
            </div>
          </>
        )}
      </div>

      <SeccionPdf />

      {/* 5 toques seguidos en la versión: "Activar como administrador" (escondido; ver SeccionAcceso). */}
      <p className="text-center text-[10px] text-muted-foreground/60 py-2" onClick={tocarVersion}>
        Himnario 2026 · {t.settings_version} {__APP_VERSION__}
      </p>
    </div>
  );
}
