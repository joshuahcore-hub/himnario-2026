// Celular girado (1.6.0): muestra SOLO la franja de la imagen que tiene el himno, a todo el ancho, sin el fondo
// vacío de arriba y abajo del lienzo. Los límites los calcula scripts/recortes.mjs (src/datos/recortes.json).
import recortes from '@/datos/recortes.json';
import CapaNitida from '@/components/CapaNitida';

const tabla = recortes as unknown as Record<string, [number, number, number, number]>; // [ancho, arriba, alto, altoTotal] en px

/**
 * Para una <img> normal (con zoom propio): muestra solo la franja con letra usando object-view-box (Chrome/Android).
 * Donde no se soporta, se ve la imagen completa como antes. (1.7.0: los recordatorios quedan justo sobre la letra.)
 */
/** Alto ÷ ancho de la franja con letra (para darle a cada himno el ancho que cabe de alto). */
export function proporcionLetra(num: number): number {
  const r = tabla[String(num)];
  return r ? r[2] / r[0] : 1980 / 1400;
}

export function vistaRecortada(num: number): React.CSSProperties {
  const r = tabla[String(num)];
  if (!r) return {};
  const [, arriba, alto, total] = r;
  // En % del tamaño de la imagen (1.17.2): vale igual para la normal y la nítida (el doble de píxeles).
  return { objectViewBox: `inset(${(arriba / total) * 100}% 0 ${((total - arriba - alto) / total) * 100}% 0)` } as React.CSSProperties;
}

export default function HimnoRecortado({ num, src: srcNormal, alt, onError, children, ajustarAlto = false, srcHd = null, ampliado = false }: {
  num: number;
  src: string;
  /** (1.17.2) Versión nítida; se usa cuando `ampliado` (zoom) es true. */
  srcHd?: string | null;
  ampliado?: boolean;
  alt: string;
  onError?: () => void;
  /** Capa encima de la letra (1.9.0: post-it pegados). El recuadro lleva data-marco-letra. */
  children?: React.ReactNode;
  /** Achicar si no cabe de alto (el contenedor debe tener container-type: size). Así queda centrada y entera. */
  ajustarAlto?: boolean;
}) {
  const src = srcNormal;
  const r = tabla[String(num)];
  if (!r) {
    return (
      <div data-marco-letra className="relative w-full">
        <img src={src} alt={alt} decoding="async" className="block w-full h-auto" draggable={false} onError={onError} />
        {children}
      </div>
    );
  }
  const [ancho, arriba, alto] = r;
  return (
    <div data-marco-letra className="relative"
         style={{ width: ajustarAlto ? `min(100cqw, calc(100cqh * ${ancho} / ${alto}))` : '100%', aspectRatio: `${ancho} / ${alto}` }}>
      <div className="absolute inset-0 overflow-hidden">
        {/* margin-top en % se mide sobre el ANCHO: corre la imagen justo lo que sobra arriba. */}
        <img src={src} alt={alt} decoding="async" className="block w-full h-auto" draggable={false} onError={onError}
             style={{ marginTop: `${(-arriba / ancho) * 100}%` }} />
        {/* Nítida encima (sin parpadeo), en el mismo lugar. */}
        <CapaNitida hd={srcHd} activa={ampliado} className="absolute left-0 top-0 block w-full h-auto"
                    style={{ marginTop: `${(-arriba / ancho) * 100}%` }} />
      </div>
      {children}
    </div>
  );
}
