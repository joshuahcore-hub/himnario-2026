import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { getHymns, preloadHymnImageBoth, getThemedHymnImageUrl, imageCache, imageCacheDark } from '@/lib/hymnCache';
import { getFilteredNumbers } from '@/lib/hymnalState';
import { useI18n } from '@/lib/i18n/index';
import { useTheme } from '@/hooks/useTheme';
import ZoomableImage from '@/components/ZoomableImage';
import { CURVA_DESLIZAR, DURACION_DESLIZAR } from '@/lib/deslizar';
/**
 * Barra para saltar a cualquier himno sin pasar uno por uno (pedido de Josué): se arrastra el círculo (o se toca un
 * punto de la barra) y, al soltar, se salta a ese himno. Mientras se arrastra, una burbuja muestra número y título.
 * Recorre la misma lista que el carrusel (si hay filtros, solo los filtrados).
 */
function BarraHimnos({ total, indice, etiqueta, onVistaPrevia, onElegir }: {
  total: number;
  indice: number;
  etiqueta: (i: number) => string;
  onVistaPrevia: (i: number | null) => void;
  onElegir: (i: number) => void;
}) {
  const pista = useRef<HTMLDivElement>(null);
  const [arrastre, setArrastre] = useState<number | null>(null); // 0..1 mientras se arrastra
  const ultimo = Math.max(1, total - 1);
  const ratioDe = (x: number) => {
    const r = pista.current!.getBoundingClientRect();
    return Math.min(1, Math.max(0, (x - r.left) / r.width));
  };
  const mover = (ratio: number) => { setArrastre(ratio); onVistaPrevia(Math.round(ratio * ultimo)); };
  const soltar = () => {
    if (arrastre === null) return;
    const i = Math.round(arrastre * ultimo);
    setArrastre(null);
    onVistaPrevia(null);
    onElegir(i);
  };

  const ratio = arrastre ?? (total > 1 ? indice / ultimo : 0);
  const elegido = arrastre !== null ? Math.round(arrastre * ultimo) : null;

  return (
    <div
      className="relative h-10 flex items-center px-8 w-full max-w-lg mx-auto"
      style={{ touchAction: 'none' }}
      onPointerDown={e => { e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId); mover(ratioDe(e.clientX)); }}
      onPointerMove={e => { if (arrastre !== null) mover(ratioDe(e.clientX)); }}
      onPointerUp={soltar}
      onPointerCancel={() => { setArrastre(null); onVistaPrevia(null); }}
    >
      <div ref={pista} className="relative w-full h-1 rounded-full bg-foreground/10">
        {/* Parte recorrida */}
        <div className="absolute left-0 top-0 h-full rounded-full bg-primary/40"
             style={{ width: `${ratio * 100}%`, transition: arrastre !== null ? 'none' : 'width 220ms ease-out' }} />
        {/* Círculo: sigue el dedo; al soltar se queda donde quedó el himno elegido */}
        <div className="absolute top-1/2 rounded-full bg-primary shadow-md"
             style={{
               left: `${ratio * 100}%`,
               width: arrastre !== null ? 22 : 16, height: arrastre !== null ? 22 : 16,
               transform: 'translate(-50%, -50%)',
               transition: arrastre !== null ? 'width 150ms ease-out, height 150ms ease-out' : 'left 220ms ease-out, width 150ms ease-out, height 150ms ease-out',
             }} />
        {/* Burbuja con el himno al que se va a saltar */}
        {elegido !== null && (
          <div className="absolute bottom-full mb-4 -translate-x-1/2 max-w-[70vw] truncate rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-lg pointer-events-none animate-in fade-in zoom-in-95 duration-150"
               style={{ left: `${ratio * 100}%` }}>
            {etiqueta(elegido)}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [indiceDestino, setIndiceDestino] = useState<number | null>(null);
  // Himno que se está eligiendo en la barra (el contador lo muestra mientras se arrastra).
  const [vistaPrevia, setVistaPrevia] = useState<number | null>(null);
  const tituloDe = useMemo(() => new Map(initial.hymns.map(h => [h.hymn_number, h.title])), [initial]);

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
    setIndiceDestino(currentIndex - direction); // el contador cambia al soltar, no al terminar la animación
    const terminar = () => {
      terminarPaso.current = null; setIsAnimating(false); setDragX(0); setIndiceDestino(null); goTo(currentIndex - direction);
    };
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
      {/* Contador y, debajo, la barra para saltar a cualquier himno; todo encima de la barra de pestañas (h-16, z-50). */}
      <div className="absolute left-0 right-0 text-center pointer-events-none" style={{ bottom: 'calc(4rem + 2.75rem)' }}>
        <p className="text-muted-foreground/40 text-xs">{(vistaPrevia ?? indiceDestino ?? currentIndex) + 1} / {navNumbers.length}</p>
      </div>
      <div className="absolute left-0 right-0 z-20" style={{ bottom: 'calc(4rem + 0.25rem)' }}>
        <BarraHimnos
          total={navNumbers.length}
          indice={indiceDestino ?? currentIndex}
          etiqueta={i => `${navNumbers[i]} · ${tituloDe.get(navNumbers[i]) ?? ''}`}
          onVistaPrevia={setVistaPrevia}
          onElegir={i => {
            if (terminarPaso.current) terminarPaso.current();
            if (i !== currentIndex) goTo(i);
          }}
        />
      </div>
    </div>
  );
}
