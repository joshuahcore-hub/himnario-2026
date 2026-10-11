// Tarjeta de Ajustes para pedir permiso de creador, ver el estado y (solo el admin) entrar a Administración.
import { useCallback, useRef, useState } from 'react';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Clock, KeyRound, Loader2, PenLine, RefreshCw, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COLORES, useAcceso } from '@/hooks/useAcceso';
import { ErrorDeRed } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { ChipAutor } from '@/components/Portada';

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

function FormNombreColor({ nombreInicial = '', colorInicial = COLORES[7], textoBoton, onEnviar, extra }: {
  nombreInicial?: string;
  colorInicial?: string;
  textoBoton: string;
  onEnviar: (nombre: string, color: string) => Promise<void>;
  extra?: React.ReactNode;
}) {
  const { t } = useI18n();
  const [nombre, setNombre] = useState(nombreInicial);
  const [color, setColor] = useState(colorInicial);
  const [enviando, setEnviando] = useState(false);

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
      <Button onClick={enviar} disabled={enviando} className="w-full gap-2">
        {enviando && <Loader2 size={16} className="animate-spin" />}
        {textoBoton}
      </Button>
    </div>
  );
}

export default function SeccionAcceso() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const acceso = useAcceso();
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [dialogoAdmin, setDialogoAdmin] = useState(false);
  const [dialogoSolicitud, setDialogoSolicitud] = useState(false);
  const [clave, setClave] = useState('');
  const tarjetaRef = useRef<HTMLDivElement>(null);
  useAlTocarFuera(tarjetaRef, editandoPerfil, useCallback(() => setEditandoPerfil(false), []));

  const autor = acceso.nombre && acceso.color ? { nombre: acceso.nombre, color: acceso.color } : null;

  let contenido: React.ReactNode;
  if (acceso.estado === 'ninguno' || acceso.estado === 'rechazado') {
    // Solo un botón; el nombre y el color se piden recién al tocarlo (Josué: el formulario abierto de entrada se veía raro).
    contenido = (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground">
          {acceso.estado === 'rechazado' ? t.access_rejected : t.access_intro}
        </p>
        <Button className="w-full h-10 text-sm" onClick={() => setDialogoSolicitud(true)}>{t.access_request}</Button>
      </div>
    );
  } else if (acceso.estado === 'pendiente') {
    contenido = (
      <div className="space-y-3">
        <p className="text-[11px] text-foreground flex items-start gap-1.5">
          <Clock size={14} className="text-amber-500 shrink-0 mt-px" />{t.access_pending}
        </p>
        {autor && <ChipAutor autor={autor} />}
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs" onClick={() => acceso.recargar()}>
          <RefreshCw size={12} />{t.access_check}
        </Button>
      </div>
    );
  } else if (acceso.estado === 'deshabilitado') {
    contenido = (
      <p className="text-[11px] text-foreground flex items-start gap-1.5">
        <ShieldX size={14} className="text-destructive shrink-0 mt-px" />{t.access_disabled}
      </p>
    );
  } else {
    contenido = editandoPerfil ? (
      <FormNombreColor
        nombreInicial={acceso.nombre}
        colorInicial={acceso.color}
        textoBoton={t.minutas_save}
        onEnviar={async (nombre, color) => { await acceso.actualizarPerfil({ nombre, color }); setEditandoPerfil(false); }}
      />
    ) : (
      <div className="space-y-3">
        <p className="text-[11px] text-foreground flex items-start gap-1.5">
          <ShieldCheck size={14} className="text-green-600 shrink-0 mt-px" />
          {acceso.esAdmin ? t.access_admin : t.access_approved}
        </p>
        <div className="flex items-center justify-between">
          {autor && <ChipAutor autor={autor} />}
          <button onClick={() => setEditandoPerfil(true)} className="text-[11px] text-primary flex items-center gap-1">
            <PenLine size={11} />{t.access_edit_profile}
          </button>
        </div>
        {acceso.esAdmin && (
          <Button className="w-full text-xs" onClick={() => navigate('/admin')}>{t.admin_title}</Button>
        )}
      </div>
    );
  }

  return (
    <>
      <div ref={tarjetaRef} className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <PenLine size={14} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">{t.access_title}</span>
        </div>
        {contenido}
      </div>

      {!acceso.esAdmin && (
        <button onClick={() => setDialogoAdmin(true)} className="w-full text-center text-[10px] text-muted-foreground/60 flex items-center justify-center gap-1">
          <KeyRound size={10} />{t.admin_activate}
        </button>
      )}

      {/* Pedir ser creador: nombre + color (tocar fuera cierra). */}
      <Dialog open={dialogoSolicitud} onOpenChange={setDialogoSolicitud}>
        {/* Sin foco automático: el teclado se abre solo al tocar el campo (regla de Josué). */}
        <DialogContent className="max-w-[340px] rounded-2xl" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-sm">{t.access_dialog_title}</DialogTitle>
            <DialogDescription className="text-[11px]">{t.access_dialog_text}</DialogDescription>
          </DialogHeader>
          <FormNombreColor
            nombreInicial={acceso.nombre}
            colorInicial={acceso.color}
            textoBoton={t.access_send}
            onEnviar={async (nombre, color) => { await acceso.solicitar(nombre, color); setDialogoSolicitud(false); }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialogoAdmin} onOpenChange={o => { setDialogoAdmin(o); if (!o) setClave(''); }}>
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
              setClave('');
              setDialogoAdmin(false);
              toast.success(t.admin_activated);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
