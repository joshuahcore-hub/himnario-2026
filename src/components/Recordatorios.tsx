// Recordatorios (1.7.0, Josué): nota adhesiva amarilla sobre una alabanza. Ver src/lib/recordatorios.ts.
// - NotasRecordatorio: las notas, entre el título y la letra (más chicas con el celular girado).
//     propia → amarillo; recibida → amarillo + "De: …"; dejada a otro → borde punteado +
//     "Para: … · Enviado/Visto/Eliminado por …". Al tocarla: Editar (propias) y Eliminar (con confirmación).
// - BotonRecordatorio: el botón amarillo de arriba.
// - PanelRecordatorio: escribir / editar / borrar. Para quién y si es "siempre" o "solo esta minuta".
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowLeft, MoveDiagonal2, PenLine, Send, StickyNote, Trash2 } from 'lucide-react';
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
  ajustarRecordatorio, borrarRecordatorio, cargarPersonas, marcarVisto, moverRecordatorio, TAM_MAX, TAM_MIN, guardarRecordatorio, personasGuardadas, type Persona, type Recordatorio,
} from '@/lib/recordatorios';

const Punto = ({ color }: { color: string }) => (
  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
);

/** Letra manuscrita de los post-it (1.9.0: Patrick Hand, más legible que Caveat; sin internet, la del sistema). */
export const LETRA_POSTIT = "'Patrick Hand', 'Segoe Print', 'Bradley Hand', cursive";

const MANTENER_MS = 420; // mantener presionado para despegar el post-it y moverlo
const MOVER_MAX = 7;     // si el dedo se mueve más que esto antes, es un deslizamiento (cambiar de canción), no mover

/** Zona donde se ve el post-it: la página, recortada por los contenedores que no dejan ver lo que se sale. */
function zonaVisible(marco: HTMLElement, pagina: HTMLElement) {
  let { left, top, right, bottom } = pagina.getBoundingClientRect();
  for (let el = marco.parentElement; el && el !== pagina; el = el.parentElement) {
    const o = getComputedStyle(el);
    if (o.overflowX !== 'visible' || o.overflowY !== 'visible') {
      const r = el.getBoundingClientRect();
      left = Math.max(left, r.left); top = Math.max(top, r.top); right = Math.min(right, r.right); bottom = Math.min(bottom, r.bottom);
    }
  }
  return { left, top, right, bottom };
}

/** Dónde soltarlo (1.9.1, Josué): donde quede, en cualquier parte de la pantalla (también arriba del título o a los
 *  lados), sin salirse de lo visible. Se guarda respecto al recuadro de la letra (data-marco-letra), así coincide en
 *  himnario y minuta, vertical u horizontal; puede ser < 0 o > 1 (fuera de la letra). */
function posicionAlSoltar(postit: HTMLElement): { x: number; y: number } | undefined {
  const pagina = postit.closest<HTMLElement>('[data-pagina]');
  const marco = pagina?.querySelector<HTMLElement>('[data-marco-letra]');
  if (!pagina || !marco) return undefined;
  const m = marco.getBoundingClientRect(), n = postit.getBoundingClientRect();
  const z = zonaVisible(marco, pagina);
  const izq = Math.min(Math.max(n.left, z.left + 4), z.right - n.width - 4);
  const arr = Math.min(Math.max(n.top, z.top + 4), z.bottom - n.height - 4);
  return { x: (izq - m.left) / m.width, y: (arr - m.top) / m.height };
}

