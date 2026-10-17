import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/lib/aviso';
import { ArrowLeft, EyeOff, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChipAutor } from '@/components/Portada';
import { api, ErrorDeRed } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';
import { revisarPendientes } from '@/hooks/usePendientes';
import { Input } from '@/components/ui/input';
import { agregarEspacio, eliminarEspacio, renombrarEspacio, useEspacios } from '@/lib/espacios';

interface DispositivoAdmin {
  id: string;
  nombre: string;
  color: string;
  rol: 'creador' | 'admin';
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'deshabilitado';
  creado: string;
  minutas: number;
  yo: boolean;
  /** (1.7.1) 0 = registrado sin crear minutas. */
  crea_minutas: number;
  /** (1.7.1) 1 = puede dejar recordatorios a otras personas. */
  recordatorios_otros: number;
  /** (1.10.0) 0 = no ve las minutas de otros. Por defecto 1. */
  ve_minutas: number;
  /** (1.12.0) 1 = puede generar la proyección. */
  proyeccion: number;
}

/** Interruptor propio (sin controles nativos), como el de la IA. */
function Interruptor({ activo, onCambiar, texto }: { activo: boolean; onCambiar: () => void; texto: string }) {
  return (
    <button type="button" onClick={onCambiar} className="tap-btn w-full min-h-[40px] flex items-center justify-between gap-3 py-1.5 text-left">
      <span className="text-xs text-foreground">{texto}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-200 ${activo ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
        <span className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background shadow-sm"
              style={{ transform: activo ? 'translateX(16px)' : 'none', transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      </span>
    </button>
  );
}

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const GUARDADO_PERSONAS = 'himnario_admin_personas';
const GUARDADO_IA = 'himnario_admin_ia';
function leerGuardado<T>(clave: string, porDefecto: T): T {
  try { const v = localStorage.getItem(clave); return v ? JSON.parse(v) as T : porDefecto; } catch { return porDefecto; }
}
function guardar(clave: string, valor: unknown) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin espacio: no importa */ }
}

export default function Admin() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { esAdmin } = useAcceso();
  // (1.15.0, Josué) Administración queda solo con Personas: el historial pasó a ⋮ → Notificaciones → Avisos.
  // Las notificaciones viejas que apuntan a ?ver=historial llevan ahí.
  const [parametros] = useSearchParams();
  // (1.19.18, Josué) Al recargar se ve AL INSTANTE la última lista guardada en el celular (antes la pantalla quedaba
  // vacía un momento hasta que respondía el servidor); se actualiza por detrás.
  const [dispositivos, setDispositivos] = useState<DispositivoAdmin[]>(() => leerGuardado(GUARDADO_PERSONAS, []));
  const [cargando, setCargando] = useState(false);
  const [iaCreadores, setIaCreadores] = useState<boolean | null>(() => leerGuardado(GUARDADO_IA, null));
  useEffect(() => { guardar(GUARDADO_PERSONAS, dispositivos); }, [dispositivos]);
  useEffect(() => { if (iaCreadores !== null) guardar(GUARDADO_IA, iaCreadores); }, [iaCreadores]);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [d, c] = await Promise.all([
        api<DispositivoAdmin[]>('admin/dispositivos'),
        api<{ ia_creadores: boolean }>('admin/config'),
      ]);
      setDispositivos(d);
      setIaCreadores(c.ia_creadores);
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { if (esAdmin) cargar(); }, [esAdmin, cargar]);
  // Quitar a una persona de la lista (1.11.0, Josué: registros repetidos). Mantener presionada su tarjeta → confirmar.
  // No se borra nada: sus minutas y recordatorios siguen; si vuelve a registrarse en ese celular, reaparece.
  const [aQuitar, setAQuitar] = useState<DispositivoAdmin | null>(null);
  const [confirmarQuitar, setConfirmarQuitar] = useState(false);
  const presion = useRef<{ x: number; y: number; timer: number } | null>(null);
  const mantener = (d: DispositivoAdmin) => d.yo ? {} : {
    onPointerDown: (e: React.PointerEvent) => {
      const timer = window.setTimeout(() => {
        presion.current = null;
        navigator.vibrate?.(15);
        setAQuitar(d);
        setConfirmarQuitar(true);
      }, 500);
      presion.current = { x: e.clientX, y: e.clientY, timer };
    },
    onPointerMove: (e: React.PointerEvent) => {
      const p = presion.current;
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) { window.clearTimeout(p.timer); presion.current = null; }
    },
    onPointerUp: () => { if (presion.current) { window.clearTimeout(presion.current.timer); presion.current = null; } },
    onPointerCancel: () => { if (presion.current) { window.clearTimeout(presion.current.timer); presion.current = null; } },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
  const quitar = async () => {
    const d = aQuitar;
    if (!d) return;
    setConfirmarQuitar(false);
    setDispositivos(prev => prev.filter(x => x.id !== d.id)); // al instante; si falla, vuelve
    try {
      await api(`admin/dispositivos/${d.id}`, { metodo: 'PATCH', datos: { oculta: true } });
      revisarPendientes();
    } catch (e: any) {
      setDispositivos(prev => [...prev, d]);
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
    }
  };

  const cambiarEstado = async (d: DispositivoAdmin, estado: DispositivoAdmin['estado']) => {
    try {
      await api(`admin/dispositivos/${d.id}`, { metodo: 'PATCH', datos: { estado } });
      setDispositivos(prev => prev.map(x => (x.id === d.id ? { ...x, estado } : x)));
      revisarPendientes(); // actualiza el punto de aviso de Ajustes
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // (1.7.1) Permisos por persona: crear minutas y dejar recordatorios a otros. Cambia al instante; si falla, vuelve.
  const cambiarPermiso = async (d: DispositivoAdmin, campo: 'crea_minutas' | 'recordatorios_otros' | 've_minutas' | 'proyeccion') => {
    const valor = d[campo] ? 0 : 1;
    // Hay un orden (1.12.0, Josué): no se puede crear minutas sin verlas. Encender "Crear" enciende "Ver";
    // apagar "Ver" apaga "Crear". El servidor aplica la misma regla.
    const cambios: Partial<DispositivoAdmin> = { [campo]: valor };
    if (campo === 'crea_minutas' && valor) cambios.ve_minutas = 1;
    if (campo === 've_minutas' && !valor) cambios.crea_minutas = 0;
    const antes = { crea_minutas: d.crea_minutas, ve_minutas: d.ve_minutas, [campo]: d[campo] };
    setDispositivos(prev => prev.map(x => (x.id === d.id ? { ...x, ...cambios } : x)));
    try {
      await api(`admin/dispositivos/${d.id}`, { metodo: 'PATCH', datos: { [campo]: !!valor } });
    } catch (e: any) {
      setDispositivos(prev => prev.map(x => (x.id === d.id ? { ...x, ...antes } : x)));
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
    }
  };

  const cambiarIaCreadores = async (valor: boolean) => {
    setIaCreadores(valor);
    try {
      const c = await api<{ ia_creadores: boolean }>('admin/config', { metodo: 'PATCH', datos: { ia_creadores: valor } });
      setIaCreadores(c.ia_creadores);
    } catch (e: any) {
      setIaCreadores(!valor);
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
    }
  };

  if (parametros.get('ver') === 'historial') return <Navigate to="/settings?avisos=1" replace />;
  if (!esAdmin) {
    return <div className="p-6 text-center text-sm text-muted-foreground">{t.admin_only}</div>;
  }

  const etiquetaEstado: Record<DispositivoAdmin['estado'], string> = {
    pendiente: t.admin_state_pending,
    aprobado: t.admin_state_approved,
    rechazado: t.admin_state_rejected,
    deshabilitado: t.admin_state_disabled,
  };
  const colorEstado: Record<DispositivoAdmin['estado'], string> = {
    pendiente: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
    aprobado: 'bg-green-600/15 text-green-700 dark:text-green-400',
    rechazado: 'bg-muted text-muted-foreground',
    deshabilitado: 'bg-destructive/15 text-destructive',
  };
  const pendientes = dispositivos.filter(d => d.estado === 'pendiente');
  const resto = dispositivos.filter(d => d.estado !== 'pendiente');

  const tarjeta = (d: DispositivoAdmin) => (
    <div key={d.id} {...mantener(d)} className="bg-card rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <ChipAutor autor={{ nombre: d.nombre, color: d.color }} />
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorEstado[d.estado]}`}>
          {d.rol === 'admin' ? t.admin_role_admin
            // Crear minutas o dejar recordatorios a otros = "Creador"; solo "Ver minutas" = "Visor" (1.12.0, Josué);
            // sin ningún permiso, "Registrado".
            : d.estado === 'aprobado'
              ? (d.crea_minutas || d.recordatorios_otros ? t.admin_role_creator : d.ve_minutas ? t.admin_role_viewer : t.admin_registered)
              : etiquetaEstado[d.estado]}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {/* Sin contador de minutas (1.11.0, Josué: no es necesario). */}
        {t.admin_requested} {fechaHora(d.creado)}
        {d.yo && ` · ${t.admin_this_device}`}
      </p>
      {/* Permisos (1.7.1): la persona se registra sola; aquí se le activa crear minutas o dejar recordatorios a otros. */}
      {!d.yo && d.rol !== 'admin' && d.estado === 'aprobado' && (
        <div className="border-t border-border pt-1.5 space-y-0.5">
          {/* (1.10.0, Josué) Ver minutas: encendido al registrarse; el admin lo puede apagar. */}
          <Interruptor texto={t.admin_can_view} activo={d.ve_minutas !== 0} onCambiar={() => cambiarPermiso(d, 've_minutas')} />
          <Interruptor texto={t.admin_can_create} activo={!!d.crea_minutas} onCambiar={() => cambiarPermiso(d, 'crea_minutas')} />
          <Interruptor texto={t.admin_can_remind} activo={!!d.recordatorios_otros} onCambiar={() => cambiarPermiso(d, 'recordatorios_otros')} />
          <Interruptor texto={t.admin_can_project} activo={!!d.proyeccion} onCambiar={() => cambiarPermiso(d, 'proyeccion')} />
        </div>
      )}
      {/* (1.7.8, Josué) Sin "Deshabilitar/Habilitar": cada persona se maneja solo con los dos interruptores. Solo las
          solicitudes antiguas (de antes de 1.7.1) conservan Aprobar / Rechazar. */}
      {!d.yo && d.estado === 'pendiente' && (
        <div className="flex justify-end gap-2">
          <Button size="sm" className="h-8 px-4 text-xs" onClick={() => cambiarEstado(d, 'aprobado')}>{t.admin_approve}</Button>
          <Button size="sm" variant="outline" className="h-8 px-4 text-xs" onClick={() => cambiarEstado(d, 'rechazado')}>{t.admin_reject}</Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto" style={{ height: 'calc(100dvh - var(--barra))' }}>
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => navigate('/settings')} className="text-foreground p-1" aria-label={t.tab_settings}><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-foreground flex-1">{t.admin_title}</h1>
        <button onClick={cargar} className="p-2 text-muted-foreground" aria-label={t.minutas_refresh}>
          <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
        <SeccionEspacios />
        {iaCreadores !== null && (
          <button
            onClick={() => cambiarIaCreadores(!iaCreadores)}
            className="w-full bg-card rounded-xl border border-border p-3 flex items-center gap-3 text-left mb-2 animate-in fade-in"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-muted-foreground">{t.admin_ia_title}</p>
              <p className="text-sm text-foreground">{t.admin_ia_creators}</p>
              <p className="text-[10px] text-muted-foreground">{t.admin_ia_creators_desc}</p>
            </div>
            {/* Interruptor propio (sin controles nativos) */}
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${iaCreadores ? 'bg-primary' : 'bg-muted-foreground/30'}`}>
              <span
                className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow-sm"
                style={{ transform: iaCreadores ? 'translateX(20px)' : 'none', transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)' }}
              />
            </span>
          </button>
        )}
        {pendientes.length > 0 && <p className="text-[11px] font-semibold text-muted-foreground pt-1">{t.admin_pending_requests}</p>}
        {pendientes.map(tarjeta)}
        {resto.length > 0 && <p className="text-[11px] font-semibold text-muted-foreground pt-3">{t.admin_people}</p>}
        {resto.map(tarjeta)}
        {dispositivos.length === 0 && !cargando && <p className="text-xs text-muted-foreground text-center py-8">{t.admin_no_people}</p>}
      </div>

      {/* Quitar de la lista (tocar fuera cancela). El aviso se fija al abrir (aQuitar no cambia al cerrar). */}
      <Dialog open={confirmarQuitar} onOpenChange={o => { if (!o) setConfirmarQuitar(false); }}>
        <DialogContent className="max-w-[320px] rounded-2xl gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">{t.admin_hide_title(aQuitar?.nombre ?? '')}</DialogTitle>
            <DialogDescription className="text-xs text-center">{t.admin_hide_text}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2">
            <Button variant="outline" className="h-9 px-4 text-sm" onClick={() => setConfirmarQuitar(false)}>{t.rec_cancel}</Button>
            <Button variant="destructive" className="h-9 px-4 text-sm gap-1.5" onClick={quitar}><EyeOff size={14} />{t.admin_hide}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** (1.16.0 / 1.17.7, Josué) Espacios de minutas: se ven los espacios y un "+". Tocar un espacio abre un panel para
 *  cambiarle el nombre o eliminarlo (el basurero pide confirmación: sus minutas pasan al primero de los que quedan).
 *  El "+" abre el panel para crear uno con su nombre. */
