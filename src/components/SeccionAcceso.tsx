// Menú "⋮" arriba a la derecha de Ajustes con las opciones avanzadas de acceso (Josué, 1.4.0: no deben estar a la
// vista en Ajustes). Según quién sea:
//   visor (o rechazado) → "Solicitar ser creador" (panel de nombre y color)
//   solicitud enviada   → "Mi solicitud" (estado + Revisar estado)
//   creador aprobado    → "Mi perfil" (nombre y color; se pueden cambiar)
//   administrador       → "Mi perfil" y "Administración"
//   deshabilitado       → "Mi acceso" (aviso)
// "Activar como administrador" no aparece en ningún lado: se abre tocando 5 veces la versión en Ajustes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, EllipsisVertical, Loader2, PenLine, RefreshCw, Shield, ShieldCheck, ShieldX, UserRound, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COLORES, useAcceso } from '@/hooks/useAcceso';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';
import { ErrorDeRed } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { ChipAutor } from '@/components/Portada';

/** Evento para abrir "Activar como administrador" (Ajustes lo lanza al tocar 5 veces la versión). */
export const EVENTO_ACTIVAR_ADMIN = 'himnario-activar-admin';

function SelectorColor({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap justify-center gap-2.5">
      {COLORES.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-8 h-8 rounded-full transition-transform"
          style={{
            backgroundColor: c,
            transform: valor === c ? 'scale(1.2)' : 'scale(1)',
            boxShadow: valor === c ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}` : 'none',
          }}
          aria-label={c}
        />
      ))}
    </div>
  );
}

function FormNombreColor({ nombreInicial = '', colorInicial = COLORES[7], textoBoton, onEnviar, extra, soloSiCambia, onCancelar }: {
  nombreInicial?: string;
  colorInicial?: string;
  textoBoton: string;
  onEnviar: (nombre: string, color: string) => Promise<void>;
  extra?: React.ReactNode;
  /** Editar perfil: Guardar/Cancelar aparecen solo si cambió el nombre o el color (regla de Josué). */
  soloSiCambia?: boolean;
  onCancelar?: () => void;
}) {
  const { t } = useI18n();
  const [nombre, setNombre] = useState(nombreInicial);
  const [color, setColor] = useState(colorInicial);
  const [enviando, setEnviando] = useState(false);
  const cambio = nombre.trim() !== nombreInicial.trim() || color !== colorInicial;

  const enviar = async () => {
    if (!nombre.trim()) { toast.error(t.access_name_required); return; }
    setEnviando(true);
    try {
      await onEnviar(nombre.trim(), color);
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="space-y-3">
      {extra}
      <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder={t.setup_name_placeholder} maxLength={40} className="h-10 text-sm" />
      <p className="text-[11px] text-muted-foreground text-center">{t.setup_color}</p>
      <SelectorColor valor={color} onChange={setColor} />
      {(!soloSiCambia || cambio) && (
        <div className="flex gap-2 animate-in fade-in zoom-in-95 duration-200">
          {soloSiCambia && onCancelar && (
            <Button variant="outline" onClick={onCancelar} disabled={enviando} className="flex-1 h-10 text-sm">{t.minutas_cancel}</Button>
          )}
          <Button onClick={enviar} disabled={enviando} className="flex-1 h-10 text-sm gap-2">
            {enviando && <Loader2 size={16} className="animate-spin" />}
            {textoBoton}
          </Button>
        </div>
      )}
    </div>
  );
}

function OpcionMenu({ icono, texto, onClick }: { icono: React.ReactNode; texto: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3 h-10 text-sm text-foreground rounded-lg hover:bg-muted active:bg-muted transition-colors text-left">
      <span className="text-muted-foreground shrink-0">{icono}</span>{texto}
    </button>
  );
}

export default function MenuAcceso() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const acceso = useAcceso();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [dialogo, setDialogo] = useState<null | 'solicitud' | 'perfil' | 'admin'>(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [clave, setClave] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  useAlTocarFuera(menuRef, menuAbierto, useCallback(() => setMenuAbierto(false), []));

  useEffect(() => {
    const abrir = () => { if (!acceso.esAdmin) setDialogo('admin'); };
    window.addEventListener(EVENTO_ACTIVAR_ADMIN, abrir);
    return () => window.removeEventListener(EVENTO_ACTIVAR_ADMIN, abrir);
  }, [acceso.esAdmin]);

  const autor = acceso.nombre && acceso.color ? { nombre: acceso.nombre, color: acceso.color } : null;
  const abrir = (d: 'solicitud' | 'perfil') => { setMenuAbierto(false); setEditandoPerfil(false); setDialogo(d); };
  const cerrarDialogo = () => { setDialogo(null); setEditandoPerfil(false); setClave(''); };

  const opciones: React.ReactNode[] = [];
  if (acceso.estado === 'ninguno' || acceso.estado === 'rechazado') {
    opciones.push(<OpcionMenu key="sol" icono={<UserRoundPlus size={16} />} texto={t.access_request} onClick={() => abrir('solicitud')} />);
  } else if (acceso.estado === 'pendiente') {
    opciones.push(<OpcionMenu key="sol" icono={<Clock size={16} />} texto={t.access_my_request} onClick={() => abrir('perfil')} />);
  } else if (acceso.estado === 'deshabilitado') {
    opciones.push(<OpcionMenu key="acc" icono={<ShieldX size={16} />} texto={t.access_my_access} onClick={() => abrir('perfil')} />);
  } else {
    opciones.push(<OpcionMenu key="perfil" icono={<UserRound size={16} />} texto={t.access_my_profile} onClick={() => abrir('perfil')} />);
    if (acceso.esAdmin) {
      opciones.push(<OpcionMenu key="admin" icono={<Shield size={16} />} texto={t.admin_title}
        onClick={() => { setMenuAbierto(false); navigate('/admin'); }} />);
    }
  }

  // Contenido del panel "Mi solicitud / Mi perfil / Mi acceso".
  let perfil: React.ReactNode = null;
  if (acceso.estado === 'pendiente') {
    perfil = (
      <div className="space-y-3">
        <p className="text-xs text-foreground flex items-start gap-1.5">
          <Clock size={14} className="text-amber-500 shrink-0 mt-px" />{t.access_pending}
        </p>
        {autor && <ChipAutor autor={autor} />}
        <Button variant="outline" className="w-full h-10 gap-1.5 text-sm" onClick={() => acceso.recargar()}>
          <RefreshCw size={14} />{t.access_check}
        </Button>
      </div>
    );
  } else if (acceso.estado === 'deshabilitado') {
    perfil = (
      <p className="text-xs text-foreground flex items-start gap-1.5">
        <ShieldX size={14} className="text-destructive shrink-0 mt-px" />{t.access_disabled}
      </p>
    );
  } else if (acceso.estado === 'aprobado') {
    perfil = editandoPerfil ? (
      <FormNombreColor
        nombreInicial={acceso.nombre}
        colorInicial={acceso.color}
        textoBoton={t.minutas_save}
        soloSiCambia
        onCancelar={() => setEditandoPerfil(false)}
        onEnviar={async (nombre, color) => { await acceso.actualizarPerfil({ nombre, color }); setEditandoPerfil(false); }}
      />
    ) : (
      <div className="space-y-3">
        <p className="text-xs text-foreground flex items-start gap-1.5">
          <ShieldCheck size={14} className="text-green-600 shrink-0 mt-px" />
          {acceso.esAdmin ? t.access_admin : t.access_approved}
        </p>
        <div className="flex items-center justify-between">
          {autor && <ChipAutor autor={autor} />}
          <button onClick={() => setEditandoPerfil(true)} className="text-xs text-primary flex items-center gap-1">
            <PenLine size={12} />{t.access_edit_profile}
          </button>
        </div>
      </div>
    );
  }

  const tituloPerfil = acceso.estado === 'pendiente' ? t.access_my_request
    : acceso.estado === 'deshabilitado' ? t.access_my_access : t.access_my_profile;

  return (
    <>
      {/* ⋮ y su menú desplegable (tocar fuera lo cierra). */}
      <div ref={menuRef} className="relative">
        <button onClick={() => setMenuAbierto(a => !a)} className="tap-btn p-2 -mr-2 text-muted-foreground" aria-label={t.settings_more}>
          <EllipsisVertical size={20} />
        </button>
        {menuAbierto && (
          <div className="absolute right-0 top-full mt-1 z-30 min-w-[210px] rounded-xl border border-border bg-card p-1 shadow-xl origin-top-right animate-in fade-in zoom-in-95 duration-150">
            {opciones}
          </div>
        )}
      </div>

      {/* Pedir ser creador: nombre + color (tocar fuera cierra; sin foco automático: no abrir el teclado solo). */}
      <Dialog open={dialogo === 'solicitud'} onOpenChange={o => { if (!o) cerrarDialogo(); }}>
        <DialogContent className="max-w-[340px] rounded-2xl" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-sm">{t.access_dialog_title}</DialogTitle>
            <DialogDescription className="text-[11px]">
              {acceso.estado === 'rechazado' ? t.access_rejected : t.access_dialog_text}
            </DialogDescription>
          </DialogHeader>
          <FormNombreColor
            nombreInicial={acceso.nombre}
            colorInicial={acceso.color}
            textoBoton={t.access_send}
            onEnviar={async (nombre, color) => { await acceso.solicitar(nombre, color); cerrarDialogo(); }}
          />
        </DialogContent>
      </Dialog>

      {/* Mi solicitud / Mi perfil / Mi acceso. */}
      <Dialog open={dialogo === 'perfil'} onOpenChange={o => { if (!o) cerrarDialogo(); }}>
        <DialogContent className="max-w-[340px] rounded-2xl" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-sm">{tituloPerfil}</DialogTitle>
          </DialogHeader>
          {perfil}
        </DialogContent>
      </Dialog>

      {/* Activar como administrador (escondido: 5 toques en la versión). */}
      <Dialog open={dialogo === 'admin'} onOpenChange={o => { if (!o) cerrarDialogo(); }}>
        <DialogContent className="max-w-[340px] rounded-2xl" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-sm">{t.admin_activate}</DialogTitle>
          </DialogHeader>
          <FormNombreColor
            nombreInicial={acceso.nombre}
            colorInicial={acceso.color}
            textoBoton={t.admin_activate_button}
            extra={
              <Input type="password" value={clave} onChange={e => setClave(e.target.value)} placeholder={t.admin_key_placeholder}
                     autoComplete="off" className="h-10 text-sm" />
            }
            onEnviar={async (nombre, color) => {
              await acceso.activarAdmin(clave, nombre, color);
              cerrarDialogo();
              toast.success(t.admin_activated);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