function Nota({ r, compacto, indice, abierta, sobreLetra, alDerecha = false, onAlternar, onCerrarOpciones, onEditar, onBorrar }: {
  r: Recordatorio;
  /** En la fila: pegados a la derecha (celular girado: sobre la esquina del autor) en vez de a la izquierda. */
  alDerecha?: boolean;
  compacto: boolean;
  /** Para inclinar los post-it un poco distinto uno de otro. */
  indice: number;
  /** Opciones (Editar / Eliminar) desplegadas. */
  abierta: boolean;
  /** Pegado en un lugar de la letra (posición absoluta) en vez de en la fila de arriba. */
  sobreLetra: boolean;
  onAlternar: () => void;
  onCerrarOpciones: () => void;
  onEditar: (r: Recordatorio) => void;
  onBorrar: (r: Recordatorio) => void;
}) {
  const { t } = useI18n();
  const dejadaAOtro = !!r.para;
  const persona = r.autor ?? r.para;
  // Quien lo recibe: al aparecerle, quien lo dejó ve "Visto".
  useEffect(() => { if (r.autor && r.estado === 'enviado') marcarVisto(r); }, [r.id, r.estado]); // eslint-disable-line react-hooks/exhaustive-deps

  const colorEstado = r.estado === 'visto' ? 'text-green-700' : r.estado === 'eliminado' ? 'text-red-700' : '';
  const textoEstado = r.estado === 'visto' ? t.rec_seen : r.estado === 'eliminado' ? t.rec_deleted_by(r.para?.nombre ?? '') : t.rec_sent;
  const toqueEditar = useToque(() => onEditar(r));
  const toqueBorrar = useToque(() => onBorrar(r));
  const opcion = `flex items-center gap-1.5 rounded-full font-medium [touch-action:none] ${compacto ? 'h-7 px-3 text-[11px]' : 'h-8 px-3.5 text-xs'}`;

  // Toque corto = opciones; mantener presionado = despegarlo (vibra) y arrastrarlo (1.9.0). Mientras se arrastra se
  // mueve DIRECTO (style.transform, sin estado de React: fluido) y no deja que la página cambie de canción.
  const caja = useRef<HTMLDivElement>(null);
  const papel = useRef<HTMLDivElement>(null);
  const gesto = useRef<{ x: number; y: number; t: number; id: number; timer: number; arrastrando: boolean } | null>(null);
  const [levantado, setLevantado] = useState(false);

  // Opciones (Editar/Eliminar) hacia donde HAYA ESPACIO (1.9.1, Josué: pegado al borde izquierdo se salían de la
  // pantalla). Se calcula antes de dibujar al abrir: corrida para caber de lado y, si abajo no cabe, arriba.
  const opciones = useRef<HTMLDivElement>(null);
  const [ubic, setUbic] = useState<{ left: number; arriba: boolean }>({ left: 0, arriba: false });
  useLayoutEffect(() => {
    if (!abierta || !caja.current || !opciones.current) return;
    const n = caja.current.getBoundingClientRect(), o = opciones.current.getBoundingClientRect();
    const pagina = caja.current.closest<HTMLElement>('[data-pagina]')?.getBoundingClientRect();
    const izq = Math.max(pagina?.left ?? 0, 0) + 6, der = Math.min(pagina?.right ?? innerWidth, innerWidth) - 6;
    const abajo = Math.min(pagina?.bottom ?? innerHeight, innerHeight) - 6;
    const deseado = n.width - o.width - 8; // alineadas a la derecha del post-it
    const left = Math.min(Math.max(deseado, izq - n.left), der - n.left - o.width);
    setUbic({ left, arriba: n.bottom + o.height + 8 > abajo });
  }, [abierta]);

  // Tirador de la esquina para agrandar/achicar (1.9.1, Josué): sigue el dedo (zoom directo, sin estado de React) y
  // al soltar se guarda; entre TAM_MIN y TAM_MAX.
  const tam = r.tam ?? 1;
  const estirar = useRef<{ x: number; y: number; ancho: number; tam: number; id: number } | null>(null);
  const tamAl = (e: React.PointerEvent) => {
    const g = estirar.current!;
    const d = (e.clientX - g.x + (e.clientY - g.y)) / 2;
    return Math.min(TAM_MAX, Math.max(TAM_MIN, g.tam * (1 + d / g.ancho)));
  };
  const tirador = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!papel.current) return;
      estirar.current = { x: e.clientX, y: e.clientY, ancho: papel.current.getBoundingClientRect().width, tam, id: e.pointerId };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* igual funciona */ }
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!estirar.current || !papel.current) return;
      papel.current.style.zoom = String(tamAl(e));
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!estirar.current) return;
      const nuevo = Math.round(tamAl(e) * 100) / 100;
      estirar.current = null;
      flushSync(() => ajustarRecordatorio(r, { tam: nuevo }));
      if (papel.current) papel.current.style.zoom = '';
    },
    onPointerCancel: () => { estirar.current = null; if (papel.current) papel.current.style.zoom = ''; },
    // El gesto es del tirador: la página no se desliza ni se cierra.
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchMove: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchEnd: (e: React.TouchEvent) => e.stopPropagation(),
  };

  const soltar = () => {
    const el = caja.current;
    if (!el || !papel.current) return;
    const pos = posicionAlSoltar(papel.current);
    flushSync(() => {
      setLevantado(false);
      if (pos !== undefined) moverRecordatorio(r, pos);
    });
    el.style.transform = '';
  };
  const eventos = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();
      const id = e.pointerId;
      gesto.current = {
        x: e.clientX, y: e.clientY, t: Date.now(), id, arrastrando: false,
        timer: window.setTimeout(() => {
          const g = gesto.current;
          if (!g || r.id.startsWith('tmp-')) return;
          g.arrastrando = true;
          navigator.vibrate?.(15);
          try { caja.current?.setPointerCapture(id); } catch { /* sin captura igual funciona */ }
          onCerrarOpciones();
          setLevantado(true);
        }, MANTENER_MS),
      };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gesto.current;
      if (!g || g.id !== e.pointerId) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.arrastrando) {
        if (Math.hypot(dx, dy) > MOVER_MAX) { window.clearTimeout(g.timer); gesto.current = null; }
        return;
      }
      if (caja.current) caja.current.style.transform = `translate(${dx}px, ${dy}px)`;
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const g = gesto.current;
      gesto.current = null;
      if (!g) return;
      window.clearTimeout(g.timer);
      if (g.arrastrando) { soltar(); return; }
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 12 && !r.id.startsWith('tmp-')) onAlternar();
    },
    onPointerCancel: () => {
      const g = gesto.current;
      gesto.current = null;
      if (!g) return;
      window.clearTimeout(g.timer);
      if (g.arrastrando) soltar();
    },
    // Mientras se arrastra, el gesto es del post-it: la página no se desliza ni se cierra.
    onTouchMove: (e: React.TouchEvent) => { if (gesto.current?.arrastrando) e.stopPropagation(); },
    onTouchEnd: (e: React.TouchEvent) => { if (levantado || gesto.current?.arrastrando) e.stopPropagation(); },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
  };

  return (
    <div
      ref={caja}
      role="button"
      {...eventos}
      className={sobreLetra ? 'absolute pointer-events-auto' : `relative ${alDerecha ? 'self-end' : 'self-start'} max-w-[88%] pointer-events-auto`}
      style={{
        touchAction: 'none',
        zIndex: levantado ? 40 : abierta ? 30 : sobreLetra ? 10 : undefined,
        ...(sobreLetra && r.pos ? { left: `${r.pos.x * 100}%`, top: `${r.pos.y * 100}%`, maxWidth: '85%', width: 'max-content' } : {}),
      }}
    >
      {/* Post-it (Josué, 1.8.2, estilo C): papelito amarillo con un trozo de cinta, letra manuscrita y apenas
          inclinado (cada uno un poco distinto). Igual en claro, oscuro y en todos los colores: es "papel". */}
      <div
        ref={papel}
        className={`relative text-left ${compacto ? 'px-2.5 pt-1.5 pb-1.5' : 'px-3.5 pt-2.5 pb-2.5'}`}
        style={{
          zoom: tam,
          background: '#FFF3B0', color: '#4A3800', borderRadius: '2px 2px 12px 2px',
          boxShadow: levantado ? '0 10px 24px rgba(0,0,0,0.28)' : '0 2px 6px rgba(0,0,0,0.16)',
          transform: `rotate(${indice % 2 === 0 ? -1.2 : 0.9}deg) scale(${levantado ? 1.05 : 1})`,
          transition: 'transform 160ms ease-out, box-shadow 160ms ease-out',
        }}
      >
        {/* Cinta adhesiva */}
        <span className="absolute left-1/2 -top-1.5 h-3 w-10 -ml-5 bg-white/55 dark:bg-white/35 pointer-events-none"
              style={{ transform: 'rotate(2deg)', boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }} />
        {persona && (
          <span className={`flex items-center gap-1 font-semibold ${compacto ? 'text-[10px]' : 'text-[11px]'}`} style={{ color: '#7A6420' }}>
            {r.autor ? `${t.rec_from}:` : `${t.rec_for}:`}
            <Punto color={persona.color} />
            {persona.nombre}
            {dejadaAOtro && <span className={colorEstado}>· {textoEstado}</span>}
          </span>
        )}
        <span className="block whitespace-pre-wrap break-words"
              style={{ fontFamily: LETRA_POSTIT, fontSize: compacto ? 15 : 17.5, lineHeight: 1.2 }}>
          {r.texto}
        </span>
      </div>
      {/* Opciones al tocar (Josué, 1.7.1): Editar (solo las propias) y Eliminar. FLOTAN bajo la nota (no la agrandan):
          si la nota creciera, la letra y la propia nota se moverían bajo el dedo (regla de Josué, 1.4.4). */}
      {/* Tirador para estirar (solo con el post-it tocado), en su esquina de abajo a la derecha. */}
      <div {...tirador} aria-label="Tamaño"
           className="absolute -right-3 -bottom-3 z-20 w-8 h-8 rounded-full border border-border bg-card shadow-md flex items-center justify-center text-foreground"
           style={{ touchAction: 'none', opacity: abierta ? 1 : 0, pointerEvents: abierta ? 'auto' : 'none', transition: 'opacity 160ms ease-out' }}>
        <MoveDiagonal2 size={15} />
      </div>
      <div ref={opciones} className="absolute z-10 flex gap-2 rounded-full border border-border bg-card p-1 shadow-lg"
           style={{
             left: ubic.left, ...(ubic.arriba ? { bottom: '100%', marginBottom: 6 } : { top: '100%', marginTop: 6 }),
             opacity: abierta ? 1 : 0, transform: abierta ? 'none' : `translateY(${ubic.arriba ? 4 : -4}px) scale(0.96)`,
             pointerEvents: abierta ? 'auto' : 'none', transition: 'opacity 160ms ease-out, transform 160ms ease-out',
           }}>
        {r.mio && (
          <button type="button" tabIndex={abierta ? 0 : -1} className={`${opcion} text-foreground whitespace-nowrap`} {...toqueEditar}>
            <PenLine size={compacto ? 12 : 13} />{t.rec_edit}
          </button>
        )}
        <button type="button" tabIndex={abierta ? 0 : -1} className={`${opcion} bg-destructive/10 text-destructive whitespace-nowrap`} {...toqueBorrar}>
          <Trash2 size={compacto ? 12 : 13} />{t.rec_delete}
        </button>
      </div>
    </div>
  );
}

