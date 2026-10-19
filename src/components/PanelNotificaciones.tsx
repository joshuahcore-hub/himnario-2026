// ⋮ → Notificaciones (1.11.0, Josué). Va DENTRO del mismo panel que "Mi perfil" (MenuAcceso): así, desde aquí se
// puede pasar a "Registrarme" cambiando el contenido del panel, sin cerrar uno y abrir otro.
//  - Sin registrarse: explica que hay que registrarse (botón que lleva a Registrarme).
//  - Registrado: interruptor general (viene encendido) y, si está encendido, los tipos: el administrador uno por
//    acción; los demás solo "Nueva minuta publicada". Si este celular aún no dio permiso, botón "Permitir".
import { useEffect, useRef, useState } from 'react';
import { toast } from '@/lib/aviso';
import { BellOff, BellRing, UserRoundPlus } from 'lucide-react';
import Avisos from '@/components/Avisos';
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
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-100 ${activo ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow-sm"
              style={{ transform: activo ? 'translateX(16px)' : 'none', transition: 'transform 150ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </span>
    </button>
  );
}

// (1.17.8) Las preferencias quedan en memoria: la pestaña Ajustes se ve al instante (se actualizan por detrás).
let prefsGuardadas: Preferencias | null = null;
/** Se llama al abrir el menú ⋮: la pestaña Ajustes ya tiene sus datos al entrar. */
export const precargarPreferencias = () => leerPreferencias().then(p => { prefsGuardadas = p; }).catch(() => {});

function AjustesNotificaciones({ onRegistrarme }: { onRegistrarme: () => void }) {
  const { t } = useI18n();
  const { registrado } = useAcceso();
  const [prefs, setPrefsEstado] = useState<Preferencias | null>(prefsGuardadas);
  const setPrefs: typeof setPrefsEstado = v => setPrefsEstado(p => {
    const n = typeof v === 'function' ? (v as (x: Preferencias | null) => Preferencias | null)(p) : v;
    prefsGuardadas = n;
    return n;
  });
  const [permiso, setPermiso] = useState<EstadoPermiso>(permisoActual);

  useEffect(() => {
    if (!registrado) return;
    // Si ya se veían (guardadas), la respuesta solo las pone al día si no se tocó ningún interruptor mientras tanto.
    leerPreferencias().then(p => { if (!tocado.current) setPrefs(p); })
      .catch(e => { if (!prefsGuardadas) toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message); });
  }, [registrado, t]);

  const fallo = (e: any) => toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);

  // Cambia al instante; si el servidor falla, vuelve como estaba.
  // Cada toque cambia el interruptor AL INSTANTE y así queda (1.11.4, Josué: "certero"). Antes la respuesta del
  // servidor reemplazaba todo y, tocando varios seguidos, una respuesta vieja devolvía a otro interruptor ("amague").
  // Ahora la respuesta no se usa; los cambios se envían en orden y solo si uno falla se deshace ESE cambio.
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  const tocado = useRef(false);
  const aplicar = (p: Preferencias, c: { activas?: boolean; tipo?: string; activo?: boolean }): Preferencias => ({
    activas: c.activas ?? p.activas,
    tipos: p.tipos.map(x => (c.tipo !== undefined && x.tipo === c.tipo ? { ...x, activo: !!c.activo } : x)),
  });
  const cambiar = (cambios: { activas?: boolean; tipo?: string; activo?: boolean }) => {
    if (!prefs) return;
    tocado.current = true;
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
        {prefs.tipos.filter(x => !x.tipo.startsWith('espacio:')).map(x => (
          <Interruptor key={x.tipo} texto={t.notif_tipo[x.tipo] ?? x.tipo} activo={prefs.activas && x.activo}
                       onCambiar={() => cambiar({ tipo: x.tipo, activo: !x.activo })} />
        ))}
        {/* (1.20.4, Josué) De qué espacios (Batuco, Talca…) recibir los avisos de minutas. */}
        {prefs.tipos.some(x => x.tipo.startsWith('espacio:')) && (
          <p className="text-[11px] text-muted-foreground pt-2 pb-0.5">{t.notif_espacios}</p>
        )}
        {prefs.tipos.filter(x => x.tipo.startsWith('espacio:')).map(x => (
          <Interruptor key={x.tipo} texto={x.nombre ?? x.tipo} activo={prefs.activas && x.activo}
                       onCambiar={() => cambiar({ tipo: x.tipo, activo: !x.activo })} />
        ))}
      </div>
    </div>
  );
}

/** (1.15.0, Josué: opción A) Dos pestañas: "Avisos" (el historial de lo que te llegó; el admin, todas las acciones) y
 *  "Ajustes" (los interruptores). Ambas en una caja del MISMO alto: cambiar de pestaña no mueve el panel. Sin
 *  registrarse no hay pestañas (solo la invitación a registrarse). */
export default function PanelNotificaciones({ onRegistrarme, onIr, pestanaInicial = 'avisos' }: {
  onRegistrarme: () => void; onIr: () => void; pestanaInicial?: 'avisos' | 'ajustes';
}) {
  const { t } = useI18n();
  const { registrado } = useAcceso();
  const [pestana, setPestana] = useState(pestanaInicial);
  if (!registrado) return <AjustesNotificaciones onRegistrarme={onRegistrarme} />;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(['avisos', 'ajustes'] as const).map(p => (
          <button key={p} type="button" onClick={() => setPestana(p)}
                  className={`h-8 rounded-md text-xs font-semibold transition-colors duration-100 ${pestana === p ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
            {p === 'avisos' ? t.notif_tab_avisos : t.notif_tab_ajustes}
          </button>
        ))}
      </div>
      {/* (1.17.7, Josué) La barra de desplazamiento va bien a la derecha, separada de los interruptores. */}
      <div className="h-[min(56dvh,420px)] overflow-y-auto overscroll-contain -mr-4 pr-5 [scrollbar-width:thin]">
        {pestana === 'avisos' ? <Avisos onIr={onIr} /> : <AjustesNotificaciones onRegistrarme={onRegistrarme} />}
      </div>
    </div>
  );
}
