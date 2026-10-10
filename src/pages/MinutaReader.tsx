import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Share2 } from 'lucide-react';
import type { MinutaData, ParsedSong } from '@/lib/types';
import Portada from '@/components/Portada';
import ZoomableImage from '@/components/ZoomableImage';
import { getThemedHymnImageUrl, preloadHymnImageBoth, imageCache, imageCacheDark } from '@/lib/hymnCache';
import { useTheme } from '@/hooks/useTheme';
import { getMinuta, guardarMinutaLocal } from '@/lib/minutaCache';
import { renumerar, textoParaCompartir, compartirPorWhatsApp, tituloVisible } from '@/lib/minutaUtils';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { useAcceso } from '@/hooks/useAcceso';

function SongPage({ song }: { song: ParsedSong }) {
  const [imgError, setImgError] = useState(false);
  const { theme } = useTheme();
  const { t } = useI18n();
  const hymnNumber = song.hymnNumber;

  useEffect(() => { setImgError(false); }, [hymnNumber, theme]);

  if (!hymnNumber || !song.found) {
    return (
      <div className="w-full max-w-sm bg-card rounded-xl border border-border p-6 text-center space-y-3">
        <h2 className="text-xl font-bold text-foreground">{song.title}</h2>
        {song.key && <p className="text-hymn-key font-semibold text-lg">{song.key}</p>}
        <p className="text-muted-foreground text-xs italic">{t.portada_not_found}</p>
      </div>
    );
  }

  const cache = theme === 'dark' ? imageCacheDark : imageCache;
  const cached = cache.get(hymnNumber);
  const imgUrl = cached?.complete ? cached.src : getThemedHymnImageUrl(hymnNumber, theme);

  return (
    <div className="w-full max-w-lg flex flex-col items-center gap-3">
      <div className="text-center">
        <p className="text-sm font-semibold text-hymn-number">#{hymnNumber}</p>
        <h2 className="text-lg font-bold text-foreground">{song.title}</h2>
        {song.key && <p translate="no" className="font-semibold text-hymn-key">{song.key}</p>}
      </div>
      {imgError ? (
        <div className="w-full bg-card rounded-xl border border-border p-6 text-center space-y-2">
          {song.firstLine && <p className="text-muted-foreground text-sm italic">{song.firstLine}</p>}
        </div>
      ) : (
        <ZoomableImage
          src={imgUrl}
          alt={`${song.title} - #${hymnNumber}`}
          className="w-full rounded-lg shadow-sm"
          onError={() => setImgError(true)}
        />
      )}
    </div>
  );
}

/** Cada canto (y cada canto agrupado) es una página; PALABRA y ORACIÓN también. */
function paginasDe(cantos: ParsedSong[]): ParsedSong[] {
  return renumerar(cantos).flatMap(c => (c.groupedWith ? [c, c.groupedWith] : [c]));
}

