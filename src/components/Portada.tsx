import { useLayoutEffect, useRef, useState } from 'react';
import type { ParsedSong, Autor } from '@/lib/types';
import { useI18n } from '@/lib/i18n/index';
import { cadena, comienzoLetra, esCita, formatearFecha, renumerar } from '@/lib/minutaUtils';
import { getHymn } from '@/lib/hymnCache';

interface PortadaProps {
  date: string;
  songs: ParsedSong[];
  compact?: boolean;
  creador?: Autor | null;
  editor?: Autor | null;
  /** La minuta es una copia: el chip dice "Duplicada por" en vez de "Creada por". */
  duplicada?: boolean;
  /** Sin recuadro (bg/borde): escrita directo sobre el fondo, como en el lector de minutas. */
  plano?: boolean;
}

export function ChipAutor({ autor, etiqueta }: { autor: Autor; etiqueta?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: autor.color }} />
      {etiqueta && <span>{etiqueta}</span>}
      <span className="font-medium text-foreground/80">{autor.nombre}</span>
    </span>
  );
}

/** (1.18.2, Josué) Corchete de las alabanzas unidas: cada punta apunta al CENTRO de su número (se mide en pantalla,
 *  así sirve con títulos de dos renglones y con grupos de cualquier tamaño), en el color de los números. */
function Corchete({ children, compact }: { children: React.ReactNode; compact: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tramo, setTramo] = useState<{ top: number; alto: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const medir = () => {
      const nums = el.querySelectorAll<HTMLElement>('[data-num]');
      if (nums.length < 2) return;
      const centro = (n: HTMLElement) => n.offsetTop + n.offsetHeight / 2;
      const top = centro(nums[0]), fin = centro(nums[nums.length - 1]);
      setTramo(v => (v && v.top === top && v.alto === fin - top ? v : { top, alto: fin - top }));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div ref={ref} className={`relative ${compact ? 'space-y-0.5' : 'space-y-1'}`}>
      {tramo && (
        <span aria-hidden className="absolute -left-[9px] w-[6px] rounded-l-[3px] border-[1.5px] border-r-0 border-hymn-number/70"
              style={{ top: tramo.top - 0.75, height: tramo.alto + 1.5 }} />
      )}
      {children}
    </div>
  );
}

/** (1.19.6, Josué) "(Jesucristo es el mismo de…)": si no cabe se quitan PALABRAS completas, así los "…" van siempre
 *  pegados a la última palabra (sin espacio) y el paréntesis siempre se cierra. */
function Comienzo({ palabras }: { palabras: string[] }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [n, setN] = useState(palabras.length);
  const ancho = useRef(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth + 0.5 && n > 1) setN(n - 1);
  });
  useLayoutEffect(() => {
    const el = ref.current?.parentElement;
    if (!el) return;
    // Si cambia el ancho (girar, otra pantalla), se vuelve a probar desde todas las palabras.
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      if (Math.abs(w - ancho.current) > 1) { ancho.current = w; setN(palabras.length); }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [palabras.length]);
  const texto = palabras.slice(0, n).join(' ').replace(/[,;:.!?¡¿]+$/, '');
  return <span ref={ref} className="min-w-0 overflow-hidden whitespace-nowrap italic text-muted-foreground/80">({texto}…)</span>;
}

/** Lista de cantos de la portada. En la tarjeta (compact) una minuta muy larga se corta y termina en "⋯" (1.18.2). */
function ListaCantos({ compact, children }: { compact: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [cortada, setCortada] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !compact) return;
    const medir = () => setCortada(el.scrollHeight > el.clientHeight + 1);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);
  return (<>
    <div ref={ref} className={`pl-2.5 ${compact ? 'space-y-1 max-h-[min(46dvh,460px)] overflow-hidden' : 'space-y-2'}`}
         style={cortada ? { maskImage: 'linear-gradient(to bottom, black calc(100% - 28px), transparent)', WebkitMaskImage: 'linear-gradient(to bottom, black calc(100% - 28px), transparent)' } : undefined}>
      {children}
    </div>
    {cortada && <p aria-hidden className="text-center text-muted-foreground text-base leading-none tracking-[0.2em] pt-1">⋯</p>}
  </>);
}

