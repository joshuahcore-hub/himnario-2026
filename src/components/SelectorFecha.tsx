// Botón de fecha (mismo alto y estilo que los campos de texto) que abre el calendario de la app.
// Tocar un día lo elige y cierra; tocar fuera del calendario lo cierra sin cambiar nada.
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { es, enUS } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
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
  const { locale } = useI18n();
  const [abierto, setAbierto] = useState(false);
  const fecha = aFecha(valor);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className={`flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-foreground ${className}`}
      >
        <CalendarDays size={15} className="text-muted-foreground shrink-0" />
        {formatearFecha(valor)}
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 animate-in fade-in duration-150"
          onClick={() => setAbierto(false)}
        >
          <div
            className="rounded-2xl border border-border bg-card shadow-xl animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <Calendar
              mode="single"
              selected={fecha}
              defaultMonth={fecha}
              onSelect={d => {
                if (d) onChange(aIso(d));
                setAbierto(false);
              }}
              locale={locale === 'es' ? es : enUS}
              weekStartsOn={1}
            />
          </div>
        </div>
      )}
    </>
  );
}
