import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Maximize2, Share2 } from 'lucide-react';
import type { MinutaData, ParsedSong } from '@/lib/types';
import Portada from '@/components/Portada';
import Zoomable from '@/components/Zoomable';
import { getThemedHymnImageUrl, preloadHymnImageBoth, imageCache, imageCacheDark } from '@/lib/hymnCache';
import { useTheme } from '@/hooks/useTheme';
import { getMinuta, guardarMinutaLocal } from '@/lib/minutaCache';
import { renumerar, textoParaCompartir, compartirPorWhatsApp, tituloVisible } from '@/lib/minutaUtils';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { CURVA_DESLIZAR, DURACION_DESLIZAR } from '@/lib/deslizar';
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

  // Toda la página es una sola imagen: el número, el título y el tono arriba y la letra con acordes abajo,
  // sobre el mismo fondo (las imágenes tienen el fondo exacto de la app). El zoom amplía todo junto.
  return (
    <Zoomable className="w-full h-full" reiniciarCon={hymnNumber}>
      <div className="h-full w-full flex flex-col items-center px-2">
        <div className="text-center shrink-0 pt-4">
          <p className="text-sm font-semibold text-hymn-number">#{hymnNumber}</p>
          <h2 className="text-lg font-bold text-foreground">{song.title}</h2>
          {song.key && <p translate="no" className="font-semibold text-hymn-key">{song.key}</p>}
        </div>
        {imgError ? (
          <div className="flex-1 flex items-center px-4 text-center">
            {song.firstLine && <p className="text-muted-foreground text-sm italic">{song.firstLine}</p>}
          </div>
        ) : (
          <img
            src={imgUrl}
            alt={`${song.title} - #${hymnNumber}`}
            className="w-full max-w-lg flex-1 min-h-0 object-contain"
            draggable={false}
            onError={() => setImgError(true)}
          />
        )}
      </div>
    </Zoomable>
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
  const [minuta, setMinuta] = useState<MinutaData | null>(() => (id ? getMinuta(id) ?? null : null));
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  // Página hacia la que va la animación: el contador y los puntitos cambian en el instante de soltar, no al terminar.
  const [paginaDestino, setPaginaDestino] = useState<number | null>(null);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartRef = useRef(0);
  /** Completa ya el paso a otra página que se está animando (null si no hay ninguno). */
  const terminarPaso = useRef<null | (() => void)>(null);

  // Pantalla completa: sin barra de arriba ni puntitos; solo las canciones. Se sale con "atrás" del celular (o Esc).
  // Sin la Fullscreen API del navegador (1.5.1): esa mostraba el aviso de Android "desliza para salir de pantalla
  // completa", que Josué no quería; y tampoco hay botón para salir (pidió salir solo con "atrás").
  const [pantallaCompleta, setPantallaCompleta] = useState(false);
  const entrarPantallaCompleta = () => {
    history.pushState({ pantallaCompleta: true }, '');
    setPantallaCompleta(true);
  };
  useEffect(() => {
    if (!pantallaCompleta) return;
    const alVolver = () => setPantallaCompleta(false);
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, [pantallaCompleta]);

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
      else if (e.key === 'Escape') { if (pantallaCompleta) history.back(); else navigate('/minutas'); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, totalPages, navigate, pantallaCompleta]);

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
    // Si todavía se está frenando el paso anterior y se toca de nuevo, se completa al instante (pasar varios rápido).
    if (terminarPaso.current) terminarPaso.current();
    else if (isAnimating) return;
    touchStartRef.current = e.touches[0].clientX;
    setIsDragging(true);
    setDragX(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const dx = e.touches[0].clientX - touchStartRef.current;
    const atEdge = (dx > 0 && currentPage === 0) || (dx < 0 && currentPage === totalPages - 1);
    setDragX(atEdge ? dx * 0.3 : dx);
  };

  const animateSlide = (direction: number) => {
    setIsAnimating(true);
    setDragX(direction * window.innerWidth);
    setPaginaDestino(currentPage - direction);
    const terminar = () => {
      terminarPaso.current = null;
      setIsAnimating(false);
      setDragX(0);
      setPaginaDestino(null);
      setCurrentPage(p => p - direction);
    };
    const timer = setTimeout(terminar, DURACION_DESLIZAR);
    terminarPaso.current = () => { clearTimeout(timer); terminar(); };
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
      setTimeout(() => setIsAnimating(false), DURACION_DESLIZAR);
    }
  };

  const paginaVisible = paginaDestino ?? currentPage;
  const itemAt = (page: number) => (page > 0 && page < totalPages ? swipeItems[page - 1] : null);

  const carouselStyle: React.CSSProperties = {
    transform: `translateX(${isDragging || isAnimating ? dragX : 0}px)`,
    transition: isAnimating ? `transform ${DURACION_DESLIZAR}ms ${CURVA_DESLIZAR}` : 'none',
    willChange: 'transform',
  };

  const renderPage = (pageIdx: number, offset: number) => {
    if (pageIdx < 0 || pageIdx >= totalPages) return null;
    const item = itemAt(pageIdx);
    const esCanto = !!item && !item.isPalabra && !item.isOracion;
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center ${esCanto ? '' : 'p-5 overflow-y-auto'}`}
        style={{ transform: `translateX(${offset * 100}%)` }}
      >
        {pageIdx === 0 ? (
          // Portada sin recuadro, directo sobre el fondo, como las páginas de las canciones (Josué, 1.5.1).
          <div className="w-full max-w-sm">
            <Portada date={minuta.fecha} songs={minuta.cantos} plano />
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
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      {pantallaCompleta ? (
        <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 bg-card/80 backdrop-blur-sm border-b border-border z-10 relative"
             style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' }}>
          <button onClick={() => navigate('/minutas')} className="tap-btn-overlay text-foreground p-1" aria-label={t.minutas_title}>
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">{tituloVisible(minuta)}</p>
            <p className="text-[10px] text-muted-foreground">{paginaVisible + 1} / {totalPages}</p>
          </div>
          <button onClick={entrarPantallaCompleta} className="tap-btn p-1.5 rounded-lg text-muted-foreground" aria-label={t.minuta_fullscreen}>
            <Maximize2 size={16} />
          </button>
          <button onClick={compartir} className="tap-btn p-1.5 rounded-lg text-muted-foreground" aria-label={t.minuta_share}>
            <Share2 size={16} />
          </button>
          {/* Editar se hace desde la lista de minutas (mantener presionada → lápiz), no desde aquí. */}
        </div>
      )}

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

      <div className={`flex justify-center gap-1.5 pb-6 pt-2 flex-wrap px-4 ${pantallaCompleta ? 'hidden' : ''}`}>
        {Array.from({ length: totalPages }, (_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i)}
            className={`w-2 h-2 rounded-full transition-all ${i === paginaVisible ? 'bg-foreground w-4' : 'bg-muted-foreground/30'}`}
            aria-label={`${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
