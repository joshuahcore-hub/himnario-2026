import { ReactNode, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Music, Settings } from 'lucide-react';

import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';
import { intentarSalir } from '@/lib/guardiaSalida';
import { usePendientes } from '@/hooks/usePendientes';
import { useToque } from '@/hooks/useToque';
import { mantenerSuscripcion } from '@/lib/notificaciones';

/** Pestaña de abajo. Se activa al soltar el dedo (useToque): tras mover una lista, el navegador a veces no generaba
 *  el click del primer toque (Josué, 1.7.4). Toda su franja recibe el toque (flex-1, alto completo). */
function Pestana({ activa, etiqueta, Icono, aviso, onTocar }: {
  activa: boolean;
  etiqueta: string;
  Icono: typeof Music;
  aviso: boolean;
  onTocar: () => void;
}) {
  const toque = useToque(onTocar);
  return (
    <button
      {...toque}
      className={`tap-btn flex-1 flex flex-col items-center justify-center gap-1 rounded-xl transition-colors duration-200 ${
        activa ? 'text-foreground' : 'text-muted-foreground hover:text-foreground/70'
      }`}
    >
      <span className="relative">
        <Icono size={22} strokeWidth={activa ? 2.2 : 1.6} />
        {/* Solicitudes de creador por aprobar (solo el administrador). */}
        {aviso && (
          <span className="absolute -top-0.5 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-card animate-in zoom-in-50 duration-200" />
        )}
      </span>
      <span className="text-[11px] font-medium">{etiqueta}</span>
    </button>
  );
}

// Última pantalla vista DENTRO del himnario (lista o un himno abierto): al volver a la pestaña Himnario desde otra se
// regresa ahí (1.12.1, Josué: antes volvía siempre a la lista).
let ultimaDelHimnario = '/';
const esDelHimnario = (p: string) => p === '/' || p.startsWith('/hymnal');

export default function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { puedeEditar, puedeVerMinutas, registrado } = useAcceso();
  const pendientes = usePendientes();
  useEffect(() => { if (esDelHimnario(location.pathname)) ultimaDelHimnario = location.pathname + location.search; }, [location]);
  const irA = (path: string) => {
    if (path === '/' && !esDelHimnario(location.pathname) && ultimaDelHimnario !== '/') {
      // Primero la lista y encima el himno: así "atrás" desde el himno vuelve a la lista, como siempre.
      navigate('/');
      navigate(ultimaDelHimnario);
      return;
    }
    navigate(path);
  };

  // Notificaciones (1.11.0): al abrir la app, si ya dio permiso, se renueva la suscripción en silencio.
  useEffect(() => { if (registrado) mantenerSuscripcion(); }, [registrado]);

  // "Crear" solo aparece en los celulares aprobados (creadores y administrador). "Minutas", solo con permiso de
  // verlas (1.11.0, Josué: sin él la app es Himnario y Ajustes).
  const tabs = [
    ...(puedeEditar ? [{ path: '/crear', label: t.tab_create, icon: Plus }] : []),
    ...(puedeVerMinutas ? [{ path: '/minutas', label: t.tab_minutas, icon: BookOpen }] : []),
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
      <nav className="fixed bottom-0 left-0 right-0 bg-[hsl(var(--barra-fondo))] border-t border-[hsl(var(--barra-linea))] z-50" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="flex items-stretch h-16 max-w-lg mx-auto px-2">
          {tabs.map(tab => (
            <Pestana key={tab.path} activa={tab.path === "/" ? esDelHimnario(location.pathname) : location.pathname === tab.path} etiqueta={tab.label} Icono={tab.icon}
                     aviso={tab.path === '/settings' && pendientes > 0} onTocar={() => intentarSalir(() => irA(tab.path))} />
          ))}
        </div>
      </nav>
    </div>
  );
}
