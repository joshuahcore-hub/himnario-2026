// Botón de fecha (mismo alto y estilo que los campos de texto) que abre el calendario de la app.
// Tocar un día solo lo marca (círculo rojo); Guardar lo confirma y Cancelar o tocar fuera cierra sin cambiar.
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
  const inicioToque = useRef<{ x: number; y: number } | null>(null);

  const abrir = () => {
    const f = aFecha(valor);
    setElegida(f);
    setMes(f);
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
            className="rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
            onTouchStart={e => { inicioToque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }}
            onTouchEnd={e => {
              const inicio = inicioToque.current;
              inicioToque.current = null;
              if (!inicio) return;
              const dx = e.changedTouches[0].clientX - inicio.x;
              const dy = e.changedTouches[0].clientY - inicio.y;
              if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) setMes(m => addMonths(m, dx < 0 ? 1 : -1));
            }}
          >
            <Calendar
              mode="single"
              selected={elegida}
              onSelect={d => d && setElegida(d)}
              month={mes}
              onMonthChange={setMes}
              locale={locale === 'es' ? es : enUS}
              weekStartsOn={1}
            />
            <div className="flex gap-2 px-3 pb-3">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setAbierto(false)}>{t.minutas_cancel}</Button>
              <Button className="flex-1 h-10" onClick={guardar}>{t.minutas_save}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
