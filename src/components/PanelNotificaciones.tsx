// ⋮ → Notificaciones (1.11.0, Josué). Va DENTRO del mismo panel que "Mi perfil" (MenuAcceso): así, desde aquí se
// puede pasar a "Registrarme" cambiando el contenido del panel, sin cerrar uno y abrir otro.
//  - Sin registrarse: explica que hay que registrarse (botón que lleva a Registrarme).
//  - Registrado: interruptor general (viene encendido) y, si está encendido, los tipos: el administrador uno por
//    acción; los demás solo "Nueva minuta publicada". Si este celular aún no dio permiso, botón "Permitir".
import { useEffect, useRef, useState } from 'react';
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
    <button type="button" onClick={onCambiar} className="tap-btn w-full min-h-[42px] flex items-center justify-between gap-3 py-2 text-left">
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
  // Cada toque cambia el interruptor AL INSTANTE y así queda (1.11.4, Josué: "certero"). Antes la respuesta del
  // servidor reemplazaba todo y, tocando varios seguidos, una respuesta vieja devolvía a otro interruptor ("amague").
  // Ahora la respuesta no se usa; los cambios se envían en orden y solo si uno falla se deshace ESE cambio.
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const aplicar = (p: Preferencias, c: { activas?: boolean; tipo?: string; activo?: boolean }): Preferencias => ({
    activas: c.activas ?? p.activas,
    tipos: p.tipos.map(x => (c.tipo !== undefined && x.tipo === c.tipo ? { ...x, activo: !!c.activo } : x)),
  });
  const cambiar = (cambios: { activas?: boolean; tipo?: string; activo?: boolean }) => {
    if (!prefs) return;
    const deshacer = cambios.tipo !== undefined
      ? { tipo: cambios.tipo, activo: !cambios.activo }
      : { activas: !cambios.activas };
    setPrefs(p => (p ? aplicar(p, cambios) : p));
    // La pregunta del sistema se lanza YA, dentro del toque (después de esperar al servidor podría no mostrarse).
    const permisoPedido = cambios.activas === true ? suscribir(true).catch(() => permisoActual()) : null;
    cola.current = cola.current.then(async () => {
      try {
        await cambiarPreferencias(cambios);
        if (permisoPedido) setPermiso(await permisoPedido);
        if (cambios.activas === false) await desuscribir();
      } catch (e) {
        setPrefs(p => (p ? aplicar(p, deshacer) : p));
        fallo(e);
      }
    });
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
      {/* Aviso de permiso del celular: con las notificaciones apagadas su espacio queda reservado (solo se desvanece):
          si desapareciera, el panel (centrado) se achicaría y todo se correría (1.11.4, Josué). */}
      {(permiso === 'pedir' || permiso === 'bloqueado') && (
        <div className="transition-opacity duration-200" style={{ opacity: prefs.activas ? 1 : 0, pointerEvents: prefs.activas ? 'auto' : 'none' }}
             aria-hidden={!prefs.activas}>
          {permiso === 'pedir' ? (
            <div className="rounded-lg bg-muted px-3 py-2 flex items-center gap-2">
              <p className="flex-1 text-[11px] text-muted-foreground">{t.notif_allow_text}</p>
              <Button className="h-8 px-3 text-xs gap-1.5" onClick={permitir} tabIndex={prefs.activas ? 0 : -1}><BellRing size={13} />{t.notif_allow}</Button>
            </div>
          ) : (
            <p className="rounded-lg bg-muted px-3 py-2 text-[11px] text-muted-foreground">{t.notif_blocked}</p>
          )}
        </div>
      )}
      {/* Los tipos SIEMPRE a la vista (1.11.4, Josué: al apagar no debe desaparecer nada ni moverse el panel). Con las
          notificaciones apagadas se ven todos apagados y atenuados, sin poder tocarlos; lo elegido en cada uno queda
          guardado y vuelve tal cual al encenderlas. */}
      <div className="border-t border-border pt-1.5 transition-opacity duration-200"
           style={{ opacity: prefs.activas ? 1 : 0.4, pointerEvents: prefs.activas ? 'auto' : 'none' }}
           aria-disabled={!prefs.activas}>
        <p className="text-[11px] text-muted-foreground pb-0.5">{t.notif_types}</p>
        {prefs.tipos.map(x => (
          <Interruptor key={x.tipo} texto={t.notif_tipo[x.tipo] ?? x.tipo} activo={prefs.activas && x.activo}
                       onCambiar={() => cambiar({ tipo: x.tipo, activo: !x.activo })} />
        ))}
      </div>
    </div>
  );
}