export default function Portada({ date, songs, compact = false, creador, editor, duplicada = false, plano = false }: PortadaProps) {
  const { t } = useI18n();
  const numerados = renumerar(songs);
  const tam = compact ? 'text-xs' : 'text-sm';

  const renderSongLine = (s: ParsedSong, position: number) => {
    // (1.18.2, Josué) Títulos que son una cita (Hebreos 13:8, Salmo 18…): entre paréntesis cómo empieza la letra.
    const comienzo = s.hymnNumber && esCita(s.title) ? comienzoLetra(s.firstLine ?? getHymn(s.hymnNumber)?.first_line) : null;
    return (
      // items-start (no baseline): todo es del mismo tamaño y así la etiqueta "fuera del himnario" queda centrada en
      // el primer renglón (antes, con baseline, se veía cargada hacia abajo).
      <div className={`flex items-start gap-1.5 ${tam} ${s.found === false ? 'opacity-50' : ''}`}>
        <span data-num className="text-muted-foreground font-medium shrink-0">{position} -</span>
        {/* Con cita, el título no se parte: lo que se acorta es el paréntesis. */}
        <span className={`text-foreground font-medium ${comienzo ? 'shrink-0' : ''}`}>{s.title}</span>
        {comienzo && <Comienzo palabras={comienzo} />}
        {s.key && <span translate="no" className="text-hymn-key font-semibold shrink-0 ml-1">{s.key}</span>}
        {s.hymnNumber && <span className="text-hymn-number font-medium shrink-0">({s.hymnNumber})</span>}
        {s.found === false && <span className="text-muted-foreground text-[10px] italic ml-1 self-center">{t.portada_not_found}</span>}
        {s.fuera && <span className={`shrink-0 rounded-md border border-border px-1.5 py-px text-[10px] leading-none text-muted-foreground whitespace-nowrap ${compact ? 'mt-px' : 'mt-[2.5px]'}`}>{t.fuera_etiqueta}</span>}
      </div>
    );
  };

  // (1.18.2, Josué) Palabra, Oración, Especial y Texto quedan a la MISMA distancia de la alabanza de arriba y de la de
  // abajo: el tamaño de letra va en el renglón (antes iba solo en el texto y el renglón tomaba el alto de la letra
  // normal, que dejaba más espacio arriba). El relleno es el promedio de los dos espacios que había.
  const marcador = (key: string, contenido: React.ReactNode) => (
    // (1.19.4, Josué) Un poco menos de espacio (antes py-2 / py-2.5): sigue parejo arriba y abajo.
    <div key={key} className={`${tam} ${compact ? 'py-1' : 'py-1.5'}`}>{contenido}</div>
  );

  return (
    // plano: sin recuadro, escrita directo sobre el fondo (en el lector, como las páginas de las canciones).
    <div className={plano ? 'px-2' : `bg-card rounded-xl border border-border shadow-sm ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-start justify-between mb-4">
        <h2 className={`font-bold text-foreground ${compact ? 'text-base' : 'text-xl'}`}>{t.portada_title}</h2>
        <span className={`font-medium text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{formatearFecha(date)}</span>
      </div>

      <ListaCantos compact={compact}>
        {numerados.map((song, i) => {
          if (song.isPalabra) return marcador(`palabra-${i}`, <span className="font-semibold text-palabra">{t.portada_palabra}</span>);
          if (song.isOracion) return marcador(`oracion-${i}`, <span className="font-semibold text-oracion">{t.portada_oracion}</span>);
          // "Especial Javiera" en celeste, sin número (1.13.0, Josué).
          if (song.isEspecial) return marcador(`especial-${i}`, <span className="font-semibold text-especial">{t.especial}{song.nombre ? ` ${song.nombre}` : ''}</span>);
          // (1.18.2, Josué) Texto libre, en naranjo suave, tal cual se escribió.
          if (song.isTexto) return marcador(`texto-${i}`, <span className="font-medium text-nota break-words">{song.texto}</span>);
          const grupo = cadena(song);
          return (
            <div key={`${song.position}-${i}`}>
              {/* (1.18.2, Josué) Ofrenda: aviso pequeño en amarillo justo ARRIBA de esa alabanza (no es un renglón más). */}
              {song.ofrenda && <p className={`font-semibold text-ofrenda leading-none mb-1 ${compact ? 'text-[9.5px]' : 'text-[11px]'}`}>{t.ofrenda}</p>}
              {grupo.length > 1 ? (
                <Corchete compact={compact}>
                  {grupo.map((x, k) => <div key={k}>{renderSongLine({ ...x, found: x.found ?? true }, song.position + k)}</div>)}
                </Corchete>
              ) : renderSongLine(song, song.position)}
            </div>
          );
        })}
      </ListaCantos>

      {(creador || editor) && (
        <div className="mt-4 pt-3 border-t border-border flex flex-wrap gap-x-3 gap-y-1">
          {creador && <ChipAutor autor={creador} etiqueta={duplicada ? t.minuta_duplicada_por : t.minuta_creada_por} />}
          {editor && (!creador || editor.nombre !== creador.nombre || editor.color !== creador.color) && (
            <ChipAutor autor={editor} etiqueta={t.minuta_editada_por} />
          )}
        </div>
      )}
    </div>
  );
}
