import type { ParsedSong, Autor } from '@/lib/types';
import { useI18n } from '@/lib/i18n/index';
import { formatearFecha, renumerar } from '@/lib/minutaUtils';

interface PortadaProps {
  date: string;
  songs: ParsedSong[];
  compact?: boolean;
  creador?: Autor | null;
  editor?: Autor | null;
  /** La minuta es una copia: el chip dice "Duplicada por" en vez de "Creada por". */
  duplicada?: boolean;
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

export default function Portada({ date, songs, compact = false, creador, editor, duplicada = false }: PortadaProps) {
  const { t } = useI18n();
  const numerados = renumerar(songs);

  const renderSongLine = (s: ParsedSong, position: number) => (
    <div className={`flex items-baseline gap-1.5 ${compact ? 'text-xs' : 'text-sm'} ${s.found === false ? 'opacity-50' : ''}`}>
      <span className="text-muted-foreground font-medium shrink-0">{position} -</span>
      <span className="text-foreground font-medium">{s.title}</span>
      {s.key && <span translate="no" className="text-hymn-key font-semibold shrink-0 ml-1">{s.key}</span>}
      {s.hymnNumber && <span className="text-hymn-number font-medium shrink-0">({s.hymnNumber})</span>}
      {s.found === false && <span className="text-muted-foreground text-[10px] italic ml-1">{t.portada_not_found}</span>}
    </div>
  );

  return (
    <div className={`bg-card rounded-xl border border-border shadow-sm ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-start justify-between mb-4">
        <h2 className={`font-bold text-foreground ${compact ? 'text-base' : 'text-xl'}`}>{t.portada_title}</h2>
        <span className={`font-medium text-muted-foreground ${compact ? 'text-xs' : 'text-sm'}`}>{formatearFecha(date)}</span>
      </div>

      <div className={compact ? 'space-y-1' : 'space-y-2'}>
        {numerados.map((song, i) => {
          if (song.isPalabra) {
            return (
              <div key={`palabra-${i}`} className={compact ? 'py-1' : 'py-2'}>
                <span className={`font-semibold text-palabra ${compact ? 'text-xs' : 'text-sm'}`}>{t.portada_palabra}</span>
              </div>
            );
          }
          if (song.isOracion) {
            return (
              <div key={`oracion-${i}`} className={compact ? 'py-1' : 'py-2'}>
                <span className={`font-semibold text-oracion ${compact ? 'text-xs' : 'text-sm'}`}>{t.portada_oracion}</span>
              </div>
            );
          }
          if (song.groupedWith) {
            return (
              <div key={`${song.position}-${i}`} className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex flex-col items-start -translate-x-full pr-1 py-0.5">
                  <div className="w-[7px] h-[2.5px] rounded-full bg-border ml-auto" />
                  <div className="w-[2.5px] flex-1 bg-border rounded-full" />
                  <div className="w-[7px] h-[2.5px] rounded-full bg-border ml-auto" />
                </div>
                <div className={compact ? 'space-y-0.5' : 'space-y-1'}>
                  {renderSongLine(song, song.position)}
                  {renderSongLine({ ...song.groupedWith, found: song.groupedWith.found ?? true }, song.position + 1)}
                </div>
              </div>
            );
          }
          return <div key={`${song.position}-${i}`}>{renderSongLine(song, song.position)}</div>;
        })}
      </div>

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
