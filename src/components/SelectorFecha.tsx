// Botón de fecha (mismo alto y estilo que los campos de texto) que abre el calendario de la app.
// Tocar un día solo lo marca (círculo rojo). Si es distinto al que tenía aparecen Guardar y Cancelar;
// si se vuelve al mismo día, desaparecen. Tocar fuera cierra sin cambiar.
// Meses como una tira continua: el anterior, el actual y el siguiente van lado a lado (separados por
// ESPACIO px); al deslizar se ve asomar el mes vecino y la tira sigue el dedo. El nombre del mes
// y las flechas de arriba no se mueven. Todos los meses con 6 filas: la tira es pareja.
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/index';
import { formatearFecha } from '@/lib/minutaUtils';

const DURACION = 260;       // ms del deslizamiento al soltar o al tocar una flecha
const ANCHO_MES = 304;      // 7 días × 40 px + 12 px de margen a cada lado (igual que ui/calendar)
const ESPACIO = 24;         // separación entre un mes y el siguiente en la tira
const PASO = ANCHO_MES + ESPACIO;

const aFecha = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const aIso = (f: Date) =>
  `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;

export default function SelectorFecha({ valor, onChange, className = '' }: {
  valor: string;
  onChange: (iso: string) => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const idioma = locale === 'es' ? es : locale === 'pt' ? ptBR : enUS;
  const [abierto, setAbierto] = useState(false);
  const fondoTocado = useRef(false);
  const [elegida, setElegida] = useState<Date>(() => aFecha(valor));
  const [mes, setMes] = useState<Date>(() => aFecha(valor));

  // La tira de meses se mueve DIRECTAMENTE (style.transform), sin estado de React: así, mientras el dedo se
  // mueve, no se redibujan los tres calendarios en cada movimiento (eso se veía a saltos, "tac, tac"; Josué 1.5.3).
  // Solo al terminar se cambia el mes (un render) y la tira vuelve al centro en el mismo instante (flushSync).
  const tira = useRef<HTMLDivElement>(null);
  const moverTira = (px: number, animar: boolean) => {
    const el = tira.current;
    if (!el) return;
    el.style.transition = animar ? `transform ${DURACION}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none';
    el.style.transform = `translateX(${-PASO + px}px)`;
  };
  const toque = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const ocupado = useRef(false);
  const ignorarClick = useRef(false);

  const abrir = () => {
    const f = aFecha(valor);
    setElegida(f);
    setMes(f);
    ocupado.current = false;
    setAbierto(true);
  };

  const guardar = () => {
    onChange(aIso(elegida));
    setAbierto(false);
  };

  /** Desliza la tira hasta el mes vecino y luego lo deja como mes actual. dir: 1 = siguiente, -1 = anterior. */
  const cambiarMes = (dir: 1 | -1) => {
    if (ocupado.current) return;
    ocupado.current = true;
    moverTira(-dir * PASO, true);
    setTimeout(() => {
      flushSync(() => setMes(m => addMonths(m, dir))); // el mes nuevo queda dibujado…
      moverTira(0, false);                              // …y la tira vuelve al centro en el mismo instante
      ocupado.current = false;
    }, DURACION);
  };

  const alTocar = (e: React.TouchEvent) => {
    if (ocupado.current) return;
    toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, horizontal: null };
  };

  const alMover = (e: React.TouchEvent) => {
    const t0 = toque.current;
    if (!t0) return;
    const mx = e.touches[0].clientX - t0.x;
    const my = e.touches[0].clientY - t0.y;
    if (t0.horizontal === null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) t0.horizontal = Math.abs(mx) > Math.abs(my);
    if (t0.horizontal) moverTira(Math.max(-PASO, Math.min(PASO, mx)), false);
  };

  const alSoltar = (e: React.TouchEvent) => {
    const t0 = toque.current;
    toque.current = null;
    if (!t0?.horizontal) return;
    // Fue un deslizamiento: que no marque el día donde se soltó el dedo.
    ignorarClick.current = true;
    // Solo el click del mismo gesto (llega enseguida); antes 350 ms se tragaban toques rápidos a propósito (1.7.5).
    setTimeout(() => { ignorarClick.current = false; }, 120);
    const mx = e.changedTouches[0].clientX - t0.x;
    if (Math.abs(mx) > 60) cambiarMes(mx < 0 ? 1 : -1);
    else moverTira(0, true);
  };

  const panel = (m: Date) => (
    <div style={{ width: ANCHO_MES, flexShrink: 0 }} key={aIso(m)}>
      <Calendar
        mode="single"
        selected={elegida}
        onSelect={d => d && setElegida(d)}
        month={m}
        disableNavigation
        fixedWeeks
        locale={idioma}
        weekStartsOn={1}
        className="px-3 pb-3 pt-0"
        classNames={{ caption: 'hidden', month: 'space-y-0' }}
      />
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        className={`flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground ${className}`}
      >
        <CalendarDays size={15} className="text-muted-foreground shrink-0" />
        {formatearFecha(valor)}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[60] flex justify-center items-start bg-black/40 animate-in fade-in duration-150"
          style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 16vh)' }}
          // Tocar fuera cierra solo si el dedo empezó sobre el fondo (1.11.3: un click "fantasma" no lo cierra).
          onPointerDown={e => { fondoTocado.current = e.target === e.currentTarget; }}
          onClick={e => { if (fondoTocado.current && e.target === e.currentTarget) setAbierto(false); fondoTocado.current = false; }}
        >
          <div
            className="rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150 overflow-hidden"
            style={{ width: ANCHO_MES }}
            onClick={e => e.stopPropagation()}
            onClickCapture={e => { if (ignorarClick.current) { e.stopPropagation(); e.preventDefault(); } }}
          >
            {/* Encabezado fijo: flechas y nombre del mes (no se desliza). */}
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <button
                type="button"
                onClick={() => cambiarMes(-1)}
                className="h-8 w-8 rounded-md border border-input flex items-center justify-center opacity-60 hover:opacity-100"
                aria-label="‹"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold capitalize" aria-live="polite">{format(mes, 'LLLL yyyy', { locale: idioma })}</span>
              <button
                type="button"
                onClick={() => cambiarMes(1)}
                className="h-8 w-8 rounded-md border border-input flex items-center justify-center opacity-60 hover:opacity-100"
                aria-label="›"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Tira de meses: anterior | actual | siguiente. */}
            <div className="overflow-hidden" style={{ touchAction: 'pan-y' }}
                 onTouchStart={alTocar} onTouchMove={alMover} onTouchEnd={alSoltar} onTouchCancel={alSoltar}>
              <div
                ref={tira}
                className="flex"
                style={{ gap: ESPACIO, transform: `translateX(${-PASO}px)`, willChange: 'transform' }}
              >
                {panel(addMonths(mes, -1))}
                {panel(mes)}
                {panel(addMonths(mes, 1))}
              </div>
            </div>

            {/* Guardar/Cancelar solo aparecen si el día marcado es distinto al que ya tenía. */}
            {aIso(elegida) !== valor && (
              <div className="flex gap-2 px-3 pb-3 animate-in fade-in duration-150">
                <Button variant="outline" className="flex-1 h-10" onClick={() => setAbierto(false)}>{t.minutas_cancel}</Button>
                <Button className="flex-1 h-10" onClick={guardar}>{t.minutas_save}</Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
