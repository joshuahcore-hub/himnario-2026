import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import type { MinutaData, ParsedSong } from '@/lib/types';
import Portada from '@/components/Portada';
import Zoomable from '@/components/Zoomable';
import HimnoRecortado from '@/components/HimnoRecortado';
import { getThemedHymnImageUrl, preloadHymnImageBoth, imageCache, imageCacheDark } from '@/lib/hymnCache';
import { useTheme } from '@/hooks/useTheme';
import { useHorizontal, puedeGirar, girarPantalla } from '@/hooks/useHorizontal';
import { RotateCwSquare } from 'lucide-react';
import { getMinuta, guardarMinutaLocal } from '@/lib/minutaCache';
import { renumerar } from '@/lib/minutaUtils';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { CURVA_DESLIZAR, DURACION_DESLIZAR, direccionFirme, UMBRAL_LADO } from '@/lib/deslizar';
function SongPage({ song, horizontal }: { song: ParsedSong; horizontal: boolean }) {
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
  // Celular girado: la letra a todo el ancho; la página se recorre hacia abajo.
  if (horizontal) {
    return (
      // Sin encabezado (Josué, 1.6.2): la imagen ya trae número y título; todo el alto para la letra.
      <Zoomable className="w-full m-auto" reiniciarCon={hymnNumber}>
        <div className="w-full flex flex-col items-center pt-3">
          {imgError ? (
            song.firstLine && <p className="py-8 px-4 text-center text-muted-foreground text-sm italic">{song.firstLine}</p>
          ) : (
            <HimnoRecortado num={hymnNumber} src={imgUrl} alt={`${song.title} - #${hymnNumber}`} onError={() => setImgError(true)} />
          )}
        </div>
      </Zoomable>
    );
  }
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
  const horizontal = useHorizontal();
  const [minuta, setMinuta] = useState<MinutaData | null>(() => (id ? getMinuta(id) ?? null : null));
  const [noEncontrada, setNoEncontrada] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  // Página hacia la que va la animación: el contador y los puntitos cambian en el instante de soltar, no al terminar.
  const [paginaDestino, setPaginaDestino] = useState<number | null>(null);
  // El deslizamiento mueve la tira DIRECTAMENTE (style), sin estado de React: no se redibujan las páginas en cada
  // movimiento del dedo y se ve fluido (Josué, 1.5.3).
  const carruselRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const arrastrando = useRef(false);
  const animando = useRef(false);
  const dragXRef = useRef(0);
  const moverCarrusel = (px: number, animar: boolean) => {
    const el = carruselRef.current;
    if (!el) return;
    el.style.transition = animar ? `transform ${DURACION_DESLIZAR}ms ${CURVA_DESLIZAR}` : 'none';
    el.style.transform = `translateX(${px}px)`;
  };
  const touchStartRef = useRef(0);
  const touchStartYRef = useRef(0);
  /** null: aún no se sabe; true: cambiar de página; false: recorrer hacia abajo (la página no se mueve al lado). */
  const lateralRef = useRef<boolean | null>(null);
  /** Completa ya el paso a otra página que se está animando (null si no hay ninguno). */
  const terminarPaso = useRef<null | (() => void)>(null);

  // Siempre a pantalla completa (Josué, 1.5.6): sin barra de arriba, ni compartir, ni puntitos; solo las canciones.
  // Se sale con "atrás" del celular (o Esc), que vuelve a la lista. Sin Fullscreen API (mostraba un aviso de Android).
  const pantallaCompleta = true;

  // En cuanto el gesto es lateral se bloquea el desplazamiento nativo hacia abajo: si no, el celular reparte el
  // gesto y la página se mueve "con cortes" (Josué, 1.6.3). Escucha nativa no pasiva (la de React no puede bloquear).
  const hayMinuta = !!minuta;
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const bloquear = (e: TouchEvent) => { if (arrastrando.current && lateralRef.current === true && e.cancelable) e.preventDefault(); };
    el.addEventListener('touchmove', bloquear, { passive: false });
    return () => el.removeEventListener('touchmove', bloquear);
  }, [hayMinuta]);

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
    else if (animando.current) return;
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    lateralRef.current = null;
    arrastrando.current = true;
    dragXRef.current = 0;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!arrastrando.current) return;
    let dx = e.touches[0].clientX - touchStartRef.current;
    if (lateralRef.current === null) {
      // Solo un gesto CLARAMENTE lateral cambia de página; si va hacia abajo, queda fijo así hasta soltar (1.6.3).
      const dir = direccionFirme(dx, e.touches[0].clientY - touchStartYRef.current);
      if (dir === null) return;
      lateralRef.current = dir;
      touchStartRef.current += Math.sign(dx) * UMBRAL_LADO; // arranca desde 0, sin salto
      dx = e.touches[0].clientX - touchStartRef.current;
    }
    if (!lateralRef.current) return;
    const atEdge = (dx > 0 && currentPage === 0) || (dx < 0 && currentPage === totalPages - 1);
    dragXRef.current = atEdge ? dx * 0.3 : dx;
    moverCarrusel(dragXRef.current, false);
  };

  const animateSlide = (direction: number) => {
    animando.current = true;
    moverCarrusel(direction * window.innerWidth, true);
    setPaginaDestino(currentPage - direction);
    const terminar = () => {
      terminarPaso.current = null;
      animando.current = false;
      dragXRef.current = 0;
      // La página nueva queda dibujada al centro y la tira vuelve a 0 en el mismo instante (sin parpadeo).
      flushSync(() => { setPaginaDestino(null); setCurrentPage(p => p - direction); });
      moverCarrusel(0, false);
    };
    const timer = setTimeout(terminar, DURACION_DESLIZAR);
    terminarPaso.current = () => { clearTimeout(timer); terminar(); };
  };

  const handleTouchEnd = () => {
    if (!arrastrando.current) return;
    arrastrando.current = false;
    const dragX = dragXRef.current;
    const threshold = window.innerWidth * 0.08;
    if (dragX < -threshold && currentPage < totalPages - 1) animateSlide(-1);
    else if (dragX > threshold && currentPage > 0) animateSlide(1);
    else if (dragX !== 0) {
      dragXRef.current = 0;
      animando.current = true;
      moverCarrusel(0, true);
      setTimeout(() => { animando.current = false; }, DURACION_DESLIZAR);
    }
  };

  const paginaVisible = paginaDestino ?? currentPage;
  const itemAt = (page: number) => (page > 0 && page < totalPages ? swipeItems[page - 1] : null);


  const renderPage = (pageIdx: number, offset: number) => {
    if (pageIdx < 0 || pageIdx >= totalPages) return null;
    const item = itemAt(pageIdx);
    const esCanto = !!item && !item.isPalabra && !item.isOracion;
    // key: cada página con su propio nodo (en horizontal cada una guarda su desplazamiento y empieza arriba).
    const clase = horizontal
      ? `absolute inset-0 flex overflow-y-auto overflow-x-hidden ${esCanto ? 'pb-6' : 'p-5'}`
      : `absolute inset-0 flex items-center justify-center ${esCanto ? '' : 'p-5 overflow-y-auto'}`;
    return (
      <div
        key={pageIdx}
        className={clase}
        style={{
          transform: `translateX(${offset * 100}%)`,
          ...(horizontal && { overscrollBehavior: 'contain', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }),
        }}
      >
        {pageIdx === 0 ? (
          // Portada sin recuadro, directo sobre el fondo, como las páginas de las canciones (Josué, 1.5.1).
          // m-auto: centrada, y si no cabe (horizontal) empieza arriba en vez de cortarse.
          <div className="w-full max-w-sm m-auto">
            <Portada date={minuta.fecha} songs={minuta.cantos} plano />
          </div>
        ) : item?.isPalabra ? (
          <span className="m-auto text-3xl font-bold text-palabra">{t.portada_palabra}</span>
        ) : item?.isOracion ? (
          <span className="m-auto text-3xl font-bold text-oracion">{t.portada_oracion}</span>
        ) : item ? (
          <SongPage song={item} horizontal={horizontal} />
        ) : null}
      </div>
    );
  };

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />

      <div
        ref={areaRef}
        className="flex-1 relative overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ touchAction: 'pan-y' }}
      >
        <div ref={carruselRef} className="absolute inset-0" style={{ transform: 'translateX(0px)', willChange: 'transform' }}>
          {renderPage(currentPage - 1, -1)}
          {renderPage(currentPage, 0)}
          {renderPage(currentPage + 1, 1)}
        </div>
        {/* Girar a horizontal (o volver a vertical) con un toque (Josué, 1.6.1). Discreto, para no tapar la letra. */}
        {puedeGirar && (
          <button onClick={() => girarPantalla(horizontal)} onTouchStart={e => e.stopPropagation()} aria-label="Girar"
                  className="tap-btn-overlay absolute top-2 right-2 z-20 p-2 rounded-full bg-card/70 backdrop-blur-sm border border-border text-foreground/70">
            <RotateCwSquare size={18} />
          </button>
        )}
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
