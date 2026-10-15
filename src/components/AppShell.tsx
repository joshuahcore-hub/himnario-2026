import { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Music, Settings } from 'lucide-react';

import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';
import { intentarSalir } from '@/lib/guardiaSalida';
import { usePendientes } from '@/hooks/usePendientes';

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { puedeEditar } = useAcceso();
  const pendientes = usePendientes();

  // "Crear" solo aparece en los celulares aprobados (creadores y administrador).
  const tabs = [
    ...(puedeEditar ? [{ path: '/crear', label: t.tab_create, icon: Plus }] : []),
    { path: '/minutas', label: t.tab_minutas, icon: BookOpen },
    { path: '/', label: t.tab_hymnal, icon: Music },
    { path: '/settings', label: t.tab_settings, icon: Settings },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Safe area top padding instead of header bar */}
      <div style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }} />
      {/* Computador: cada pantalla decide su ancho (Josué, 1.4.8). Ajustes, Crear y Administración en una columna
          (max-w-lg); el himnario algo más abierto (max-w-3xl); las minutas a todo el ancho, para ver varias. */}
      <main className="flex-1 overflow-hidden w-full">
        {children}
      </main>

      {/* Sin desenfoque de fondo (backdrop-blur): en el celular costaba mucho mientras la canción se deslizaba detrás
          y los toques se atrasaban (1.7.2). */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex items-stretch h-16 max-w-lg mx-auto px-2">
          {tabs.map(tab => {
            const active = location.pathname === tab.path;
            return (
              <button
                key={tab.path}
                onClick={() => intentarSalir(() => navigate(tab.path))}
                // Toda la franja de la pestaña recibe el toque (flex-1, alto completo): antes solo el ícono y el texto.
                className={`tap-btn flex-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200 ${
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                <span className="relative">
                  <tab.icon size={22} strokeWidth={active ? 2.2 : 1.6} />
                  {/* Solicitudes de creador por aprobar (solo el administrador). */}
                  {tab.path === '/settings' && pendientes > 0 && (
                    <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-card animate-in zoom-in-50 duration-200" />
                  )}
                </span>
                <span className="text-[11px] font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
