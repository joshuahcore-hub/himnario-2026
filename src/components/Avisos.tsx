// ⋮ → Notificaciones → pestaña "Avisos" (1.15.0, Josué eligió la opción A: dos pestañas, Avisos y Ajustes). Es el
// HISTORIAL de cada uno:
//  - Administrador: todas las acciones sobre minutas (lo que antes estaba en Administración → Historial, con
//    "Restaurar" en las eliminadas) junto con sus otros avisos (registros, recordatorios, proyecciones).
//  - Los demás: lo que les llegó (nueva minuta, recordatorios). Tocar uno lleva a lo que avisa.
// Abrir esta pestaña marca todo como visto.
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/lib/aviso';
import { Globe, Loader2, Lock, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChipAutor } from '@/components/Portada';
import { api, ErrorDeRed } from '@/lib/api';
import { refrescarMinutas } from '@/lib/minutaCache';
import { marcarTodasVistas } from '@/lib/notificaciones';
import { revisarPendientes } from '@/hooks/usePendientes';
import { useAcceso } from '@/hooks/useAcceso';
import { useI18n } from '@/lib/i18n/index';

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
interface AvisoRecibido { id: number; tipo: string; titulo: string; texto: string; url: string; creada: string; vista: boolean }

// Acciones de minutas: al admin ya le llegan por el historial (no repetirlas con sus avisos).
const TIPOS_MINUTA = ['creada', 'editada', 'publicada', 'privada', 'duplicada', 'borrada', 'restaurada'];

type Fila =
  | { clase: 'historial'; fecha: string; h: EntradaHistorial }
  | { clase: 'aviso'; fecha: string; a: AvisoRecibido };

export default function Avisos({ onIr }: { onIr: () => void }) {
  const { t, locale } = useI18n();
  const { esAdmin } = useAcceso();
  const navigate = useNavigate();
  const [filas, setFilas] = useState<Fila[] | null>(null);

  const fechaHora = (iso: string) =>
    new Date(iso).toLocaleString(locale, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const cargar = useCallback(async () => {
    try {
      const [recibidos, historial] = await Promise.all([
        api<AvisoRecibido[]>(`notificaciones/lista?idioma=${locale}`),
        esAdmin ? api<EntradaHistorial[]>('admin/historial') : Promise.resolve([] as EntradaHistorial[]),
      ]);
      const lista: Fila[] = [
        ...historial.map(h => ({ clase: 'historial' as const, fecha: h.fecha, h })),
        ...recibidos.filter(a => !esAdmin || !TIPOS_MINUTA.includes(a.tipo)).map(a => ({ clase: 'aviso' as const, fecha: a.creada, a })),
      ];
      lista.sort((x, y) => (x.fecha < y.fecha ? 1 : x.fecha > y.fecha ? -1 : 0));
      setFilas(lista);
    } catch (e: any) {
      setFilas([]);
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
    }
  }, [esAdmin, locale, t]);

  useEffect(() => {
    cargar();
    marcarTodasVistas().then(() => revisarPendientes());
  }, [cargar]);

  // Restaurar (1.11.2, Josué): primero se elige "Solo para ti" (pasa a ser tuya y privada) o "Pública".
  const [aRestaurar, setARestaurar] = useState<string | null>(null);
  const [eligiendo, setEligiendo] = useState(false);
  const restaurar = async (minutaId: string, modo: 'mia' | 'publica') => {
    setEligiendo(false);
    try {
      await api(`admin/restaurar/${minutaId}`, { metodo: 'POST', datos: { modo } });
      await refrescarMinutas();
      toast.success(t.admin_restored);
      cargar();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const etiquetaAccion: Record<EntradaHistorial['accion'], string> = {
    creada: t.admin_action_created, editada: t.admin_action_edited, borrada: t.admin_action_deleted,
    restaurada: t.admin_action_restored, publicada: t.admin_action_published, privada: t.admin_action_private,
    duplicada: t.admin_action_duplicated,
  };

  // Mientras carga: el mismo alto (sin saltos), con un circulito al medio.
  if (!filas) return <div className="h-full flex items-center justify-center text-muted-foreground"><Loader2 size={18} className="animate-spin" /></div>;
  if (!filas.length) return <p className="text-xs text-muted-foreground text-center py-8">{t.notifications_empty}</p>;

  return (
    <>
      {/* Cada aviso separado por una línea delgada, sin recuadros (como el historial de antes). */}
      <div className="divide-y divide-border">
        {filas.map(f => f.clase === 'historial' ? (
          <div key={`h${f.h.id}`} className="px-1 py-2.5 flex items-center gap-2">
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="text-xs text-foreground truncate">
                <span className="font-semibold">{etiquetaAccion[f.h.accion]}</span> · {f.h.titulo || 'Minuta'}
              </p>
              <div className="flex items-center gap-2">
                {f.h.nombre && f.h.color && <ChipAutor autor={{ nombre: f.h.nombre, color: f.h.color }} />}
                <span className="text-[10px] text-muted-foreground">{fechaHora(f.h.fecha)}</span>
              </div>
            </div>
            {f.h.accion === 'borrada' && f.h.borrada === 1 && (
              <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={() => { setARestaurar(f.h.minuta_id); setEligiendo(true); }}>
                <RotateCcw size={11} />{t.admin_restore}
              </Button>
            )}
          </div>
        ) : (
          <button key={`a${f.a.id}`} type="button" className="w-full px-1 py-2.5 text-left space-y-0.5"
                  onClick={() => { if (f.a.url && !f.a.url.startsWith('/settings')) { onIr(); navigate(f.a.url); } }}>
            <p className="text-xs text-foreground flex items-center gap-1.5">
              {!f.a.vista && <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />}
              <span className="font-semibold">{f.a.titulo}</span>
            </p>
            <p className="text-xs text-foreground/85">{f.a.texto}</p>
            <p className="text-[10px] text-muted-foreground">{fechaHora(f.a.creada)}</p>
          </button>
        ))}
      </div>

      {/* Restaurar: ¿solo para ti o pública? (tocar fuera cancela). */}
      <Dialog open={eligiendo} onOpenChange={o => { if (!o) setEligiendo(false); }}>
        <DialogContent capa="z-[70]" className="max-w-[320px] rounded-2xl gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">{t.admin_restore_title}</DialogTitle>
            <DialogDescription className="text-xs text-center">{t.admin_restore_text}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => aRestaurar && restaurar(aRestaurar, 'mia')}
                    className="tap-btn rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-1.5 text-foreground">
              <Lock size={18} className="text-muted-foreground" />
              <span className="text-sm font-semibold">{t.admin_restore_mine}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{t.admin_restore_mine_desc}</span>
            </button>
            <button type="button" onClick={() => aRestaurar && restaurar(aRestaurar, 'publica')}
                    className="tap-btn rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-1.5 text-foreground">
              <Globe size={18} className="text-green-600 dark:text-green-400" />
              <span className="text-sm font-semibold">{t.admin_restore_public}</span>
              <span className="text-[10px] text-muted-foreground text-center leading-tight">{t.admin_restore_public_desc}</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
