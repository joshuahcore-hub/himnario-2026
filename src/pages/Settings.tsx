import { Moon, Sun, Globe, WifiOff, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/index';
import type { Locale } from '@/lib/i18n/translations';
import { useTheme, applyTheme } from '@/hooks/useTheme';
import Desplegable from '@/components/Desplegable';
import { useOffline } from '@/lib/offline';
import { useRef } from 'react';
import MenuAcceso, { EVENTO_ACTIVAR_ADMIN } from '@/components/SeccionAcceso';
import SeccionPdf from '@/components/SeccionPdf';

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme } = useTheme();
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
    <div className="px-5 pt-4 pb-24 space-y-5 overflow-y-auto" style={{ height: 'calc(100dvh - 4rem)' }}>
      {/* Título y, a la derecha, el menú ⋮ con las opciones avanzadas (creador, perfil, administración). */}
      {/* relative z-30: el menú desplegado queda por encima de las tarjetas de abajo. */}
      <div className="relative z-30 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground">{t.settings_title}</h1>
        <MenuAcceso />
      </div>

      {/* Idioma (izquierda) y Tema (derecha) en una fila; cada uno despliega sus opciones hacia abajo. */}
      <div className="grid grid-cols-2 gap-3">
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
            { valor: 'light', etiqueta: t.theme_light_mode, icono: <Sun size={13} /> },
            { valor: 'dark', etiqueta: t.theme_dark_mode, icono: <Moon size={13} /> },
          ]}
          onElegir={applyTheme}
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