function SeccionEspacios() {
  const { t } = useI18n();
  const { espacios } = useEspacios();
  // Panel: null cerrado; 'nuevo' = crear; un id = editar ese.
  const [panel, setPanel] = useState<string | null>(null);
  const [vista, setVista] = useState<'editar' | 'confirmar'>('editar');
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const elegido = espacios.find(e => e.id === panel) ?? null;
  // El panel se fija al ABRIR (no cambia mientras se cierra).
  const abrir = (id: string) => { setPanel(id); setVista('editar'); setGuardando(false); setNombre(id === 'nuevo' ? '' : espacios.find(e => e.id === id)?.nombre ?? ''); };
  const fallo = (e: any) => toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
  const guardar = async () => {
    const n = nombre.trim();
    if (!n || guardando || !panel) return;
    setGuardando(true);
    try { if (panel === 'nuevo') await agregarEspacio(n); else await renombrarEspacio(panel, n); setPanel(null); }
    catch (e) { fallo(e); } finally { setGuardando(false); }
  };
  const eliminar = async () => {
    if (!elegido || guardando) return;
    setGuardando(true);
    try { await eliminarEspacio(elegido.id); setPanel(null); toast.success(t.admin_espacio_eliminado); }
    catch (e) { fallo(e); } finally { setGuardando(false); }
  };
  const cambio = panel === 'nuevo' ? !!nombre.trim() : !!nombre.trim() && nombre.trim() !== elegido?.nombre;
  return (
    <div className="bg-card rounded-xl border border-border p-3 space-y-2 mb-2">
      <p className="text-[11px] font-semibold text-muted-foreground">{t.admin_espacios}</p>
      <div className="flex flex-wrap gap-1.5">
        {espacios.map(e => (
          <button key={e.id} type="button" onClick={() => abrir(e.id)}
                  className="tap-btn rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground">{e.nombre}</button>
        ))}
        <button type="button" onClick={() => abrir('nuevo')} aria-label={t.admin_espacio_agregar}
                className="tap-btn w-8 h-8 rounded-full border border-dashed border-border flex items-center justify-center text-muted-foreground">
          <Plus size={15} />
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground">{t.admin_espacio_texto}</p>

      <Dialog open={panel !== null} onOpenChange={o => { if (!o && !guardando) setPanel(null); }}>
        <DialogContent className="max-w-[320px] rounded-2xl gap-3" onOpenAutoFocus={e => e.preventDefault()}>
          {vista === 'confirmar' && elegido ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{t.admin_espacio_eliminar_titulo(elegido.nombre)}</DialogTitle>
                <DialogDescription className="text-xs text-center">
                  {t.admin_espacio_eliminar_texto(espacios.find(e => e.id !== elegido.id)?.nombre ?? '')}
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-center gap-2">
                <Button variant="outline" className="h-9 px-4 text-sm" onClick={() => setVista('editar')}>{t.rec_cancel}</Button>
                <Button variant="destructive" className="h-9 px-4 text-sm gap-1.5" onClick={eliminar} style={{ opacity: guardando ? 0.6 : 1 }}>
                  <Trash2 size={14} />{t.minutas_delete}
                </Button>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">{panel === 'nuevo' ? t.admin_espacio_nuevo_titulo : t.admin_espacio_editar_titulo}</DialogTitle>
                <DialogDescription className="sr-only">{t.admin_espacios}</DialogDescription>
              </DialogHeader>
              <Input value={nombre} onChange={e => setNombre(e.target.value.slice(0, 30))} placeholder={t.admin_espacio_nuevo}
                     onKeyDown={e => { if (e.key === 'Enter') guardar(); }} className="h-10 text-sm" />
              <div className="flex items-center gap-2">
                {/* Basurero dentro del panel: pide confirmación (no se puede eliminar el único espacio). */}
                {panel !== 'nuevo' && espacios.length > 1 && (
                  <button type="button" onClick={() => setVista('confirmar')} aria-label={t.minutas_delete}
                          className="tap-btn w-9 h-9 rounded-full flex items-center justify-center text-destructive hover:bg-destructive/10">
                    <Trash2 size={16} />
                  </button>
                )}
                <div className="flex-1" />
                <Button variant="ghost" className="h-9 px-4 text-sm text-muted-foreground" onClick={() => setPanel(null)}>{t.rec_cancel}</Button>
                <Button className="h-9 px-4 text-sm gap-1" onClick={guardar} disabled={!cambio} style={{ opacity: guardando ? 0.6 : undefined }}>
                  {guardando && <Loader2 size={14} className="animate-spin" />}{panel === 'nuevo' ? t.admin_espacio_agregar : t.minutas_save}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
