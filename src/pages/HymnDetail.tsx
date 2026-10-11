import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getHymns, preloadHymnImageBoth, getThemedHymnImageUrl, imageCache, imageCacheDark } from '@/lib/hymnCache';
import { getFilteredNumbers } from '@/lib/hymnalState';
import { useI18n } from '@/lib/i18n/index';
import { useTheme } from '@/hooks/useTheme';
import ZoomableImage from '@/components/ZoomableImage';

// Paso de un himno a otro amortiguado (como el carrusel de minutas): arranca rápido y se frena suave al llegar,
// en vez de llegar y "chocar" (antes 250 ms ease-out).
const DURACION_DESLIZAR = 420;
const CURVA_DESLIZAR = 'cubic-bezier(0.22, 1, 0.36, 1)';

export default function HymnDetail() {
  const { number } = useParams<{ number: string }>();
  const navigate = useNavigate();
  const hymnNumber = Number(number);
  const { t } = useI18n();
  const { theme } = useTheme();

  const initial = getHymns();
  const [navNumbers, setNavNumbers] = useState<number[]>(() => {
    const filtered = getFilteredNumbers();
    if (filtered.length > 0 && filtered.includes(hymnNumber)) return filtered;
    return initial.hymns.map(h => h.hymn_number);
  });
  const [currentIndex, setCurrentIndex] = useState(() => {
    const idx = navNumbers.indexOf(hymnNumber);
    return idx >= 0 ? idx : 0;
  });
  const [dragX, setDragX] = useState(0);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isDismissing, setIsDismissing] = useState(false);
  const touchStartRef = useRef(0);
  const touchStartYRef = useRef(0);
  const isHorizontalRef = useRef<boolean | null>(null);
  /** Completa ya el paso a otro himno que se está animando (null si no hay ninguno). */
  const terminarPaso = useRef<null | (() => void)>(null);

  useEffect(() => {
    if (navNumbers.length === 0) return;
    const idx = navNumbers.indexOf(hymnNumber);
    if (idx >= 0 && idx !== currentIndex) setCurrentIndex(idx);
  }, [hymnNumber, navNumbers]);

  useEffect(() => {
    if (navNumbers.length === 0 || currentIndex < 0) return;
    for (let d = -5; d <= 5; d++) {
      const i = currentIndex + d;
      if (i >= 0 && i < navNumbers.length) preloadHymnImageBoth(navNumbers[i]);
    }
  }, [currentIndex, navNumbers]);

  const goTo = useCallback((newIndex: number) => {
    if (newIndex < 0 || newIndex >= navNumbers.length) return;
    setCurrentIndex(newIndex);
    navigate(`/hymnal/${navNumbers[newIndex]}`, { replace: true });
  }, [navNumbers, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentIndex(i => {
          const next = i + 1;
          if (next >= navNumbers.length) return i;
          navigate(`/hymnal/${navNumbers[next]}`, { replace: true });
          return next;
        });
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentIndex(i => {
          const prev = i - 1;
          if (prev < 0) return i;
          navigate(`/hymnal/${navNumbers[prev]}`, { replace: true });
          return prev;
        });
      } else if (e.key === 'Escape') {
        navigate('/hymnal');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navNumbers, navigate]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Si todavía se está frenando el paso anterior y se toca de nuevo, se completa al instante (pasar rápido varios).
    if (terminarPaso.current) terminarPaso.current();
    else if (isAnimating) return;
    if (isDismissing) return;
    touchStartRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isHorizontalRef.current = null;
    setIsDragging(true);
    setDragX(0);
    setDragY(0);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || isDismissing) return;
    const dx = e.touches[0].clientX - touchStartRef.current;
    const dy = e.touches[0].clientY - touchStartYRef.current;
    if (isHorizontalRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) isHorizontalRef.current = Math.abs(dx) > Math.abs(dy);
      return;
    }
    // Vertical: hacia abajo o hacia arriba, la imagen sigue al dedo y al soltar sale (vuelve al himnario).
    if (!isHorizontalRef.current) { setDragY(dy); return; }
    e.preventDefault();
    const atEdge = (dx > 0 && currentIndex === 0) || (dx < 0 && currentIndex === navNumbers.length - 1);
    setDragX(atEdge ? dx * 0.3 : dx);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (Math.abs(dragY) > 80) { setIsDismissing(true); setTimeout(() => navigate('/hymnal'), 280); return; }
    if (dragY !== 0) { setDragY(0); return; }
    const threshold = window.innerWidth * 0.08;
    if (dragX < -threshold && currentIndex < navNumbers.length - 1) animateSlide(-1);
    else if (dragX > threshold && currentIndex > 0) animateSlide(1);
    else { setIsAnimating(true); setDragX(0); setTimeout(() => setIsAnimating(false), DURACION_DESLIZAR); }
  };

  const animateSlide = (direction: number) => {
    const w = window.innerWidth;
    setIsAnimating(true);
    setDragX(direction * w);
    const terminar = () => { terminarPaso.current = null; setIsAnimating(false); setDragX(0); goTo(currentIndex - direction); };
    const timer = setTimeout(terminar, DURACION_DESLIZAR);
    terminarPaso.current = () => { clearTimeout(timer); terminar(); };
  };

  const currentNum = navNumbers[currentIndex];
  const prevNum = currentIndex > 0 ? navNumbers[currentIndex - 1] : null;
  const nextNum = currentIndex < navNumbers.length - 1 ? navNumbers[currentIndex + 1] : null;

  const handleEdgeSwipe = useCallback((direction: 'left' | 'right') => {
    if (direction === 'left' && currentIndex > 0) {
      goTo(currentIndex - 1);
    } else if (direction === 'right' && currentIndex < navNumbers.length - 1) {
      goTo(currentIndex + 1);
    }
  }, [currentIndex, navNumbers.length, goTo]);

  const renderSlide = (num: number | null, offset: number) => {
    if (num === null) return null;
    const cache = theme === 'dark' ? imageCacheDark : imageCache;
    const cached = cache.get(num);
    const src = cached?.complete ? cached.src : getThemedHymnImageUrl(num, theme);
    return (
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ transform: `translateX(${offset * 100}%)` }}>
        <ZoomableImage
          src={src}
          alt={`${t.hymn_alt}${num}`}
          className="w-full max-w-lg max-h-full object-contain"
          onEdgeSwipe={handleEdgeSwipe}
        />
      </div>
    );
  };

  if (navNumbers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground animate-pulse">{t.hymnal_loading_short}</p>
      </div>
    );
  }

  const translatePx = isDragging || isAnimating ? dragX : 0;
  const carouselStyle: React.CSSProperties = {
    transform: `translateX(${translatePx}px)`,
    transition: isAnimating ? `transform ${DURACION_DESLIZAR}ms ${CURVA_DESLIZAR}` : 'none',
    willChange: 'transform',
  };

  // Al salir, se va por el lado hacia donde se deslizó (abajo o arriba).
  const distancia = Math.abs(dragY);
  const dismissProgress = isDismissing ? 1 : distancia / 300;
  const outerStyle: React.CSSProperties = {
    transform: isDismissing ? `translateY(${dragY < 0 ? '-' : ''}100vh) scale(0.85)`
      : distancia > 0 ? `translateY(${dragY}px) scale(${Math.max(0.88, 1 - distancia / 2000)})` : 'none',
    opacity: isDismissing ? 0 : distancia > 0 ? Math.max(0.3, 1 - dismissProgress) : 1,
    transition: !isDragging || isDismissing ? 'all 280ms ease-out' : 'none',
    borderRadius: distancia > 0 || isDismissing ? '16px' : '0',
    overflow: 'hidden',
  };

  return (
    // bg-background: el mismo fondo que tienen ahora las imágenes de los himnos (sin recuadro visible).
    <div className="fixed inset-0 z-40 bg-background" style={outerStyle}>
      <div className="absolute top-3 left-3 z-20">
        <button onClick={() => navigate('/hymnal')} className="tap-btn-overlay p-2 rounded-full bg-card/80 backdrop-blur-sm border border-border text-foreground">
          <ArrowLeft size={20} />
        </button>
      </div>
      <div className="absolute inset-0" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} style={{ touchAction: 'none' }}>
        <div className="absolute inset-0" style={carouselStyle}>
          {renderSlide(prevNum, -1)}
          {renderSlide(currentNum, 0)}
          {renderSlide(nextNum, 1)}
        </div>
      </div>
      {/* Contador justo encima de la barra de pestañas (h-16, z-50), que lo tapaba. */}
      <div className="absolute left-0 right-0 text-center pointer-events-none" style={{ bottom: 'calc(4rem + 0.5rem)' }}>
        <p className="text-muted-foreground/40 text-xs">{currentIndex + 1} / {navNumbers.length}</p>
      </div>
    </div>
  );
}
