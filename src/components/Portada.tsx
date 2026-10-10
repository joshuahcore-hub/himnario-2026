import type { ParsedSong } from '@/lib/types';
import { useI18n } from '@/lib/i18n/index';

interface PortadaProps {
  date: string;
  songs: ParsedSong[];
  compact?: boolean;
  onDateClick?: (e: React.MouseEvent) => void;
}

export default function Portada({ date, songs, compact = false, onDateClick }: PortadaProps) {
  const { t } = useI18n();

  const formatDate = (d: string) => {
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]} - ${parts[1]} - ${parts[0]}`;
    return d;
  };

  return (
    <div className={`bg-card rounded-xl border border-border shadow-sm ${compact ? 'p-3' : 'p-5'}`}>
      <div className="flex items-start justify-between mb-4">
        <h2 className={`font-bold text-foreground ${compact ? 'text-base' : 'text-xl'}`}>
          {t.portada_title}
        </h2>
        <span
          className={`font-medium ${compact ? 'text-xs' : 'text-sm'} ${onDateClick ? 'text-primary underline underline-offset-2 cursor-pointer' : 'text-muted-foreground'}`}
          onClick={onDateClick ? (e) => { e.stopPropagation(); onDateClick(e); } : undefined}
        >
          {formatDate(date)}
        </span>
      </div>

      <div className={`space-y-${compact ? '1' : '2'}`}>
        {songs.map((song, i) => {
          if (song.isPalabra) {
            return (
              <div key={`palabra-${i}`} className={`${compact ? 'py-1' : 'py-2'}`}>
                <span className={`font-semibold text-palabra ${compact ? 'text-xs' : 'text-sm'}`}>
                  {t.portada_palabra}
                </span>
              </div>
            );
          }

          if (song.isOracion) {
            return (
              <div key={`oracion-${i}`} className={`${compact ? 'py-1' : 'py-2'}`}>
                <span className={`font-semibold text-oracion ${compact ? 'text-xs' : 'text-sm'}`}>
                  {t.portada_oracion}
                </span>
              </div>
            );
          }

          const hasGroup = !!song.groupedWith;

          const renderSongLine = (
            s: { title: string; key?: string | null; hymnNumber?: number | null; firstLine?: string; found?: boolean; psalmTitle?: boolean },
            position: number,
          ) => {
            const ps = s.psalmTitle && s.firstLine;
            return (
              <div className={`flex items-baseline gap-1.5 ${compact ? 'text-xs' : 'text-sm'} ${s.found === false ? 'opacity-50' : ''}`}>
                <span className="text-muted-foreground font-medium shrink-0">{position} -</span>
                <span className="text-foreground font-medium">
                  {s.title}
                  {ps && <span className="text-muted-foreground font-normal italic ml-1">({s.firstLine}...)</span>}
                </span>
                {s.key && <span className="text-hymn-key font-semibold shrink-0 ml-1">{s.key}</span>}
                {s.hymnNumber && <span className="text-hymn-number font-medium shrink-0">({s.hymnNumber})</span>}
                {s.found === false && <span className="text-muted-foreground text-[10px] italic ml-1">{t.portada_not_found}</span>}
              </div>
            );
          };

          if (hasGroup) {
            return (
              <div key={`${song.position}-${i}`} className="relative">
                <div className="absolute left-0 top-0 bottom-0 flex flex-col items-start -translate-x-full pr-1 py-0.5">
                  <div className="w-[7px] h-[2.5px] rounded-full bg-border ml-auto" />
                  <div className="w-[2.5px] flex-1 bg-border rounded-full" />
                  <div className="w-[7px] h-[2.5px] rounded-full bg-border ml-auto" />
                </div>
                <div className={`space-y-${compact ? '0.5' : '1'}`}>
                  {renderSongLine(song, song.position)}
                  {renderSongLine({ ...song.groupedWith!, found: song.groupedWith!.found ?? true }, song.position + 1)}
                </div>
              </div>
            );
          }

          return (
            <div key={`${song.position}-${i}`}>
              {renderSongLine(song, song.position)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
