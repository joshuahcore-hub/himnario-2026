// Zoom nítido SIN PARPADEO (1.17.6, Josué: "parpadea, es inaceptable"). Antes, al ampliar se CAMBIABA la imagen por la
// nítida y, mientras el teléfono la decodificaba, por un instante no se dibujaba nada. Ahora la imagen normal queda
// SIEMPRE debajo y la nítida se pone ENCIMA, exactamente en el mismo lugar, recién cuando ya está decodificada (antes
// es invisible). Una vez puesta se queda (aunque se vuelva a 1×: es la misma imagen), hasta cambiar de himno.
import { useEffect, useState } from 'react';

export default function CapaNitida({ hd, activa, className, style }: {
  hd: string | null | undefined;
  /** true = la imagen está ampliada: hay que traer la nítida. */
  activa: boolean;
  className: string;
  style?: React.CSSProperties;
}) {
  const [montada, setMontada] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => { setMontada(false); setVisible(false); }, [hd]);
  useEffect(() => { if (activa) setMontada(true); }, [activa]);
  if (!hd || !montada) return null;
  return (
    <img src={hd} alt="" aria-hidden draggable={false} decoding="async"
         className={`pointer-events-none ${className}`}
         style={{ ...style, opacity: visible ? 1 : 0 }}
         ref={img => { if (img?.complete && img.naturalWidth && !visible) setVisible(true); }}
         // Encima de la normal: aunque tardara en dibujarse, debajo sigue la normal (nunca queda en blanco).
         onLoad={() => setVisible(true)} />
  );
}