export default function MinutaReader() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { puedeEditar } = useAcceso();
  const [minuta, setMinuta] = useState<MinutaData | null>(() => (id ? getMinuta(id) ?? null : null));
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartRef = useRef(0);

  useEffect(() => {
    if (!id) return;
    api<MinutaData>(`minutas/${id}`)
      .then(m => { setMinuta(m); guardarMinutaLocal(m); })
      .catch(() => { if (!getMinuta(id)) setNoEncontrada(true); });
  }, [id]);

  const swipeItems = minuta ? paginasDe(minuta.cantos) : [];
  const totalPages = swipeItems.length + 1;

  useEffect(() => {
    swipeItems.forEach(s => { if (s.hymnNumber) preloadHymnImageBoth(s.hymnNumber); });
  }, [minuta]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && currentPage < totalPages - 1) setCurrentPage(p => p + 1);
      else if (e.key === 'ArrowLeft' && currentPage > 0) setCurrentPage(p => p - 1);
      else if (e.key === 'Escape') navigate('/minutas');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, navigate]);

  if (!minuta) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4 px-6 text-center">
        <p className="text-muted-foreground">{noEncontrada ? t.minuta_not_found : t.minutas_loading}</p>
        {noEncontrada && (
          <button onClick={() => navigate('/minutas')} className="text-primary text-sm underline">{t.minutas_title}</button>
        )}
      </div>
    );
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isAnimating) return;
    touchStartRef.current = e.touches[0].clientX;
    setIsDragging(true);
    setDragX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isAnimating) return;
    const dx = e.touches[0].clientX - touchStartRef.current;
    const atEdge = (dx > 0 && currentPage === 0) || (dx < 0 && currentPage === totalPages - 1);
    setDragX(atEdge ? dx * 0.3 : dx);
  };

  const animateSlide = (direction: number) => {
    setIsAnimating(true);
    setDragX(direction * window.innerWidth);
    setTimeout(() => {
      setIsAnimating(false);
      setDragX(0);
      setCurrentPage(p => p - direction);
    }, 250);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    const threshold = window.innerWidth * 0.08;
    if (dragX < -threshold && currentPage < totalPages - 1) animateSlide(-1);
    else if (dragX > threshold && currentPage > 0) animateSlide(1);
    else {
      setIsAnimating(true);
      setDragX(0);
      setTimeout(() => setIsAnimating(false), 250);
    }
  };

  const itemAt = (page: number) => (page > 0 && page < totalPages ? swipeItems[page - 1] : null);

  const carouselStyle: React.CSSProperties = {
    transform: `translateX(${isDragging || isAnimating ? dragX : 0}px)`,
    transition: isAnimating ? 'transform 250ms ease-out' : 'none',
    willChange: 'transform',
  };

  const renderPage = (pageIdx: number, offset: number) => {
    if (pageIdx < 0 || pageIdx >= totalPages) return null;
    const item = itemAt(pageIdx);
    return (
      <div className="absolute inset-0 flex items-center justify-center p-5 overflow-y-auto" style={{ transform: `translateX(${offset * 100}%)` }}>
        {pageIdx === 0 ? (
          <div className="w-full max-w-sm">
            <Portada date={minuta.fecha} songs={minuta.cantos} creador={minuta.creador} editor={minuta.editor} />
          </div>
        ) : item?.isPalabra ? (
          <span className="text-3xl font-bold text-palabra">{t.portada_palabra}</span>
        ) : item?.isOracion ? (
          <span className="text-3xl font-bold text-oracion">{t.portada_oracion}</span>
        ) : item ? (
          <SongPage song={item} />
        ) : null}
      </div>
    );
  };

  const compartir = () => compartirPorWhatsApp(textoParaCompartir(minuta, window.location.origin));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border z-10 relative"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
        <button onClick={() => navigate('/minutas')} className="tap-btn-overlay text-foreground p-1" aria-label={t.minutas_title}>
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate">{tituloVisible(minuta)}</p>
          <p className="text-[10px] text-muted-foreground">{currentPage + 1} / {totalPages}</p>
        </div>
        <button onClick={compartir} className="tap-btn p-1.5 rounded-lg text-muted-foreground" aria-label={t.minuta_share}>
          <Share2 size={16} />
        </button>
        {puedeEditar && (
          <button onClick={() => navigate(`/editar/${minuta.id}`)} className="tap-btn p-1.5 rounded-lg text-muted-foreground" aria-label={t.create_edit}>
            <Pencil size={16} />
          </button>
        )}
      </div>

      <div
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <div className="absolute inset-0" style={carouselStyle}>
          {renderPage(currentPage - 1, -1)}
          {renderPage(currentPage, 0)}
          {renderPage(currentPage + 1, 1)}
        </div>
      </div>

      <div className="flex justify-center gap-1.5 pb-6 pt-2 flex-wrap px-4">
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === currentPage ? 'bg-foreground w-4' : 'bg-muted-foreground/30'}`}
            aria-label={`${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
