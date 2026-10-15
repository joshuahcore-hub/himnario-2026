// Recordatorios (1.7.0, Josué): nota adhesiva amarilla sobre una alabanza. Ver src/lib/recordatorios.ts.
// - NotasRecordatorio: las notas, entre el título y la letra (más chicas con el celular girado).
//     propia → amarillo; recibida → amarillo + "De: …"; dejada a otro → borde punteado + "Para: …".
// - BotonRecordatorio: el botón amarillo de arriba.
// - PanelRecordatorio: escribir / editar / borrar. Para quién y si es "siempre" o "solo esta minuta".
import { useEffect, useState } from 'react';
import { StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';
import { ErrorDeRed } from '@/lib/api';
import {
  borrarRecordatorio, cargarPersonas, guardarRecordatorio, personasGuardadas, type Persona, type Recordatorio,
} from '@/lib/recordatorios';

const Punto = ({ color }: { color: string }) => (
  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
);

export function NotasRecordatorio({ notas, compacto = false, onTocar, className = '' }: {
  notas: Recordatorio[];
  compacto?: boolean;
  /** Solo las que escribí yo se pueden tocar (para editarlas); las recibidas solo se ven. */
  onTocar: (r: Recordatorio) => void;
  className?: string;
}) {
  const { t } = useI18n();
  if (notas.length === 0) return null;
  return (
    <div className={`w-full flex flex-col ${compacto ? 'gap-1' : 'gap-1.5'} ${className}`}>
      {notas.map(r => {
        const dejadaAOtro = !!r.para;
        return (
          <button
            key={r.id}
            type="button"
            onClick={() => { if (r.mio) onTocar(r); }}
            onDoubleClick={e => e.stopPropagation()}
            className={`w-full text-left rounded-xl border flex items-start gap-2 ${compacto ? 'px-2.5 py-1 text-xs' : 'px-3 py-2 text-sm'} ${
              dejadaAOtro
                ? 'border-dashed border-yellow-500/60 bg-transparent'
                : 'border-yellow-400/50 bg-yellow-300/20 dark:bg-yellow-300/10'
            } ${r.mio ? '' : 'cursor-default'}`}
          >
            <StickyNote size={compacto ? 12 : 14} className="mt-[3px] shrink-0 text-yellow-500" />
            <span className="flex-1 min-w-0">
              {(r.autor || r.para) && (
                <span className={`flex items-center gap-1 font-semibold text-muted-foreground ${compacto ? 'text-[10px]' : 'text-[11px]'}`}>
                  {r.autor ? `${t.rec_from}:` : `${t.rec_for}:`}
                  <Punto color={(r.autor ?? r.para)!.color} />
                  {(r.autor ?? r.para)!.nombre}
                </span>
              )}
              <span className="block whitespace-pre-wrap break-words font-medium text-amber-800 dark:text-yellow-200">{r.texto}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function BotonRecordatorio({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onClick}
      onTouchStart={e => e.stopPropagation()}
      aria-label={t.rec_add}
      className={`tap-btn-overlay p-2 rounded-full bg-card/80 backdrop-blur-sm border border-yellow-400/60 text-yellow-500 ${className}`}
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
  const { puedeEditar } = useAcceso();
  const [texto, setTexto] = useState('');
  const [paraId, setParaId] = useState<string | null>(null);
  const [soloMinuta, setSoloMinuta] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>(personasGuardadas);
  const [guardando, setGuardando] = useState(false);

  // Se reinicia al ABRIR, nunca al cerrar (si no, durante el desvanecimiento se vería el estado anterior).
  useEffect(() => {
    if (!abierto) return;
    setTexto(anterior?.texto ?? '');
    setParaId(anterior?.para?.id ?? null);
    setSoloMinuta(anterior ? !!anterior.minuta : !!minutaId);
    setGuardando(false);
    if (puedeEditar && !anterior?.local) cargarPersonas().then(setPersonas);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Para otra persona: solo creadores/admin. En una minuta privada, "solo esta minuta" no puede ir a otro (no la ve).
  const conPersonas = puedeEditar && !anterior?.local && personas.length > 0;
  const bloqueoPrivada = soloMinuta && !!minutaId && !minutaPublicada;
  useEffect(() => { if (bloqueoPrivada) setParaId(null); }, [bloqueoPrivada]);

  const cambio = texto.trim() !== (anterior?.texto ?? '') || paraId !== (anterior?.para?.id ?? null)
    || soloMinuta !== (anterior ? !!anterior.minuta : !!minutaId);
  const listo = cambio && texto.trim().length > 0 && !guardando;

  const guardar = async () => {
    if (!listo || !himno) return;
    setGuardando(true);
    try {
      await guardarRecordatorio({ anterior, himno, texto: texto.trim(), paraId, minuta: soloMinuta && minutaId ? minutaId : null }, puedeEditar);
      onCerrar();
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.rec_needs_internet : e.message);
      setGuardando(false);
    }
  };

  const borrar = async () => {
    if (!anterior || guardando) return;
    setGuardando(true);
    try {
      await borrarRecordatorio(anterior);
      onCerrar();
    } catch (e: any) {
      toast.error(e instanceof ErrorDeRed ? t.rec_needs_internet : e.message);
      setGuardando(false);
    }
  };

  const pastilla = (activa: boolean) =>
    `px-3 py-1.5 rounded-full text-xs font-medium border transition-colors duration-150 ${
      activa ? 'bg-yellow-300/30 border-yellow-500/70 text-foreground' : 'border-border text-muted-foreground'
    }`;

  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o) onCerrar(); }}>
      <DialogContent capa="z-[70]" className="max-w-[340px] rounded-2xl gap-3" onOpenAutoFocus={e => e.preventDefault()}>
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
          <div className="flex flex-wrap gap-2">
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
              <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
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

        {/* Guardar/Cancelar con su espacio reservado: aparecen (opacidad) solo si algo cambió. */}
        <div className="flex items-center gap-2 pt-1">
          {anterior && (
            <button type="button" onClick={borrar} aria-label={t.rec_delete} className="p-2 rounded-full text-destructive">
              <Trash2 size={18} />
            </button>
          )}
          <div className="flex-1" />
          <div className="flex gap-2 transition-opacity duration-200" style={{ opacity: listo ? 1 : 0, pointerEvents: listo ? 'auto' : 'none' }}>
            <Button variant="outline" className="h-9 px-4 text-sm" tabIndex={listo ? 0 : -1} onClick={onCerrar}>{t.rec_cancel}</Button>
            <Button className="h-9 px-4 text-sm" tabIndex={listo ? 0 : -1} onClick={guardar}>{t.rec_save}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
