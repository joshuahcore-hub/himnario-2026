import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import ScrollWheel from './ScrollWheel';
import { useI18n } from '@/lib/i18n/index';

const NOTES = ['—', 'C', 'D', 'E', 'F', 'G', 'A', 'B'];
const MODES = ['', 'm'];
const ITEM_HEIGHT = 40;

const SHARP_INVALID = new Set(['B', 'E']);
const FLAT_INVALID = new Set(['C', 'F']);

function AccidentalSlots({ note, value, onChange }: {
  note: string;
  value: string;
  onChange: (acc: string) => void;
}) {
  const showSharp = note === '—' || (!SHARP_INVALID.has(note) && note !== '');
  const showFlat = note === '—' || (!FLAT_INVALID.has(note) && note !== '');

  const allItems = ['#', '', 'b'];
  const selectedIdx = value === '#' ? 0 : value === 'b' ? 2 : 1;

  const gestureRef = useRef({ active: false, startY: 0, stepped: false });

  const select = useCallback((acc: string) => {
    onChange(acc);
  }, [onChange]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    gestureRef.current = { active: true, startY: e.touches[0].clientY, stepped: false };
  }, []);

  const stepBy = useCallback((direction: 1 | -1) => {
    const newIdx = selectedIdx + direction;
    if (newIdx < 0 || newIdx > 2) return;
    const newVal = allItems[newIdx];
    if (newVal === '#' && !showSharp) return;
    if (newVal === 'b' && !showFlat) return;
    select(newVal);
  }, [selectedIdx, allItems, showSharp, showFlat, select]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const g = gestureRef.current;
    if (!g.active || g.stepped) return;
    e.preventDefault();
    const delta = g.startY - e.touches[0].clientY;
    if (Math.abs(delta) >= 20) {
      g.stepped = true;
      stepBy(delta > 0 ? 1 : -1);
    }
  }, [stepBy]);

  const onTouchEnd = useCallback(() => {
    gestureRef.current.active = false;
  }, []);

  const wheelLock = useRef(false);
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    if (wheelLock.current) return;
    wheelLock.current = true;
    stepBy(e.deltaY > 0 ? 1 : -1);
    setTimeout(() => { wheelLock.current = false; }, 250);
  }, [stepBy]);

  const shiftY = -selectedIdx * ITEM_HEIGHT;

  return (
    <div
      className="w-10 overflow-hidden"
      style={{ height: ITEM_HEIGHT * 3, touchAction: 'none', overscrollBehavior: 'none' }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onWheel={onWheel}
    >
      <div
        style={{
          transform: `translateY(${shiftY}px)`,
          transition: `transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        }}
      >
        <div style={{ height: ITEM_HEIGHT }} />
        {allItems.map((item, idx) => {
          const isSelected = idx === selectedIdx;
          const isSharp = item === '#';
          const isFlat = item === 'b';
          const isEmpty = (isSharp && !showSharp) || (isFlat && !showFlat);

          return (
            <div
              key={item || 'none'}
              onClick={() => {
                if (isEmpty) return;
                if (isSharp) select('#');
                else if (isFlat) select('b');
                else select('');
              }}
              className={`flex items-center justify-center cursor-pointer select-none ${
                isSelected
                  ? 'text-foreground font-bold text-lg'
                  : 'text-muted-foreground text-sm opacity-50'
              }`}
              style={{
                height: ITEM_HEIGHT,
                transition: 'opacity 200ms, font-size 200ms, font-weight 200ms, color 200ms, transform 200ms',
              }}
              translate="no"
            >
              {isEmpty ? '' : (item || '—')}
            </div>
          );
        })}
        <div style={{ height: ITEM_HEIGHT }} />
      </div>
    </div>
  );
}

interface TonalityPickerProps {
  selectedKey: string | null;
  onChange: (key: string | null) => void;
}

function parseKey(key: string | null): [number, string, number] {
  if (!key) return [0, '—', 0];
  const letter = key.charAt(0).toUpperCase();
  let noteIdx = NOTES.indexOf(letter);
  if (noteIdx === -1) noteIdx = 0;

  const rest = key.slice(1);
  let acc = '';
  let modeIdx = 0;

  if (rest.startsWith('#')) {
    acc = '#';
    modeIdx = rest.endsWith('m') ? 1 : 0;
  } else if (rest.startsWith('b')) {
    acc = 'b';
    modeIdx = rest.endsWith('m') ? 1 : 0;
  } else {
    modeIdx = rest === 'm' ? 1 : 0;
  }

  if (SHARP_INVALID.has(NOTES[noteIdx]) && acc === '#') acc = '';
  if (FLAT_INVALID.has(NOTES[noteIdx]) && acc === 'b') acc = '';

  return [noteIdx, acc, modeIdx];
}

function combineKey(noteIdx: number, acc: string, modeIdx: number): string | null {
  const note = NOTES[noteIdx];
  const mode = MODES[modeIdx];
  if (note === '—') return null;
  return `${note}${acc}${mode}` || null;
}

export default function TonalityPicker({ selectedKey, onChange }: TonalityPickerProps) {
  const { t } = useI18n();
  const [noteIdx, setNoteIdx] = useState(() => parseKey(selectedKey)[0]);
  const [accidental, setAccidental] = useState(() => parseKey(selectedKey)[1]);
  const [modeIdx, setModeIdx] = useState(() => parseKey(selectedKey)[2]);

  const note = NOTES[noteIdx];

  useEffect(() => {
    if (note !== '—') {
      if (accidental === '—') setAccidental('');
      if (SHARP_INVALID.has(note) && accidental === '#') setAccidental('');
      if (FLAT_INVALID.has(note) && accidental === 'b') setAccidental('');
    } else {
      if (accidental !== '—') setAccidental('—');
    }
  }, [noteIdx]);

  const mode = MODES[modeIdx];
  const displayKey = note === '—'
    ? '—'
    : `${note}${accidental === '—' ? '' : accidental}${mode}`;

  useEffect(() => {
    const key = combineKey(noteIdx, accidental, modeIdx);
    if (key !== selectedKey) {
      onChange(key);
    }
  }, [noteIdx, accidental, modeIdx]);

  const handleNoteChange = useCallback((idx: number) => {
    setNoteIdx(idx);
  }, []);

  const handleAccChange = useCallback((acc: string) => {
    setAccidental(acc);
  }, []);

  const handleModeChange = useCallback((idx: number) => {
    setModeIdx(idx);
  }, []);

  const wheelHeight = ITEM_HEIGHT * 3;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-2xl font-bold text-hymn-key tracking-wide" translate="no">
        {displayKey}
      </div>

      <div className="relative rounded-xl overflow-hidden" style={{ height: wheelHeight }}>
        {[0].map(() => {
          const fadeStyle = (left: string | number) => ({
            position: 'absolute' as const,
            left: typeof left === 'number' ? `${left}px` : left,
            top: 0,
            bottom: 0,
            width: '1px',
            background: 'linear-gradient(to bottom, transparent 0%, hsl(var(--foreground) / 0.18) 25%, hsl(var(--foreground) / 0.18) 75%, transparent 100%)',
            zIndex: 10,
            pointerEvents: 'none' as const,
          });
          return (
            <>
              <div key="vl-left" style={fadeStyle(0)} />
              <div key="vl-mid1" style={fadeStyle('calc(33.333% - 0.5px)')} />
              <div key="vl-mid2" style={fadeStyle('calc(66.666% - 0.5px)')} />
              <div key="vl-right" style={fadeStyle('calc(100% - 1px)')} />
            </>
          );
        })}

        <div className="flex items-center h-full">
          <ScrollWheel
            items={NOTES}
            selectedIndex={noteIdx}
            onChange={handleNoteChange}
            width="w-10"
          />
          <AccidentalSlots
            note={note}
            value={accidental}
            onChange={handleAccChange}
          />
          <ScrollWheel
            items={MODES}
            selectedIndex={modeIdx}
            onChange={handleModeChange}
            width="w-10"
          />
        </div>
      </div>

    </div>
  );
}
