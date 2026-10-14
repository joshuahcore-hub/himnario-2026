// Celular girado (1.6.0): muestra SOLO la franja de la imagen que tiene el himno, a todo el ancho, sin el fondo
// vacío de arriba y abajo del lienzo. Los límites los calcula scripts/recortes.mjs (src/datos/recortes.json).
import recortes from '@/datos/recortes.json';

const tabla = recortes as unknown as Record<string, [number, number, number]>; // [ancho, arriba, alto] en px de la imagen

export default function HimnoRecortado({ num, src, alt, onError }: {
  num: number;
  src: string;
  alt: string;
  onError?: () => void;
}) {
  const r = tabla[String(num)];
  if (!r) return <img src={src} alt={alt} className="block w-full h-auto" draggable={false} onError={onError} />;
  const [ancho, arriba, alto] = r;
  return (
    <div className="w-full overflow-hidden" style={{ aspectRatio: `${ancho} / ${alto}` }}>
      {/* margin-top en % se mide sobre el ANCHO: corre la imagen justo lo que sobra arriba. */}
      <img src={src} alt={alt} className="block w-full h-auto" draggable={false} onError={onError}
           style={{ marginTop: `${(-arriba / ancho) * 100}%` }} />
    </div>
  );
}
