import { useRef, useEffect, useCallback, useState } from 'react';

const ITEM_HEIGHT = 40;
const VISIBLE_ITEMS = 3;
const ANIM_DURATION = 200;
const EASING = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)';

interface ScrollWheelProps {
  items: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width?: string;
}

export default function ScrollWheel({ items, selectedIndex, onChange, width = 'w-12' }: ScrollWheelProps) {
  const animating = useRef(false);
  const gestureActive = useRef(false);
  const startY = useRef(0);
  const hasStepped = useRef(false);

  const totalItems = items.length;

  const stepBy = useCallback((direction: 1 | -1) => {
    if (animating.current) return;
    const newIdx = selectedIndex + direction;
    if (newIdx < 0 || newIdx >= totalItems) return;
    animating.current = true;
    onChange(newIdx);
    setTimeout(() => { animating.current = false; }, ANIM_DURATION);
  }, [selectedIndex, totalItems, onChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    gestureActive.current = true;
    hasStepped.current = false;
    startY.current = e.touches[0].clientY;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!gestureActive.current || hasStepped.current) return;
    e.preventDefault();
    const delta = startY.current - e.touches[0].clientY;
    if (Math.abs(delta) >= 20) {
      hasStepped.current = true;
      stepBy(delta > 0 ? 1 : -1);
    }
  }, [stepBy]);

  const handleTouchEnd = useCallback(() => {
    gestureActive.current = false;
    hasStepped.current = false;
  }, []);

  const wheelLock = useRef(false);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (wheelLock.current || animating.current) return;
    wheelLock.current = true;
    stepBy(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLock.current = false; }, ANIM_DURATION + 50);
  }, [stepBy]);

  const handleItemClick = useCallback((idx: number) => {
    if (animating.current) return;
    if (idx === selectedIndex) return;
    stepBy(idx > selectedIndex ? 1 : -1);
  }, [selectedIndex, stepBy]);

  const shiftY = -selectedIndex * ITEM_HEIGHT;

  return (
    <div className={`relative ${width} overflow-hidden`} style={{ height: ITEM_HEIGHT * VISIBLE_ITEMS }}>
      <div
        className="h-full overflow-hidden scrollbar-hide"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        style={{ overscrollBehavior: 'none', touchAction: 'none' }}
      >
        <div
          style={{
            transform: `translateY(${shiftY}px)`,
            transition: `transform ${ANIM_DURATION}ms ${EASING}`,
          }}
        >
          <div style={{ height: ITEM_HEIGHT }} />
          {items.map((item, idx) => {
            const isSelected = idx === selectedIndex;
            return (
              <div
                key={`${idx}-${item}`}
                onClick={() => handleItemClick(idx)}
                className={`flex items-center justify-center cursor-pointer select-none ${
                  isSelected
                    ? 'text-foreground font-bold text-lg scale-110'
                    : 'text-muted-foreground text-sm opacity-50'
                }`}
                style={{
                  height: ITEM_HEIGHT,
                  transition: `opacity ${ANIM_DURATION}ms ${EASING}, font-size ${ANIM_DURATION}ms ${EASING}, font-weight ${ANIM_DURATION}ms ${EASING}, color ${ANIM_DURATION}ms ${EASING}, transform ${ANIM_DURATION}ms ${EASING}`,
                }}
                translate="no"
              >
                {item || '—'}
              </div>
            );
          })}
          <div style={{ height: ITEM_HEIGHT }} />
        </div>
      </div>
    </div>
  );
}