/**
 * Post-it de una alabanza. Dos lugares:
 *  - sin `sobreLetra`: los que aún no se movieron, en fila arriba de la letra (su lugar de siempre);
 *  - con `sobreLetra`: los que se movieron, pegados en su lugar de la letra (capa encima del recuadro de la letra,
 *    que debe ser `relative` y llevar data-marco-letra; la página entera lleva data-pagina).
 * Mantener presionado uno lo despega y se arrastra; si se suelta arriba, fuera de la letra, vuelve a la fila.
 */
export function NotasRecordatorio({ notas, compacto = false, onTocar, className = '', sobreLetra = false, alDerecha = false }: {
  notas: Recordatorio[];
  /** Fila pegada a la derecha (ver Nota). */
  alDerecha?: boolean;
  compacto?: boolean;
  /** Editar uno propio (abre el panel). Tocar una nota despliega Editar / Eliminar. */
  onTocar: (r: Recordatorio) => void;
  className?: string;
  sobreLetra?: boolean;
}) {
  const { t } = useI18n();
  const lista = notas.filter(r => (sobreLetra ? !!r.pos : !r.pos));
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

  if (lista.length === 0 && !confirmar) return null;
  return (
    <div ref={contenedor}
         className={sobreLetra ? `absolute inset-0 pointer-events-none ${className}` : `w-full flex flex-col pt-1.5 ${compacto ? 'gap-2.5' : 'gap-3.5'} ${className}`}>
      {lista.map((r, i) => (
        <Nota key={r.id} r={r} compacto={compacto} indice={i} abierta={abiertaId === r.id} sobreLetra={sobreLetra} alDerecha={alDerecha}
              onAlternar={() => setAbiertaId(a => (a === r.id ? null : r.id))} onCerrarOpciones={() => setAbiertaId(null)}
              onEditar={editar} onBorrar={pedirBorrar} />
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
      // Un post-it en miniatura (1.9.1, Josué: el ícono genérico ya no calzaba con los post-it): mismo papel amarillo,
      // su trozo de cinta y un "+". Mide lo mismo que los botones redondos de al lado (37 px).
      className={`tap-btn-overlay relative w-[37px] h-[37px] flex items-center justify-center ${className}`}
    >
      <span className="relative block w-[27px] h-[27px]"
            style={{ background: '#FFF3B0', borderRadius: '2px 2px 7px 2px', boxShadow: '0 1px 4px rgba(0,0,0,0.25)', transform: 'rotate(-5deg)' }}>
        <span className="absolute left-1/2 -top-[3px] h-[6px] w-[14px] -ml-[7px] bg-white/60" style={{ transform: 'rotate(3deg)' }} />
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto w-[15px] h-[15px]" fill="none" stroke="#7A6420" strokeWidth={2.6} strokeLinecap="round">
          <path d="M12 6v12M6 12h12" />
        </svg>
      </span>
    </button>
  );
}

export function PanelRecordatorio({ abierto, onCerrar, himno, anterior, enviados = [], minutaId = null, minutaPublicada = true }: {
  abierto: boolean;
  onCerrar: () => void;
  himno: number | null;
  /** null = recordatorio nuevo. */
  anterior: Recordatorio | null;
  /** Los que dejé a otras personas en esta alabanza (no se ven sobre la letra; aquí, en "Enviados"). */
  enviados?: Recordatorio[];
  /** La minuta que se está viendo (null en el himnario: ahí solo existe "siempre en esta alabanza"). */
  minutaId?: string | null;
  minutaPublicada?: boolean;
}) {
  const { t } = useI18n();
  const { registrado, puedeDejarAOtros } = useAcceso();
  // El recordatorio que se edita: empieza siendo `anterior`, pero desde "Enviados" se puede elegir otro.
  const [ant, setAnt] = useState<Recordatorio | null>(anterior);
  const [vista, setVista] = useState<'escribir' | 'enviados'>('escribir');
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [paraId, setParaId] = useState<string | null>(null);
  const [soloMinuta, setSoloMinuta] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>(personasGuardadas);
  const [guardando, setGuardando] = useState(false);
  // Editar uno y dejarlo SIN texto = querer borrarlo: al cerrar (o tocar "Eliminar") se pregunta, en el MISMO panel
  // (Josué, 1.7.1: el basurero dentro de la edición se veía raro).
  const [confirmando, setConfirmando] = useState(false);

  const cargar = (r: Recordatorio | null) => {
    setAnt(r);
    setTexto(r?.texto ?? '');
    setParaId(r?.para?.id ?? null);
    setSoloMinuta(r ? !!r.minuta : !!minutaId);
    setGuardando(false);
    setConfirmando(false);
  };

  // Se reinicia al ABRIR, nunca al cerrar (si no, durante el desvanecimiento se vería el estado anterior).
  // 1.8.1: se reinicia DURANTE el dibujo en que se abre (no en un efecto después): con el efecto, el primer cuadro
  // mostraba lo de la vez anterior (p. ej. Guardar/Cancelar visibles) y "parpadeaba" un botón (Josué).
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (abierto) { cargar(anterior); setVista('escribir'); setPorBorrar(null); }
  }
  useEffect(() => {
    if (abierto && puedeDejarAOtros && !anterior?.local) cargarPersonas().then(setPersonas);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Para otra persona: solo el admin y quienes él autorice. En una minuta privada, "solo esta minuta" no puede ir a
  // otro (no la vería).
  const conPersonas = puedeDejarAOtros && !ant?.local && personas.length > 0;
  const bloqueoPrivada = soloMinuta && !!minutaId && !minutaPublicada;
  useEffect(() => { if (bloqueoPrivada) setParaId(null); }, [bloqueoPrivada]);

  const cambio = texto.trim() !== (ant?.texto ?? '') || paraId !== (ant?.para?.id ?? null)
    || soloMinuta !== (ant ? !!ant.minuta : !!minutaId);
  const listo = cambio && texto.trim().length > 0 && !guardando;

  // Guardar y borrar se ven AL INSTANTE (1.8.1, Josué: "todo fluido"): el panel se cierra ya y el servidor se
  // actualiza por detrás; si falla, el cambio se deshace solo y aparece el aviso.
  const avisarError = (e: any) => toast.error(e instanceof ErrorDeRed ? t.rec_needs_internet : e.message);
  const guardar = () => {
    if (!listo || !himno) return;
    setGuardando(true);
    onCerrar();
    const para = personas.find(p => p.id === paraId) ?? null;
    guardarRecordatorio({
      anterior: ant, himno, texto: texto.trim(), paraId, para, minuta: soloMinuta && minutaId ? minutaId : null,
    }, registrado).catch(avisarError);
    // Lo enviado a otra persona no queda sobre la letra (1.8.3): un aviso confirma que salió.
    if (para && !ant) toast.success(t.rec_sent_to(para.nombre));
  };

  const borrar = () => {
    if (!ant || guardando) return;
    setGuardando(true);
    onCerrar();
    borrarRecordatorio(ant).catch(avisarError);
  };

  const vacio = !!ant && texto.trim().length === 0;
  /** Cerrar (tocar fuera, X, atrás): si quedó vacío, primero pregunta. Ya preguntando, cerrar = no borrar nada. */
  const intentarCerrar = () => {
    if (vista === 'escribir' && vacio && !confirmando && !guardando) setConfirmando(true);
    else if (!guardando) onCerrar();
  };
  const avisoBorrar = ant?.para && ant.estado !== 'eliminado' ? t.rec_delete_both(ant.para.nombre)
    : ant?.autor ? t.rec_delete_received(ant.autor.nombre) : '';

  // Opciones del panel: alto de 36 px (antes ~28 y costaba acertarles, Josué 1.7.1) y touch-action none (un toque
  // con un poco de movimiento no se cancela).
  const pastilla = (activa: boolean) =>
    `h-9 px-3.5 rounded-full text-[13px] font-medium border select-none [touch-action:none] transition-colors duration-150 ${
      activa ? 'bg-yellow-300/30 border-yellow-500/70 text-foreground' : 'border-border text-muted-foreground'
    }`;
  const textoEstado = (r: Recordatorio) =>
    r.estado === 'visto' ? t.rec_seen : r.estado === 'eliminado' ? t.rec_deleted_by(r.para?.nombre ?? '') : t.rec_sent;
  const colorEstado = (r: Recordatorio) => (r.estado === 'visto' ? 'text-green-700' : r.estado === 'eliminado' ? 'text-red-700' : '');
  const letraManuscrita = { fontFamily: LETRA_POSTIT, fontSize: 17, lineHeight: 1.2 };

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
        ) : vista === 'enviados' ? (
          // Enviados (1.8.3): los post-it que dejé a otras personas en esta alabanza, con su estado. Tocar uno lo
          // edita; el basurero pregunta antes de eliminar (en la misma fila).
          <>
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <Send size={15} className="text-yellow-500" />{t.rec_sent_title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto py-1 -mx-1 px-1">
              {enviados.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">{t.rec_sent_none}</p>}
              {enviados.map(r => (
                <div key={r.id} className="rounded-sm px-3 py-2" style={{ background: '#FFF3B0', color: '#4A3800', boxShadow: '0 1px 4px rgba(0,0,0,0.14)' }}>
                  <div className="flex items-start gap-2">
                    <button type="button" className="flex-1 min-w-0 text-left"
                            onClick={() => { if (!r.id.startsWith('tmp-')) { cargar(r); setVista('escribir'); } }}>
                      <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#7A6420' }}>
                        {t.rec_for}: <Punto color={r.para!.color} />{r.para!.nombre}
                        <span className={colorEstado(r)}>· {textoEstado(r)}</span>
                      </span>
                      <span className="block whitespace-pre-wrap break-words" style={letraManuscrita}>{r.texto}</span>
                    </button>
                    {porBorrar !== r.id && (
                      <button type="button" aria-label={t.rec_delete} className="p-1.5 -mr-1 rounded-full text-red-700/80 shrink-0"
                              onClick={() => setPorBorrar(r.id)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {porBorrar === r.id && (
                    <div className="flex items-center justify-end gap-2 pt-1.5">
                      <span className="text-[11px] mr-auto" style={{ color: '#7A6420' }}>{t.rec_delete_confirm}</span>
                      <button type="button" className="h-8 px-3 rounded-full text-xs font-medium border border-black/15"
                              onClick={() => setPorBorrar(null)}>{t.rec_cancel}</button>
                      <button type="button" className="h-8 px-3 rounded-full text-xs font-semibold bg-red-600 text-white"
                              onClick={() => { setPorBorrar(null); borrarRecordatorio(r).catch(avisarError); }}>{t.rec_delete}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-start pt-1">
              <Button variant="outline" className="h-9 px-4 text-sm gap-1.5" onClick={() => { cargar(null); setVista('escribir'); }}>
                <ArrowLeft size={14} />{t.rec_back}
              </Button>
            </div>
          </>
        ) : (<>
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <StickyNote size={16} className="text-yellow-500" />
            {ant ? t.rec_title_edit : t.rec_title_new}
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

        {/* Abajo: a la izquierda "Enviados (N)" (si hay, siempre visible); a la derecha Guardar/Cancelar con su espacio
            reservado, que aparecen (opacidad) solo si algo cambió. Si se borró todo el texto de uno existente, en
            lugar de Guardar dice "Eliminar" (pregunta antes). */}
        <div className="flex items-center gap-2 pt-1">
          {!ant && enviados.length > 0 && (
            <button type="button" className="flex items-center gap-1.5 h-9 px-1 text-xs font-medium text-muted-foreground"
                    onClick={() => { setPorBorrar(null); setVista('enviados'); }}>
              <Send size={13} />{t.rec_sent_count(enviados.length)}
            </button>
          )}
          <div className="flex-1" />
          <div className="flex gap-2 transition-opacity duration-200"
               style={{ opacity: listo || vacio ? 1 : 0, pointerEvents: listo || vacio ? 'auto' : 'none' }}>
            <Button variant="outline" className="h-9 px-4 text-sm" tabIndex={listo || vacio ? 0 : -1} onClick={onCerrar}>{t.rec_cancel}</Button>
            {vacio ? (
              <Button variant="destructive" className="h-9 px-4 text-sm" onClick={() => setConfirmando(true)}>{t.rec_delete}</Button>
            ) : (
              <Button className="h-9 px-4 text-sm" tabIndex={listo ? 0 : -1} onClick={guardar}>{t.rec_save}</Button>
            )}
          </div>
        </div>
        </>)}
      </DialogContent>
    </Dialog>
  );
}
