// Avisos de arriba (1.13.1, Josué): PÍLDORA pequeña, centrada, del ancho del texto, gris oscuro (no negro). Misma
// forma de uso que antes: toast.success("…") / toast.error("…") / toast.warning("…", { description }). Se arma con
// toast.custom de sonner (que sigue encargándose de la animación, el apilado y el tiempo), en una fila transparente.
import { toast as sonner } from 'sonner';
import { Check, CircleAlert, Info } from 'lucide-react';

type Tipo = 'ok' | 'error' | 'info';
interface Opciones { description?: React.ReactNode; duration?: number }

function Pildora({ texto, tipo, descripcion }: { texto: React.ReactNode; tipo: Tipo; descripcion?: React.ReactNode }) {
  return (
    <div className="w-full flex justify-center pointer-events-none">
      <div className={`pointer-events-auto max-w-[calc(100vw-32px)] flex items-start gap-2 px-4 py-2 text-[13px] leading-snug font-normal tracking-[0.01em]
                       bg-[#4a4642] text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)] dark:bg-[#5a5550] ${descripcion ? 'rounded-2xl' : 'rounded-full'}`}>
        <span className="mt-[1px] shrink-0">
          {tipo === 'ok' ? <Check size={15} className="text-[#9ad8a8]" strokeWidth={2.5} />
            : tipo === 'error' ? <CircleAlert size={15} className="text-[#f2a8a8]" />
            : <Info size={15} className="text-[#f0d28a]" />}
        </span>
        <span className="min-w-0">
          {texto}
          {descripcion && <span className="block text-[12px] font-normal text-white/75 mt-0.5">{descripcion}</span>}
        </span>
      </div>
    </div>
  );
}

const base = { unstyled: true, classNames: { toast: '!w-full !bg-transparent !shadow-none !border-0 !p-0' } };
const mostrar = (tipo: Tipo, porDefecto?: number) => (texto: React.ReactNode, o?: Opciones) =>
  sonner.custom(() => <Pildora texto={texto} tipo={tipo} descripcion={o?.description} />,
    { ...base, duration: o?.duration ?? porDefecto });

export const toast = {
  success: mostrar('ok'),
  error: mostrar('error', 5000),
  warning: mostrar('info', 5000),
};
