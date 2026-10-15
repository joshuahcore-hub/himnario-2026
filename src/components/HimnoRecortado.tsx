// Celular girado (1.6.0): muestra SOLO la franja de la imagen que tiene el himno, a todo el ancho, sin el fondo
// vacío de arriba y abajo del lienzo. Los límites los calcula scripts/recortes.mjs (src/datos/recortes.json).
import recortes from '@/datos/recortes.json';

const tabla = recortes as unknown as Record<string, [number, number, number, number]>; // [ancho, arriba, alto, altoTotal] en px

/**
 * Para una <img> normal (con zoom propio): muestra solo la franja con letra usando object-view-box (Chrome/Android).
 * Donde no se soporta, se ve la imagen completa como antes. (1.7.0: los recordatorios quedan justo sobre la letra.)
 */
export function vistaRecortada(num: number): React.CSSProperties {
  const r = tabla[String(num)];
  if (!r) return {};
  const [, arriba, alto, total] = r;
  return { objectViewBox: `inset(${arriba}px 0 ${total - arriba - alto}px 0)` } as React.CSSProperties;
}

export default function HimnoRecortado({ num, src, alt, onError }: {
  num: number;
  src: string;
  alt: string;
  onError?: () => void;
}) {
  const r = tabla[String(num)];
  if (!r) return <img src={src} alt={alt} decoding="async" className="block w-full h-auto" draggable={false} onError={onError} />;
  const [ancho, arriba, alto] = r;
  return (
    <div className="w-full overflow-hidden" style={{ aspectRatio: `${ancho} / ${alto}` }}>
      {/* margin-top en % se mide sobre el ANCHO: corre la imagen justo lo que sobra arriba. */}
      <img src={src} alt={alt} decoding="async" className="block w-full h-auto" draggable={false} onError={onError}
           style={{ marginTop: `${(-arriba / ancho) * 100}%` }} />
    </div>
  );
}
