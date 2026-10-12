import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, RefreshCw, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChipAutor } from '@/components/Portada';
import { api, ErrorDeRed } from '@/lib/api';
import { refrescarMinutas } from '@/lib/minutaCache';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';

interface DispositivoAdmin {
  id: string;
  nombre: string;
  color: string;
  rol: 'creador' | 'admin';
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'deshabilitado';
  creado: string;
  minutas: number;
  yo: boolean;
}

interface EntradaHistorial {
  id: number;
  minuta_id: string;
  accion: 'creada' | 'editada' | 'borrada' | 'restaurada' | 'publicada' | 'privada' | 'duplicada';
  titulo: string | null;
  fecha: string;
  nombre: string | null;
  color: string | null;
  borrada: number | null;
}

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function Admin() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { esAdmin } = useAcceso();
  // La pestaña va en la dirección (?ver=historial): al recargar se queda donde estaba (antes volvía a Personas).
  const [parametros, setParametros] = useSearchParams();
  const pestana: 'personas' | 'historial' = parametros.get('ver') === 'historial' ? 'historial' : 'personas';
  const setPestana = (p: 'personas' | 'historial') =>
    setParametros(p === 'historial' ? { ver: 'historial' } : {}, { replace: true });
  const [dispositivos, setDispositivos] = useState<DispositivoAdmin[]>([]);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [cargando, setCargando] = useState(false);
  const [iaCreadores, setIaCreadores] = useState<boolean | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [d, h, c] = await Promise.all([
        api<DispositivoAdmin[]>('admin/dispositivos'),
        api<EntradaHistorial[]>('admin/historial'),
        api<{ ia_creadores: boolean }>('admin/config'),
      ]);
      setDispositivos(d);
      setHistorial(h);
      setIaCreadores(c.ia_creadores);
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
    } finally {
      setCargando(false);
    }
  }, [t]);

  useEffect(() => { if (esAdmin) cargar(); }, [esAdmin, cargar]);

  const cambiarEstado = async (d: DispositivoAdmin, estado: DispositivoAdmin['estado']) => {
    try {
      await api(`admin/dispositivos/${d.id}`, { metodo: 'PATCH', datos: { estado } });
      setDispositivos(prev => prev.map(x => (x.id === d.id ? { ...x, estado } : x)));
    } catch (e: any) {
      toast.error(e.message);
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

  const restaurar = async (minutaId: string) => {
    try {
      await api(`admin/restaurar/${minutaId}`, { metodo: 'POST' });
      await refrescarMinutas();
      toast.success(t.admin_restored);
      cargar();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

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
  const etiquetaAccion: Record<EntradaHistorial['accion'], string> = {
    creada: t.admin_action_created,
    editada: t.admin_action_edited,
    borrada: t.admin_action_deleted,
    restaurada: t.admin_action_restored,
    publicada: t.admin_action_published,
    privada: t.admin_action_private,
    duplicada: t.admin_action_duplicated,
  };

  const pendientes = dispositivos.filter(d => d.estado === 'pendiente');
  const resto = dispositivos.filter(d => d.estado !== 'pendiente');

  const tarjeta = (d: DispositivoAdmin) => (
    <div key={d.id} className="bg-card rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <ChipAutor autor={{ nombre: d.nombre, color: d.color }} />
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${colorEstado[d.estado]}`}>
          {d.rol === 'admin' ? t.admin_role_admin : etiquetaEstado[d.estado]}
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground">
        {t.admin_requested} {fechaHora(d.creado)} · {d.minutas} {t.minutas_title.toLowerCase()}
        {d.yo && ` · ${t.admin_this_device}`}
      </p>
      {!d.yo && (
        <div className="flex gap-2">
          {d.estado === 'pendiente' && (
            <>
              <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => cambiarEstado(d, 'aprobado')}>{t.admin_approve}</Button>
              <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => cambiarEstado(d, 'rechazado')}>{t.admin_reject}</Button>
            </>
          )}
          {d.estado === 'aprobado' && (
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs text-destructive" onClick={() => cambiarEstado(d, 'deshabilitado')}>{t.admin_disable}</Button>
          )}
          {(d.estado === 'deshabilitado' || d.estado === 'rechazado') && (
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => cambiarEstado(d, 'aprobado')}>{t.admin_enable}</Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col w-full max-w-lg mx-auto" style={{ height: 'calc(100dvh - 4rem)' }}>
      <div className="flex items-center gap-3 px-5 pt-4 pb-3">
        <button onClick={() => navigate('/settings')} className="text-foreground p-1" aria-label={t.tab_settings}><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-foreground flex-1">{t.admin_title}</h1>
        <button onClick={cargar} className="p-2 text-muted-foreground" aria-label={t.minutas_refresh}>
          <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 px-5 pb-3">
        {(['personas', 'historial'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPestana(p)}
            className={`py-2 rounded-lg text-xs font-semibold ${pestana === p ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}
          >
            {p === 'personas' ? `${t.admin_people}${pendientes.length ? ` (${pendientes.length})` : ''}` : t.admin_history}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-6 space-y-2">
        {pestana === 'personas' ? (
          <>
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
          </>
        ) : (
          <>
            {historial.map(h => (
              <div key={h.id} className="bg-card rounded-xl border border-border px-3 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs text-foreground truncate">
                    <span className="font-semibold">{etiquetaAccion[h.accion]}</span> · {h.titulo || 'Minuta'}
                  </p>
                  <div className="flex items-center gap-2">
                    {h.nombre && h.color && <ChipAutor autor={{ nombre: h.nombre, color: h.color }} />}
                    <span className="text-[10px] text-muted-foreground">{fechaHora(h.fecha)}</span>
                  </div>
                </div>
                {h.accion === 'borrada' && h.borrada === 1 && (
                  <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => restaurar(h.minuta_id)}>
                    <RotateCcw size={11} />{t.admin_restore}
                  </Button>
                )}
              </div>
            ))}
            {historial.length === 0 && !cargando && <p className="text-xs text-muted-foreground text-center py-8">{t.notifications_empty}</p>}
          </>
        )}
      </div>
    </div>
  );
}
