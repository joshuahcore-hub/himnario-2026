// Recordatorios (1.7.0, Josué): nota adhesiva amarilla sobre una alabanza. Ver src/lib/recordatorios.ts.
// - NotasRecordatorio: las notas, entre el título y la letra (más chicas con el celular girado).
//     propia → amarillo; recibida → amarillo + "De: …"; dejada a otro → borde punteado +
//     "Para: … · Enviado/Visto/Eliminado por …". Al tocarla: Editar (propias) y Eliminar (con confirmación).
// - BotonRecordatorio: el botón amarillo de arriba.
// - PanelRecordatorio: escribir / editar / borrar. Para quién y si es "siempre" o "solo esta minuta".
import { useCallback, useEffect, useRef, useState } from 'react';
import { PenLine, StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';
import { useToque } from '@/hooks/useToque';
import { ErrorDeRed } from '@/lib/api';
import {
  borrarRecordatorio, cargarPersonas, marcarVisto, guardarRecordatorio, personasGuardadas, type Persona, type Recordatorio,
} from '@/lib/recordatorios';

const Punto = ({ color }: { color: string }) => (
  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
);

function Nota({ r, compacto, abierta, onAlternar, onEditar, onBorrar }: {
  r: Recordatorio;
  compacto: boolean;
  /** Fila de opciones (Editar / Eliminar) desplegada. */
  abierta: boolean;
  onAlternar: () => void;
  onEditar: (r: Recordatorio) => void;
  onBorrar: (r: Recordatorio) => void;
}) {
  const { t } = useI18n();
  const dejadaAOtro = !!r.para;
  const persona = r.autor ?? r.para;
  // Quien lo recibe: al aparecerle, quien lo dejó ve "Visto".
  useEffect(() => { if (r.autor && r.estado === 'enviado') marcarVisto(r); }, [r.id, r.estado]); // eslint-disable-line react-hooks/exhaustive-deps

  const colorEstado = r.estado === 'visto' ? 'text-green-600 dark:text-green-400' : r.estado === 'eliminado' ? 'text-destructive' : '';
  const textoEstado = r.estado === 'visto' ? t.rec_seen : r.estado === 'eliminado' ? t.rec_deleted_by(r.para?.nombre ?? '') : t.rec_sent;
  const toqueNota = useToque<HTMLDivElement>(() => { if (!r.id.startsWith('tmp-')) onAlternar(); });
  const toqueEditar = useToque(() => onEditar(r));
  const toqueBorrar = useToque(() => onBorrar(r));
  const opcion = `flex items-center gap-1.5 rounded-full font-medium [touch-action:none] ${compacto ? 'h-7 px-3 text-[11px]' : 'h-8 px-3.5 text-xs'}`;

  return (
    <div
      role="button"
      {...toqueNota}
      onDoubleClick={e => e.stopPropagation()}
      className={`relative w-full text-left rounded-xl border ${compacto ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'} ${
        dejadaAOtro ? 'border-dashed border-yellow-500/60 bg-transparent' : 'border-yellow-400/50 bg-yellow-300/20 dark:bg-yellow-300/10'
      }`}
    >
      <div className="flex items-start gap-2">
        <StickyNote size={compacto ? 12 : 14} className="mt-[3px] shrink-0 text-yellow-500" />
        <span className="flex-1 min-w-0">
          {persona && (
            <span className={`flex items-center gap-1 font-semibold text-muted-foreground ${compacto ? 'text-[10px]' : 'text-[11px]'}`}>
              {r.autor ? `${t.rec_from}:` : `${t.rec_for}:`}
              <Punto color={persona.color} />
              {persona.nombre}
              {dejadaAOtro && <span className={colorEstado}>· {textoEstado}</span>}
            </span>
          )}
          <span className="block whitespace-pre-wrap break-words font-medium text-amber-800 dark:text-yellow-200">{r.texto}</span>
        </span>
      </div>
      {/* Opciones al tocar (Josué, 1.7.1): Editar (solo las propias) y Eliminar. FLOTAN bajo la nota (no la agrandan):
          si la nota creciera, la letra y la propia nota se moverían bajo el dedo (regla de Josué, 1.4.4). */}
      <div className="absolute right-2 top-full mt-1.5 z-10 flex gap-2 rounded-full border border-border bg-card p-1 shadow-lg"
           style={{
             opacity: abierta ? 1 : 0, transform: abierta ? 'none' : 'translateY(-4px) scale(0.96)', transformOrigin: 'top right',
             pointerEvents: abierta ? 'auto' : 'none', transition: 'opacity 160ms ease-out, transform 160ms ease-out',
           }}>
        {r.mio && (
          <button type="button" tabIndex={abierta ? 0 : -1} className={`${opcion} text-foreground`} {...toqueEditar}>
            <PenLine size={compacto ? 12 : 13} />{t.rec_edit}
          </button>
        )}
        <button type="button" tabIndex={abierta ? 0 : -1} className={`${opcion} bg-destructive/10 text-destructive`} {...toqueBorrar}>
          <Trash2 size={compacto ? 12 : 13} />{t.rec_delete}
        </button>
      </div>
    </div>
  );
}

export function NotasRecordatorio({ notas, compacto = false, onTocar, className = '' }: {
  notas: Recordatorio[];
  compacto?: boolean;
  /** Editar uno propio (abre el panel). Tocar una nota despliega Editar / Eliminar. */
  onTocar: (r: Recordatorio) => void;
  className?: string;
}) {
  const { t } = useI18n();
  // Nota con las opciones desplegadas (una a la vez). Tocar fuera las cierra (regla de Josué).
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  useAlTocarFuera(contenedor, abiertaId !== null, useCallback(() => setAbiertaId(null), []));
  // Confirmar el borrado. El aviso se fija al ABRIRLO (no cambia mientras se desvanece al cerrar).
  const [aBorrar, setABorrar] = useState<Recordatorio | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const pedirBorrar = (r: Recordatorio) => { setAbiertaId(null); setABorrar(r); setBorrando(false); setConfirmar(true); };
  const editar = (r: Recordatorio) => { setAbiertaId(null); onTocar(r); };
  const borrar = () => {
    if (!aBorrar || borrando) return;
    setBorrando(true);
    setConfirmar(false); // al instante; si el servidor falla, la nota vuelve a aparecer con el aviso
    borrarRecordatorio(aBorrar).catch(e => toast.error(e instanceof ErrorDeRed ? t.rec_needs_internet : e.message));
  };
  const aviso = !aBorrar ? '' : aBorrar.autor ? t.rec_delete_received(aBorrar.autor.nombre)
    : aBorrar.para && aBorrar.estado !== 'eliminado' ? t.rec_delete_both(aBorrar.para.nombre) : '';

  if (notas.length === 0 && !confirmar) return null;
  return (
    <div ref={contenedor} className={`w-full flex flex-col ${compacto ? 'gap-1' : 'gap-1.5'} ${className}`}>
      {notas.map(r => (
        <Nota key={r.id} r={r} compacto={compacto} abierta={abiertaId === r.id}
              onAlternar={() => setAbiertaId(a => (a === r.id ? null : r.id))} onEditar={editar} onBorrar={pedirBorrar} />
      ))}
      <Dialog open={confirmar} onOpenChange={o => { if (!o && !borrando) setConfirmar(false); }}>
        <DialogContent capa="z-[70]" className="max-w-[320px] rounded-2xl gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">{t.rec_delete_confirm}</DialogTitle>
          </DialogHeader>
          {aviso && <p className="text-xs text-muted-foreground">{aviso}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="h-9 px-4 text-sm" onClick={() => setConfirmar(false)}>{t.rec_cancel}</Button>
            <Button variant="destructive" className="h-9 px-4 text-sm gap-1.5" onClick={borrar} style={{ opacity: borrando ? 0.6 : 1 }}>
              <Trash2 size={14} />{t.rec_delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function BotonRecordatorio({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  const { t } = useI18n();
  // Se activa al soltar el dedo (useToque): tras deslizar a otra canción el navegador no generaba el click del
  // primer toque (Josué, 1.7.4).
  const toque = useToque(onClick);
  return (
    <button
      type="button"
      {...toque}
      onTouchStart={e => e.stopPropagation()}
      // touch-action none: si el dedo se mueve un poquito, el navegador no lo toma como desplazamiento y no cancela
      // el toque (a Josué a veces el primer toque "no funcionaba", 1.7.1).
      style={{ touchAction: 'none' }}
      aria-label={t.rec_add}
      className={`tap-btn-overlay p-2 rounded-full bg-card/95 border border-yellow-400/60 text-yellow-500 ${className}`}
    >
      <StickyNote size={20} />
    </button>
  );
}

export function PanelRecordatorio({ abierto, onCerrar, himno, anterior, minutaId = null, minutaPublicada = true }: {
  abierto: boolean;
  onCerrar: () => void;
  himno: number | null;
  /** null = recordatorio nuevo. */
  anterior: Recordatorio | null;
  /** La minuta que se está viendo (null en el himnario: ahí solo existe "siempre en esta alabanza"). */
  minutaId?: string | null;
  minutaPublicada?: boolean;
}) {
  const { t } = useI18n();
  const { registrado, puedeDejarAOtros } = useAcceso();
  const [texto, setTexto] = useState('');
  const [paraId, setParaId] = useState<string | null>(null);
  const [soloMinuta, setSoloMinuta] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>(personasGuardadas);
  const [guardando, setGuardando] = useState(false);
  // Editar uno y dejarlo SIN texto = querer borrarlo: al cerrar (o tocar "Eliminar") se pregunta, en el MISMO panel
  // (Josué, 1.7.1: el basurero dentro de la edición se veía raro; borrar es manteniendo presionada la nota).
  const [confirmando, setConfirmando] = useState(false);

  // Se reinicia al ABRIR, nunca al cerrar (si no, durante el desvanecimiento se vería el estado anterior).
  // 1.8.1: se reinicia DURANTE el dibujo en que se abre (no en un efecto después): con el efecto, el primer cuadro
  // mostraba lo de la vez anterior (p. ej. Guardar/Cancelar visibles) y "parpadeaba" un botón (Josué).
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (abierto) {
      setTexto(anterior?.texto ?? '');
      setParaId(anterior?.para?.id ?? null);
      setSoloMinuta(anterior ? !!anterior.minuta : !!minutaId);
      setGuardando(false);
      setConfirmando(false);
    }
  }
  useEffect(() => {
    if (abierto && puedeDejarAOtros && !anterior?.local) cargarPersonas().then(setPersonas);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Para otra persona: solo el admin y quienes él autorice. En una minuta privada, "solo esta minuta" no puede ir a
  // otro (no la vería).
  const conPersonas = puedeDejarAOtros && !anterior?.local && personas.length > 0;
  const bloqueoPrivada = soloMinuta && !!minutaId && !minutaPublicada;
  useEffect(() => { if (bloqueoPrivada) setParaId(null); }, [bloqueoPrivada]);

  const cambio = texto.trim() !== (anterior?.texto ?? '') || paraId !== (anterior?.para?.id ?? null)
    || soloMinuta !== (anterior ? !!anterior.minuta : !!minutaId);
  const listo = cambio && texto.trim().length > 0 && !guardando;

  // Guardar y borrar se ven AL INSTANTE (1.8.1, Josué: "todo fluido"): el panel se cierra ya y el servidor se
  // actualiza por detrás; si falla, el cambio se deshace solo y aparece el aviso.
  const avisarError = (e: any) => toast.error(e instanceof ErrorDeRed ? t.rec_needs_internet : e.message);
  const guardar = () => {
    if (!listo || !himno) return;
    setGuardando(true);
    onCerrar();
    guardarRecordatorio({
      anterior, himno, texto: texto.trim(), paraId, para: personas.find(p => p.id === paraId) ?? null,
      minuta: soloMinuta && minutaId ? minutaId : null,
    }, registrado).catch(avisarError);
  };

  const borrar = () => {
    if (!anterior || guardando) return;
    setGuardando(true);
    onCerrar();
    borrarRecordatorio(anterior).catch(avisarError);
  };

  const vacio = !!anterior && texto.trim().length === 0;
  /** Cerrar (tocar fuera, X, atrás): si quedó vacío, primero pregunta. Ya preguntando, cerrar = no borrar nada. */
  const intentarCerrar = () => {
    if (vacio && !confirmando && !guardando) setConfirmando(true);
    else if (!guardando) onCerrar();
  };
  const avisoBorrar = anterior?.para && anterior.estado !== 'eliminado' ? t.rec_delete_both(anterior.para.nombre)
    : anterior?.autor ? t.rec_delete_received(anterior.autor.nombre) : '';

  // Opciones del panel: alto de 36 px (antes ~28 y costaba acertarles, Josué 1.7.1) y touch-action none (un toque
  // con un poco de movimiento no se cancela).
  const pastilla = (activa: boolean) =>
    `h-9 px-3.5 rounded-full text-[13px] font-medium border select-none [touch-action:none] transition-colors duration-150 ${
      activa ? 'bg-yellow-300/30 border-yellow-500/70 text-foreground' : 'border-border text-muted-foreground'
    }`;

  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o) intentarCerrar(); }}>
      <DialogContent capa="z-[70]" className="max-w-[340px] rounded-2xl gap-3" onOpenAutoFocus={e => e.preventDefault()}>
        {confirmando ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">{t.rec_delete_confirm}</DialogTitle>
            </DialogHeader>
            {avisoBorrar && <p className="text-xs text-muted-foreground">{avisoBorrar}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="h-9 px-4 text-sm" onClick={() => setConfirmando(false)}>{t.rec_cancel}</Button>
              <Button variant="destructive" className="h-9 px-4 text-sm gap-1.5" onClick={borrar} style={{ opacity: guardando ? 0.6 : 1 }}>
                <Trash2 size={14} />{t.rec_delete}
              </Button>
            </div>
          </>
        ) : (<>
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <StickyNote size={16} className="text-yellow-500" />
            {anterior ? t.rec_title_edit : t.rec_title_new}
          </DialogTitle>
        </DialogHeader>

        <Textarea
          value={texto}
          onChange={e => setTexto(e.target.value.slice(0, 300))}
          placeholder={t.rec_placeholder}
          rows={3}
          className="text-sm resize-none"
        />

        {minutaId && (
          <div className="flex flex-wrap gap-2.5">
            <button type="button" className={pastilla(!soloMinuta)} onClick={() => setSoloMinuta(false)}>{t.rec_always}</button>
            <button type="button" className={pastilla(soloMinuta)} onClick={() => setSoloMinuta(true)}>{t.rec_this_minuta}</button>
          </div>
        )}

        {conPersonas && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">{t.rec_for}:</p>
            {bloqueoPrivada ? (
              <p className="text-[11px] text-muted-foreground">{t.rec_private_hint}</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                <button type="button" className={pastilla(paraId === null)} onClick={() => setParaId(null)}>{t.rec_for_me}</button>
                {personas.map(p => (
                  <button key={p.id} type="button" className={`${pastilla(paraId === p.id)} flex items-center gap-1.5`} onClick={() => setParaId(p.id)}>
                    <Punto color={p.color} />{p.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Guardar/Cancelar con su espacio reservado: aparecen (opacidad) solo si algo cambió. Si se borró todo el
            texto de uno existente, en su lugar "Eliminar" (pregunta antes). */}
        <div className="flex justify-end gap-2 pt-1 transition-opacity duration-200"
             style={{ opacity: listo || vacio ? 1 : 0, pointerEvents: listo || vacio ? 'auto' : 'none' }}>
          <Button variant="outline" className="h-9 px-4 text-sm" tabIndex={listo || vacio ? 0 : -1} onClick={onCerrar}>{t.rec_cancel}</Button>
          {vacio ? (
            <Button variant="destructive" className="h-9 px-4 text-sm" onClick={() => setConfirmando(true)}>{t.rec_delete}</Button>
          ) : (
            <Button className="h-9 px-4 text-sm" tabIndex={listo ? 0 : -1} onClick={guardar}>{t.rec_save}</Button>
          )}
        </div>
        </>)}
      </DialogContent>
    </Dialog>
  );
}
