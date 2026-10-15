// Imágenes SUBIDAS (alabanzas fuera del himnario y Especial; 1.13.4, Josué): hasta 10 por canción. Se guardan en el
// mismo campo `imagen` como ids separados por coma (las de antes, con un solo id, siguen sirviendo).
// Se ven con un CONTORNO punteado y la marca "Imagen subida" (no son parte de la app). Con varias, flechas DENTRO del
// marco cambian de imagen; deslizar sigue siendo para cambiar de canción.
import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Zoomable from '@/components/Zoomable';
import { useI18n } from '@/lib/i18n/index';
import { urlImagen } from '@/lib/cancionesExtra';
import { AcotacionesPostit, NotasRecordatorio, vaSobreLetra } from '@/components/Recordatorios';
import type { Recordatorio } from '@/lib/recordatorios';

export const MAX_IMAGENES = 10;
export const imagenesDe = (imagen?: string | null): string[] => (imagen ? imagen.split(',').filter(Boolean) : []);
export const unirImagenes = (ids: string[]): string | null => (ids.length ? ids.slice(0, MAX_IMAGENES).join(',') : null);

/** Título centrado, tonalidad en rojo debajo y la etiqueta "fuera del himnario" (como en el lector de minutas). */
export function CabeceraFuera({ titulo, tono, etiqueta = true }: { titulo: string; tono: string | null; etiqueta?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="text-center shrink-0 pt-4 px-4">
      <h2 className="text-lg font-bold text-foreground">{titulo}</h2>
      <div className="flex items-center justify-center gap-2">
        {tono && <span translate="no" className="font-semibold text-hymn-key">{tono}</span>}
        {etiqueta && <span className="rounded-md border border-border px-1.5 py-px text-[10px] text-muted-foreground">{t.fuera_etiqueta}</span>}
      </div>
    </div>
  );
}

/** El marco con la(s) imagen(es) y su zoom. `cabecera` va dentro del zoom (se amplía junto con la imagen). */
export function MarcoImagenes({ imagen, titulo, cabecera, horizontal = false, altoMax = 'max-h-[70dvh]', onError,
  indice, onIndice, notas = [], enviados = false, onTocarNota }: {
  imagen: string; titulo: string; cabecera?: React.ReactNode; horizontal?: boolean; altoMax?: string; onError: () => void;
  /** (1.17.1) Imagen que se ve (controlado desde afuera: los post-it van por imagen). */
  indice?: number; onIndice?: (i: number) => void;
  /** Post-it de la imagen que se ve (pegados sobre ella, como en los himnos). */
  notas?: Recordatorio[]; enviados?: boolean; onTocarNota?: (r: Recordatorio) => void;
}) {
  const { t } = useI18n();
  const ids = imagenesDe(imagen);
  const [iPropio, setIPropio] = useState(0);
  const i = indice ?? iPropio;
  const setI = (f: (v: number) => number) => { const n = f(i); setIPropio(n); onIndice?.(n); };
  const actual = ids[Math.min(i, ids.length - 1)];
  // Las flechas no inician ni el deslizamiento entre canciones ni el zoom.
  const cortar = { onTouchStart: (e: React.TouchEvent) => e.stopPropagation(), onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
                   onPointerDown: (e: React.PointerEvent) => e.stopPropagation() };
  const flecha = (lado: 'izq' | 'der') => {
    const puede = lado === 'izq' ? i > 0 : i < ids.length - 1;
    return (
      <button type="button" {...cortar} disabled={!puede} aria-label={lado === 'izq' ? '‹' : '›'}
              onClick={e => { e.stopPropagation(); setI(v => v + (lado === 'izq' ? -1 : 1)); }}
              className={`absolute top-1/2 -translate-y-1/2 ${lado === 'izq' ? 'left-2.5' : 'right-2.5'} w-9 h-9 rounded-full bg-card/85 border border-border shadow-sm flex items-center justify-center text-foreground transition-opacity duration-200 [touch-action:manipulation]`}
              style={{ opacity: puede ? 1 : 0, pointerEvents: puede ? 'auto' : 'none' }}>
        {lado === 'izq' ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
      </button>
    );
  };
  return (
    <Zoomable className={horizontal ? 'w-full m-auto' : 'w-full h-full'} reiniciarCon={actual}>
      <div className={`w-full flex flex-col items-center px-3 ${horizontal ? 'pt-3' : 'h-full'}`}>
        {!horizontal && cabecera}
        {/* Girado (opción A): la imagen a todo el ancho y se recorre; los post-it sin mover, como acotación arriba. */}
        {horizontal && onTocarNota && <div className="w-full max-w-lg md:max-w-2xl" style={{ containerType: 'inline-size' }}><AcotacionesPostit notas={notas} className="pb-1" /></div>}
        <div className={`relative w-full max-w-lg md:max-w-2xl ${horizontal ? '' : 'flex-1 min-h-0 flex items-center justify-center py-3'}`}>
          <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/40 p-1.5 max-h-full">
            <span className="absolute -top-2.5 left-3 bg-background px-1.5 text-[10px] text-muted-foreground">
              {t.fuera_imagen_subida}{ids.length > 1 && ` · ${i + 1}/${ids.length}`}
            </span>
            {/* data-marco-letra: los post-it se ubican como fracción de la imagen (igual que sobre la letra). */}
            <div data-marco-letra className="relative">
              <img key={actual} src={urlImagen(actual)} alt={titulo} draggable={false} onError={onError}
                   className={`block w-full rounded ${horizontal ? 'h-auto' : `${altoMax} object-contain`}`} />
              {onTocarNota && !horizontal && (
                <NotasRecordatorio notas={notas} enviados={enviados} onTocar={onTocarNota} className="absolute bottom-full left-0 right-0 pb-3 z-10 pointer-events-none" />
              )}
              {onTocarNota && (
                <NotasRecordatorio notas={horizontal ? notas.filter(vaSobreLetra) : notas} sobreLetra soloVer={horizontal} enviados={enviados} onTocar={onTocarNota} />
              )}
            </div>
            {ids.length > 1 && <>{flecha('izq')}{flecha('der')}</>}
          </div>
        </div>
      </div>
    </Zoomable>
  );
}
