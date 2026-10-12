import { useRef, useState, useCallback, useEffect } from 'react';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  onError?: () => void;
  onEdgeSwipe?: (direction: 'left' | 'right') => void;
}

export default function ZoomableImage({ src, alt, className, onError, onEdgeSwipe }: ZoomableImageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const initialDistance = useRef(0);
  const initialScale = useRef(1);
  const panStart = useRef({ x: 0, y: 0 });
  const isPinching = useRef(false);
  const isPanning = useRef(false);
  const edgeOverflow = useRef(0);

  // Reset zoom when src changes
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [src]);

  const getDistance = (t1: React.Touch, t2: React.Touch) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

  const clampTranslate = useCallback((x: number, y: number, s: number) => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || s <= 1) return { x: 0, y: 0 };

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    // The image is rendered at container width, so scaled dimensions:
    const imgW = cw * s;
    const imgH = (img.naturalHeight / img.naturalWidth) * cw * s;

    const maxX = Math.max(0, (imgW - cw) / 2);
    const maxY = Math.max(0, (imgH - ch) / 2);

    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.stopPropagation();
      isPinching.current = true;
      initialDistance.current = getDistance(e.touches[0], e.touches[1]);
      initialScale.current = scale;
    } else if (e.touches.length === 1 && scale > 1) {
      e.stopPropagation();
      isPanning.current = true;
      edgeOverflow.current = 0;
      panStart.current = { x: e.touches[0].clientX - translate.x, y: e.touches[0].clientY - translate.y };
    }
  }, [scale, translate]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isPinching.current && e.touches.length === 2) {
      e.stopPropagation();
      e.preventDefault();
      const dist = getDistance(e.touches[0], e.touches[1]);
      const newScale = Math.min(4, Math.max(1, initialScale.current * (dist / initialDistance.current)));
      setScale(newScale);
      if (newScale <= 1) {
        setTranslate({ x: 0, y: 0 });
      } else {
        setTranslate(prev => clampTranslate(prev.x, prev.y, newScale));
      }
    } else if (isPanning.current && e.touches.length === 1 && scale > 1) {
      e.stopPropagation();
      const rawX = e.touches[0].clientX - panStart.current.x;
      const rawY = e.touches[0].clientY - panStart.current.y;
      const clamped = clampTranslate(rawX, rawY, scale);

      // Check if at horizontal edge
      if (rawX !== clamped.x) {
        // At edge — track overflow for edge swipe
        edgeOverflow.current = rawX - clamped.x;
      } else {
        edgeOverflow.current = 0;
      }

      setTranslate(clamped);
    }
  }, [scale, clampTranslate]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2) isPinching.current = false;
    if (e.touches.length < 1) {
      isPanning.current = false;
      // Check edge swipe threshold
      const threshold = 60;
      if (Math.abs(edgeOverflow.current) > threshold && onEdgeSwipe) {
        onEdgeSwipe(edgeOverflow.current > 0 ? 'left' : 'right');
        // Reset zoom after navigation
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
      edgeOverflow.current = 0;

      if (scale <= 1.05) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
    }
  }, [scale, onEdgeSwipe]);

  const handleDoubleClick = useCallback(() => {
    if (scale > 1) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }, [scale]);

  const isZoomed = scale > 1;

  return (
    <div
      ref={containerRef}
      // flex + justify-center: en pantallas anchas la imagen (máx. max-w-lg) queda centrada, no pegada a la izquierda.
      className="w-full overflow-hidden rounded-lg flex justify-center"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: isZoomed ? 'none' : 'pan-y' }}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={className}
        onError={onError}
        draggable={false}
        style={{
          transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
          transformOrigin: 'center center',
          transition: isPinching.current || isPanning.current ? 'none' : 'transform 200ms ease-out',
        }}
      />
    </div>
  );
}
