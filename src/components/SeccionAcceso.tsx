// Menú "⋮" arriba a la derecha de Ajustes con las opciones avanzadas de acceso (Josué, 1.4.0: no deben estar a la
// vista en Ajustes). El menú es igual para todos: "Mi perfil" (y "Administración" solo el admin). Mi perfil muestra:
//   visor (o rechazado) → "Eres visor: …" + botón "Registrarme" (panel de nombre y color). Desde 1.7.1 se queda
//                         registrado al instante (sin solicitud): ya le pueden dejar recordatorios.
//   solicitud vieja     → aviso de espera + "Revisar estado" (antes de 1.7.1)
//   registrado          → "Estás registrado…" + nombre y color; creador → "Eres creador: …" (lo activa el admin)
//   administrador       → "Eres administrador…" + nombre y color
//   deshabilitado       → aviso
// "Activar como administrador" no aparece en ningún lado: se abre tocando 5 veces la versión en Ajustes.
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from '@/lib/aviso';
import { Bell, Check, Clock, EllipsisVertical, Eye, Loader2, PenLine, RefreshCw, Shield, ShieldCheck, ShieldX, UserRound, UserRoundPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { COLORES, useAcceso } from '@/hooks/useAcceso';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';
import { ErrorDeRed } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { ChipAutor } from '@/components/Portada';
import { usePendientes, usePendientesDetalle } from '@/hooks/usePendientes';
import PanelNotificaciones, { precargarPreferencias } from '@/components/PanelNotificaciones';
import { precargarAvisos } from '@/components/Avisos';
import { permisoActual, suscribir } from '@/lib/notificaciones';

/** Evento para abrir "Activar como administrador" (Ajustes lo lanza al tocar 5 veces la versión). */
export const EVENTO_ACTIVAR_ADMIN = 'himnario-activar-admin';

// Colores en una grilla pareja de 2 filas × 5 (antes 7 + 3 se veía desordenado), círculos chicos;
// el elegido lleva un ✓ y un anillo suave.
function SelectorColor({ valor, onChange }: { valor: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-3 w-fit mx-auto">
      {COLORES.map(c => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-shadow duration-200"
          style={{ backgroundColor: c, boxShadow: valor === c ? `0 0 0 2px hsl(var(--background)), 0 0 0 3.5px ${c}` : 'none' }}
          aria-label={c}
        >
          {valor === c && <Check size={14} strokeWidth={3} className="text-white drop-shadow animate-in zoom-in-50 duration-150" />}
        </button>
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
      {/* Botones compactos a la derecha, como los de un aviso (Josué: a todo lo ancho se veían grandes).
          Con soloSiCambia el espacio queda SIEMPRE reservado y los botones solo se desvanecen: si aparecieran de la
          nada, el panel (centrado en la pantalla) crecería y se movería bajo el dedo mientras se elige el color. */}
      {(() => {
        const visibles = !soloSiCambia || cambio;
        return (
          <div className={`flex justify-end gap-2 pt-1 transition-opacity duration-200 ${visibles ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
               aria-hidden={!visibles}>
            {soloSiCambia && onCancelar && (
              <Button variant="ghost" onClick={onCancelar} disabled={enviando || !visibles} tabIndex={visibles ? 0 : -1}
                className="h-9 px-4 text-sm text-muted-foreground">{t.minutas_cancel}</Button>
            )}
            <Button onClick={enviar} disabled={enviando || !visibles} tabIndex={visibles ? 0 : -1} className="h-9 px-4 text-sm gap-1.5">
              {enviando && <Loader2 size={14} className="animate-spin" />}
              {textoBoton}
            </Button>
          </div>
        );
      })()}
    </div>
  );
}

function OpcionMenu({ icono, texto, onClick, aviso = 0 }: { icono: React.ReactNode; texto: string; onClick: () => void; aviso?: number }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-2.5 px-3 h-10 text-sm text-foreground rounded-lg hover:bg-muted active:bg-muted transition-colors text-left">
      <span className="text-muted-foreground shrink-0">{icono}</span>
      <span className="flex-1">{texto}</span>
      {aviso > 0 && <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-semibold flex items-center justify-center">{aviso}</span>}
    </button>
  );
}

export default function MenuAcceso() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const acceso = useAcceso();
  const pendientes = usePendientes();
  const { solicitudes, sinVer } = usePendientesDetalle();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [dialogo, setDialogo] = useState<null | 'perfil' | 'notif' | 'admin'>(null);
  const [editandoPerfil, setEditandoPerfil] = useState(false);
  const [clave, setClave] = useState('');
  // Visor pidiendo ser creador: el MISMO panel "Mi perfil" cambia a nombre + color (antes se cerraba un panel y
  // se abría otro, y por un instante se juntaban los dos fondos oscuros).
  const [pidiendo, setPidiendo] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // (1.20.3, Josué) El menú va en un portal POR ENCIMA del velo oscuro (antes quedaba debajo y se veía oscurecido).
  const panelRef = useRef<HTMLDivElement>(null);
  const [posMenu, setPosMenu] = useState<{ top: number; right: number } | null>(null);
  useAlTocarFuera(menuRef, menuAbierto, useCallback(() => setMenuAbierto(false), []), panelRef);

  useEffect(() => {
    const abrir = () => { if (!acceso.esAdmin) { setClave(''); setDialogo('admin'); } };
    window.addEventListener(EVENTO_ACTIVAR_ADMIN, abrir);
    return () => window.removeEventListener(EVENTO_ACTIVAR_ADMIN, abrir);
  }, [acceso.esAdmin]);

  const autor = acceso.nombre && acceso.color ? { nombre: acceso.nombre, color: acceso.color } : null;
  // Los paneles se reinician al ABRIR, nunca al cerrar: si se reiniciaran al cerrar, durante el desvanecimiento se
  // vería por un instante la pantalla anterior (p. ej. "Mi perfil" al tocar fuera mientras se elige color; Josué).
  // vista: qué muestra el panel. Se fija al abrir y NO cambia al cerrar (si no, al desvanecerse asomaría otra cosa).
  const [vista, setVista] = useState<'perfil' | 'notif'>('perfil');
  const abrir = (d: 'perfil' | 'notif') => { setMenuAbierto(false); setEditandoPerfil(false); setPidiendo(false); setVista(d); setDialogo(d); };
  // (1.15.0) Una notificación del administrador lleva a /settings?avisos=1: abre Notificaciones en "Avisos".
  const [parametros, setParametros] = useSearchParams();
  useEffect(() => {
    if (parametros.get('avisos') !== '1') return;
    setParametros({}, { replace: true });
    abrir('notif');
  }, [parametros]); // eslint-disable-line react-hooks/exhaustive-deps
  const cerrarDialogo = () => setDialogo(null);

  // Menú igual para todos (Josué: "mientras menos enredo, mejor"): "Mi perfil" y "Notificaciones" (1.11.0) siempre;
  // "Administración" solo el admin, al final.
  const opciones: React.ReactNode[] = [
    <OpcionMenu key="perfil" icono={<UserRound size={16} />} texto={t.access_my_profile} onClick={() => abrir('perfil')} />,
    <OpcionMenu key="notif" icono={<Bell size={16} />} texto={t.notif_title} aviso={sinVer} onClick={() => abrir('notif')} />,
  ];
  if (acceso.esAdmin) {
    opciones.push(<OpcionMenu key="admin" icono={<Shield size={16} />} texto={t.admin_title} aviso={solicitudes}
      onClick={() => { setMenuAbierto(false); navigate('/admin'); }} />);
  }

  // Contenido de "Mi perfil" según quién sea.
  let perfil: React.ReactNode = null;
  if ((acceso.estado === 'ninguno' || acceso.estado === 'rechazado') && pidiendo) {
    // Pedir ser creador: nombre + color. Al enviar, el panel pasa solo a "Tu solicitud está enviada".
    perfil = (
      <div className="space-y-3">
        <p className="text-[11px] text-muted-foreground">{t.access_dialog_text}</p>
        <FormNombreColor
          nombreInicial={acceso.nombre}
          colorInicial={acceso.color}
          textoBoton={t.access_send}
          onEnviar={async (nombre, color) => {
            // Notificaciones activadas por defecto (1.11.0): la pregunta del sistema se lanza YA (aún dentro del
            // toque; después de esperar al servidor el navegador podría no mostrarla) y se suscribe al quedar registrado.
            const permiso = permisoActual() === 'pedir' ? Notification.requestPermission().catch(() => null) : null;
            await acceso.solicitar(nombre, color);
            setPidiendo(false);
            await permiso;
            suscribir(false).catch(() => {});
          }}
        />
      </div>
    );
  } else if (acceso.estado === 'ninguno' || acceso.estado === 'rechazado') {
    // Visor: qué puede hacer y, como paso siguiente, pedir ser creador.
    perfil = (
      <div className="space-y-3">
        <p className="text-xs text-foreground flex items-start gap-1.5">
          <Eye size={14} className="text-muted-foreground shrink-0 mt-px" />{t.access_viewer}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {acceso.estado === 'rechazado' ? t.access_rejected : t.access_want_create}
        </p>
        <div className="flex justify-end">
          <Button className="h-9 px-4 text-sm gap-1.5" onClick={() => setPidiendo(true)}>
            <UserRoundPlus size={14} />{t.access_request}
          </Button>
        </div>
      </div>
    );
  } else if (acceso.estado === 'pendiente') {
    perfil = (
      <div className="space-y-3">
        <p className="text-xs text-foreground flex items-start gap-1.5">
          <Clock size={14} className="text-amber-500 shrink-0 mt-px" />{t.access_pending}
        </p>
        <div className="flex items-center justify-between">
          {autor && <ChipAutor autor={autor} />}
          <Button variant="outline" className="h-9 px-4 gap-1.5 text-sm" onClick={() => acceso.recargar()}>
            <RefreshCw size={14} />{t.access_check}
          </Button>
        </div>
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
          {acceso.esAdmin ? t.access_admin : acceso.puedeEditar ? t.access_approved : acceso.puedeVerMinutas ? t.access_visor : t.access_registered}
        </p>
        {!acceso.esAdmin && acceso.puedeDejarAOtros && <p className="text-[11px] text-muted-foreground">{t.access_can_remind_others}</p>}
        <div className="flex items-center justify-between">
          {autor && <ChipAutor autor={autor} />}
          <button onClick={() => setEditandoPerfil(true)} className="text-xs text-primary flex items-center gap-1">
            <PenLine size={12} />{t.access_edit_profile}
          </button>
        </div>
      </div>
    );
  }


  return (
    <>
      {/* ⋮ y su menú desplegable (tocar fuera lo cierra). */}
      {/* Velo (1.12.1, Josué): con el menú abierto el resto de la pantalla se oscurece un poco, con suavidad. Siempre
          presente y solo cambia su opacidad (aparece y se va suave); no recibe toques (tocar fuera lo maneja
          useAlTocarFuera). Cubre también la barra de pestañas. */}
      {createPortal(
        <div aria-hidden className="fixed inset-0 z-[55] bg-black pointer-events-none"
             style={{ opacity: menuAbierto ? 0.28 : 0, transition: 'opacity 180ms ease-out' }} />,
        document.body,
      )}
      <div ref={menuRef} className="relative" data-menu-abierto={menuAbierto ? '' : undefined}>
        <button onClick={() => {
                  // (1.17.8) Al abrir el menú ya se traen los avisos y ajustes: Notificaciones se ve al instante.
                  if (!menuAbierto && acceso.registrado) { precargarAvisos(acceso.esAdmin, locale).catch(() => {}); precargarPreferencias(); }
                  if (!menuAbierto && menuRef.current) {
                    const r = menuRef.current.getBoundingClientRect();
                    setPosMenu({ top: r.bottom + 4, right: window.innerWidth - r.right });
                  }
                  setMenuAbierto(a => !a);
                }} className="tap-btn relative p-2 -mr-2 text-muted-foreground" aria-label={t.settings_more}>
          <EllipsisVertical size={20} />
          {pendientes > 0 && <span className="absolute top-1.5 right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-background" />}
        </button>
        {menuAbierto && posMenu && createPortal(
          <div ref={panelRef} className="fixed z-[56] min-w-[210px] rounded-xl border border-border bg-card p-1 shadow-xl origin-top-right animate-in fade-in zoom-in-95 duration-150"
               style={{ top: posMenu.top, right: posMenu.right }}>
            {opciones}
          </div>,
          document.body,
        )}
      </div>

      {/* Mi perfil (y, para el visor, pedir ser creador en el mismo panel). Tocar fuera cierra; sin foco
          automático: el teclado no se abre solo. */}
      <Dialog open={dialogo === 'perfil' || dialogo === 'notif'} onOpenChange={o => { if (!o) cerrarDialogo(); }}>
        <DialogContent className="max-w-[340px] rounded-2xl" onOpenAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-sm">{vista === 'notif' ? t.notif_title : pidiendo ? t.access_dialog_title : t.access_my_profile}</DialogTitle>
            <DialogDescription className="sr-only">{t.access_my_profile}</DialogDescription>
          </DialogHeader>
          {/* Notificaciones va en el MISMO panel: "Registrarme" desde aquí solo cambia el contenido. */}
          {vista === 'notif'
            ? <PanelNotificaciones onIr={cerrarDialogo} onRegistrarme={() => { setPidiendo(true); setVista('perfil'); setDialogo('perfil'); }} />
            : perfil}
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
