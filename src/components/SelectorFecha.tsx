// Botón de fecha (mismo alto y estilo que los campos de texto) que abre el calendario de la app.
// Tocar un día solo lo marca (círculo rojo). Si es distinto al que tenía aparecen Guardar y Cancelar;
// si se vuelve al mismo día, desaparecen. Tocar fuera cierra sin cambiar.
// La parte de arriba del calendario queda fija (si un mes tiene más semanas, crece hacia abajo)
// y se puede cambiar de mes deslizando a la izquierda o a la derecha.
import { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { addMonths } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n/index';
import { formatearFecha } from '@/lib/minutaUtils';

const DURACION = 220; // ms de cada mitad del deslizamiento (sale el mes, entra el nuevo)

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
  const [abierto, setAbierto] = useState(false);
  const [elegida, setElegida] = useState<Date>(() => aFecha(valor));
  const [mes, setMes] = useState<Date>(() => aFecha(valor));

  // Deslizamiento de los días (el nombre del mes de arriba no se mueve):
  // `desliz` = desplazamiento horizontal de la grilla en px; `animando` = con transición suave.
  const [desliz, setDesliz] = useState(0);
  const [animando, setAnimando] = useState(false);
  const tarjetaRef = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const ocupado = useRef(false);
  const ignorarClick = useRef(false);

  /** El mes actual sale hacia un lado y el nuevo entra desde el otro. dir: 1 = siguiente, -1 = anterior. */
  const cambiarMes = (dir: 1 | -1) => {
    if (ocupado.current) return;
    ocupado.current = true;
    const ancho = tarjetaRef.current?.offsetWidth ?? 300;
    setAnimando(true);
    setDesliz(-dir * ancho);
    setTimeout(() => {
      setAnimando(false);
      setMes(m => addMonths(m, dir));
      setDesliz(dir * ancho);
      // Pausa corta para que el mes nuevo quede ubicado al otro lado antes de entrar deslizándose.
      // (setTimeout y no requestAnimationFrame: este último se pausa si la app pasa a segundo plano
      // y el mes podría quedar fuera de la vista.)
      setTimeout(() => {
        setAnimando(true);
        setDesliz(0);
        setTimeout(() => { setAnimando(false); ocupado.current = false; }, DURACION);
      }, 30);
    }, DURACION);
  };

  const alTocar = (e: React.TouchEvent) => {
    if (ocupado.current) return;
    toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, horizontal: null };
  };

  const alMover = (e: React.TouchEvent) => {
    const t0 = toque.current;
    if (!t0) return;
    const dx = e.touches[0].clientX - t0.x;
    const dy = e.touches[0].clientY - t0.y;
    if (t0.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) t0.horizontal = Math.abs(dx) > Math.abs(dy);
    if (t0.horizontal) {
      setAnimando(false);
      setDesliz(dx);
    }
  };

  const alSoltar = (e: React.TouchEvent) => {
    const t0 = toque.current;
    toque.current = null;
    if (!t0?.horizontal) return;
    // El toque fue un deslizamiento: que no marque el día donde se soltó.
    ignorarClick.current = true;
    setTimeout(() => { ignorarClick.current = false; }, 350);
    const dx = e.changedTouches[0].clientX - t0.x;
    if (Math.abs(dx) > 50) cambiarMes(dx < 0 ? 1 : -1);
    else { setAnimando(true); setDesliz(0); }
  };

  const abrir = () => {
    const f = aFecha(valor);
    setElegida(f);
    setMes(f);
    setDesliz(0);
    setAnimando(false);
    ocupado.current = false;
    setAbierto(true);
  };

  const guardar = () => {
    onChange(aIso(elegida));
    setAbierto(false);
  };

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
          onClick={() => setAbierto(false)}
        >
          <div
            ref={tarjetaRef}
            className="rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150"
            style={{
              '--desliz': `${desliz}px`,
              '--desliz-transicion': animando ? `transform ${DURACION}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none',
              touchAction: 'pan-y',
            } as React.CSSProperties}
            onClick={e => e.stopPropagation()}
            onClickCapture={e => { if (ignorarClick.current) { e.stopPropagation(); e.preventDefault(); } }}
            onTouchStart={alTocar}
            onTouchMove={alMover}
            onTouchEnd={alSoltar}
          >
            <Calendar
              mode="single"
              selected={elegida}
              onSelect={d => d && setElegida(d)}
              month={mes}
              onMonthChange={nuevo => cambiarMes(nuevo > mes ? 1 : -1)}
              locale={locale === 'es' ? es : enUS}
              weekStartsOn={1}
              classNames={{
                month: 'space-y-4 overflow-hidden',
                table: 'w-full border-collapse space-y-1 translate-x-[var(--desliz)] [transition:var(--desliz-transicion)]',
              }}
            />
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
