// ⋮ → Notificaciones (1.11.0, Josué). Va DENTRO del mismo panel que "Mi perfil" (MenuAcceso): así, desde aquí se
// puede pasar a "Registrarme" cambiando el contenido del panel, sin cerrar uno y abrir otro.
//  - Sin registrarse: explica que hay que registrarse (botón que lleva a Registrarme).
//  - Registrado: interruptor general (viene encendido) y, si está encendido, los tipos: el administrador uno por
//    acción; los demás solo "Nueva minuta publicada". Si este celular aún no dio permiso, botón "Permitir".
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellOff, BellRing, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAcceso } from '@/hooks/useAcceso';
import { useI18n } from '@/lib/i18n/index';
import { ErrorDeRed } from '@/lib/api';
import {
  cambiarPreferencias, desuscribir, leerPreferencias, permisoActual, suscribir, type EstadoPermiso, type Preferencias,
} from '@/lib/notificaciones';

/** Interruptor propio (sin controles nativos), como los de Administración. */
export function Interruptor({ activo, onCambiar, texto, fuerte = false }: { activo: boolean; onCambiar: () => void; texto: string; fuerte?: boolean }) {
  return (
    <button type="button" onClick={onCambiar} className="w-full flex items-center justify-between gap-3 py-1.5 text-left">
      <span className={`text-xs text-foreground ${fuerte ? 'font-semibold' : ''}`}>{texto}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${activo ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow-sm"
              style={{ transform: activo ? 'translateX(16px)' : 'none', transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </span>
    </button>
  );
}

export default function PanelNotificaciones({ onRegistrarme }: { onRegistrarme: () => void }) {
  const { t } = useI18n();
  const { registrado } = useAcceso();
  const [prefs, setPrefs] = useState<Preferencias | null>(null);
  const [permiso, setPermiso] = useState<EstadoPermiso>(permisoActual);

  useEffect(() => {
    if (!registrado) return;
    leerPreferencias().then(setPrefs).catch(e => toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message));
  }, [registrado, t]);

  const fallo = (e: any) => toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);

  // Cambia al instante; si el servidor falla, vuelve como estaba.
  const cambiar = async (cambios: { activas?: boolean; tipo?: string; activo?: boolean }) => {
    if (!prefs) return;
    const antes = prefs;
    setPrefs({
      activas: cambios.activas ?? prefs.activas,
      tipos: prefs.tipos.map(x => (x.tipo === cambios.tipo ? { ...x, activo: !!cambios.activo } : x)),
    });
    try {
      setPrefs(await cambiarPreferencias(cambios));
      if (cambios.activas === true) setPermiso(await suscribir(true));
      if (cambios.activas === false) await desuscribir();
    } catch (e) {
      setPrefs(antes);
      fallo(e);
    }
  };

  const permitir = async () => {
    try { setPermiso(await suscribir(true)); } catch (e) { fallo(e); }
  };

  if (!registrado) {
    return (
      <div className="space-y-3">
        <p className="text-xs text-foreground flex items-start gap-1.5">
          <BellOff size={14} className="text-muted-foreground shrink-0 mt-px" />{t.notif_need_register}
        </p>
        <div className="flex justify-end">
          <Button className="h-9 px-4 text-sm gap-1.5" onClick={onRegistrarme}><UserRoundPlus size={14} />{t.access_request}</Button>
        </div>
      </div>
    );
  }
  if (permiso === 'no-soportado') {
    return <p className="text-xs text-foreground flex items-start gap-1.5"><BellOff size={14} className="text-muted-foreground shrink-0 mt-px" />{t.notif_not_supported}</p>;
  }

  // Mientras llegan las preferencias, el panel ya tiene su alto (sin saltos): un renglón invisible.
  if (!prefs) return <div className="h-[34px]" aria-hidden />;

  return (
    <div className="space-y-2">
      <Interruptor fuerte texto={t.notif_receive} activo={prefs.activas} onCambiar={() => cambiar({ activas: !prefs.activas })} />
      {prefs.activas && permiso === 'pedir' && (
        <div className="rounded-lg bg-muted px-3 py-2 flex items-center gap-2">
          <p className="flex-1 text-[11px] text-muted-foreground">{t.notif_allow_text}</p>
          <Button className="h-8 px-3 text-xs gap-1.5" onClick={permitir}><BellRing size={13} />{t.notif_allow}</Button>
        </div>
      )}
      {prefs.activas && permiso === 'bloqueado' && (
        <p className="rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">{t.notif_blocked}</p>
      )}
      {prefs.activas && (
        <div className="border-t border-border pt-1.5">
          <p className="text-[11px] text-muted-foreground pb-0.5">{t.notif_types}</p>
          {prefs.tipos.map(x => (
            <Interruptor key={x.tipo} texto={t.notif_tipo[x.tipo] ?? x.tipo} activo={x.activo}
                         onCambiar={() => cambiar({ tipo: x.tipo, activo: !x.activo })} />
          ))}
        </div>
      )}
    </div>
  );
}
