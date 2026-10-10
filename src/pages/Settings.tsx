import { Moon, Sun, Globe, Check, WifiOff, CheckCircle2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/index';
import type { Locale } from '@/lib/i18n/translations';
import { useTheme } from '@/hooks/useTheme';
import { useOffline } from '@/lib/offline';
import SeccionAcceso from '@/components/SeccionAcceso';

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'es', label: 'Español' },
  { code: 'en', label: 'English' },
];

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === 'dark';
  const offline = useOffline();

  return (
    <div className="px-5 pt-4 pb-24 space-y-5 overflow-y-auto" style={{ height: 'calc(100vh - 4rem)' }}>
      <h1 className="text-xl font-bold text-foreground">{t.settings_title}</h1>

      <SeccionAcceso />

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">{t.settings_theme}</span>
          <button
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs"
          >
            {dark ? <Sun size={12} /> : <Moon size={12} />}
            {dark ? t.settings_theme_light : t.settings_theme_dark}
          </button>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t.settings_language}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLocale(lang.code)}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors ${
                locale === lang.code
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-accent'
              }`}
            >
              {locale === lang.code && <Check size={12} />}
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <WifiOff size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t.offline_title}</span>
        </div>
        {!offline.soportado ? (
          <p className="text-[11px] text-muted-foreground">{t.offline_unsupported}</p>
        ) : offline.listo ? (
          <p className="text-[11px] text-foreground flex items-center gap-1.5">
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

      <p className="text-center text-[10px] text-muted-foreground/60">
        Himnario 2026 · {t.settings_version} {__APP_VERSION__}
      </p>
    </div>
  );
}
