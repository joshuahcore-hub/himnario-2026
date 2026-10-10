import { useRef, useCallback, useState } from 'react';
import { useI18n } from '@/lib/i18n/index';
import type { TempoFilter } from '@/lib/hymnalState';

interface TempoPickerProps {
  value: TempoFilter;
  onChange: (value: TempoFilter) => void;
}

const OPTIONS: TempoFilter[] = ['all', 'slow', 'fast'];
const ANIM_DURATION = 200;
const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

export default function TempoPicker({ value, onChange }: TempoPickerProps) {
  const { t } = useI18n();
  const gestureActive = useRef(false);
  const startX = useRef(0);
  const hasStepped = useRef(false);
  const animating = useRef(false);
  const [slideOffset, setSlideOffset] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [displayIdx, setDisplayIdx] = useState(OPTIONS.indexOf(value));

  const labels: Record<TempoFilter, string> = {
    all: t.hymnal_tempo_all,
    slow: t.hymnal_tempo_slow,
    fast: t.hymnal_tempo_fast,
  };

  const currentIdx = OPTIONS.indexOf(value);
  if (currentIdx !== displayIdx && slideOffset === 0 && !animating.current) {
    setDisplayIdx(currentIdx);
  }

  const ITEM_WIDTH = 120;

  const animateStep = useCallback((direction: 1 | -1) => {
    if (animating.current) return;
    const newIdx = displayIdx + direction;
    if (newIdx < 0 || newIdx >= OPTIONS.length) return;

    animating.current = true;

    // Immediately switch to new index — active styling correct from frame 1
    setTransitioning(false);
    setDisplayIdx(newIdx);
    setSlideOffset(direction * ITEM_WIDTH); // compensate so visual position unchanged
    onChange(OPTIONS[newIdx]);

    requestAnimationFrame(() => {
      setTransitioning(true);
      setSlideOffset(0); // animate to final position
      setTimeout(() => {
        setTransitioning(false);
        animating.current = false;
      }, ANIM_DURATION);
    });
  }, [displayIdx, onChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    gestureActive.current = true;
    hasStepped.current = false;
    startX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!gestureActive.current || hasStepped.current) return;
    const delta = startX.current - e.touches[0].clientX;
    if (Math.abs(delta) >= 30) {
      hasStepped.current = true;
      animateStep(delta > 0 ? 1 : -1);
    }
  }, [animateStep]);

  const handleTouchEnd = useCallback(() => {
    gestureActive.current = false;
    hasStepped.current = false;
  }, []);

  const prevIdx = displayIdx - 1;
  const nextIdx = displayIdx + 1;

  const transitionStyle = transitioning
    ? `transform ${ANIM_DURATION}ms ${EASING}`
    : 'none';

  return (
    <div
      className="relative w-full overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Top delimiter line with horizontal fade */}
      <div className="h-px" style={{ background: 'linear-gradient(to right, transparent 0%, hsl(var(--foreground) / 0.18) 25%, hsl(var(--foreground) / 0.18) 75%, transparent 100%)' }} />

      <div
        className="flex items-center justify-center"
        style={{
          transform: `translateX(${slideOffset}px)`,
          transition: transitionStyle,
        }}
      >
        {/* Left item */}
        <div className="flex-1 flex justify-center min-w-0">
          {prevIdx >= 0 ? (
            <button
              onClick={() => animateStep(-1)}
              className="text-sm text-muted-foreground opacity-50"
              style={{ transition: `opacity ${ANIM_DURATION}ms ${EASING}, font-size ${ANIM_DURATION}ms ${EASING}, color ${ANIM_DURATION}ms ${EASING}` }}
            >
              {labels[OPTIONS[prevIdx]]}
            </button>
          ) : <span />}
        </div>

        {/* Center item — selected */}
        <div className="flex-1 flex justify-center min-w-0">
          <span
            className="text-base font-bold text-foreground py-3"
            style={{ transition: `opacity ${ANIM_DURATION}ms ${EASING}, font-size ${ANIM_DURATION}ms ${EASING}, color ${ANIM_DURATION}ms ${EASING}` }}
          >
            {labels[OPTIONS[displayIdx]]}
          </span>
        </div>

        {/* Right item */}
        <div className="flex-1 flex justify-center min-w-0">
          {nextIdx < OPTIONS.length ? (
            <button
              onClick={() => animateStep(1)}
              className="text-sm text-muted-foreground opacity-50"
              style={{ transition: `opacity ${ANIM_DURATION}ms ${EASING}, font-size ${ANIM_DURATION}ms ${EASING}, color ${ANIM_DURATION}ms ${EASING}` }}
            >
              {labels[OPTIONS[nextIdx]]}
            </button>
          ) : <span />}
        </div>
      </div>

      {/* Bottom delimiter line with horizontal fade */}
      <div className="h-px" style={{ background: 'linear-gradient(to right, transparent 0%, hsl(var(--foreground) / 0.18) 25%, hsl(var(--foreground) / 0.18) 75%, transparent 100%)' }} />
    </div>
  );
}
