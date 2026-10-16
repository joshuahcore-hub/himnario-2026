// Himnario → "Canciones que no están en el himnario" (1.13.0, Josué): subcarpeta con las canciones guardadas al crear
// minutas (título, tonalidad e imagen opcional). Botón atrás arriba a la izquierda (además del "atrás" del celular).
// Al cambiar de pestaña y volver, la app regresa aquí (ver AppShell: última pantalla del himnario).
// (1.18.2, Josué) En orden alfabético; los CREADORES agregan ("+" arriba), editan (lápiz dentro de cada una: título,
// tonalidad, tempo e imágenes) y eliminan. Dentro de una, deslizar al lado pasa a la anterior / siguiente.
import { useLayoutEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Music2, Pencil, Plus } from 'lucide-react';
import { CabeceraFuera, MarcoImagenes } from '@/components/ImagenesSubidas';
import { DialogFuera } from '@/components/DialogosMinuta';
import { useI18n } from '@/lib/i18n/index';
import { toast } from '@/lib/aviso';
import { ErrorDeRed } from '@/lib/api';
import { eliminarCancionExtra, useCancionesExtra } from '@/lib/cancionesExtra';
import { useAcceso } from '@/hooks/useAcceso';
import { direccionFirme } from '@/lib/deslizar';

function Volver({ titulo }: { titulo: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 px-3 pt-3 pb-2">
      <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label={t.tab_hymnal}
              className="tap-btn p-2 rounded-full text-foreground"><ArrowLeft size={20} /></button>
      <h1 className="text-base font-bold text-foreground truncate">{titulo}</h1>
    </div>
  );
}

const VACIA = { titulo: '', tonalidad: null, tempo: null, imagen: null };

export function ListaCancionesFuera() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const lista = useCancionesExtra();
  const { puedeEditar } = useAcceso();
  const [agregando, setAgregando] = useState(false);
  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto" style={{ height: 'calc(100dvh - var(--barra))' }}>
      <Volver titulo={t.fuera_seccion} />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0.5 content-start">
        {/* Arriba primero el "+" para agregar (solo creadores), como en el buscador de alabanzas. */}
        {puedeEditar && (
          <button type="button" onClick={() => setAgregando(true)}
                  className="md:col-span-2 w-full flex items-center gap-2 py-2.5 px-3 mb-1 rounded-lg border border-dashed border-border text-sm text-muted-foreground text-left">
            <Plus size={15} className="shrink-0" />{t.fuera_agregar}
          </button>
        )}
        {lista.map(c => (
          <button key={c.id} onClick={() => navigate(`/hymnal/extra/${c.id}`)}
                  className="tap-btn flex items-center gap-2 py-2 px-2.5 rounded-lg w-full text-left">
            <Music2 size={14} className="text-muted-foreground/70 shrink-0" />
            <span className="flex-1 min-w-0 text-foreground text-xs font-medium truncate">{c.titulo}</span>
            {c.tonalidad && <span translate="no" className="text-hymn-key font-semibold text-xs w-7 shrink-0 text-center">{c.tonalidad}</span>}
          </button>
        ))}
        {lista.length === 0 && <p className="md:col-span-2 text-muted-foreground text-xs text-center py-8">{t.fuera_vacio}</p>}
      </div>
      <DialogFuera abierto={agregando} inicial={VACIA} nuevo esperarGuardado
                   onCerrar={() => setAgregando(false)} onListo={() => setAgregando(false)} />
    </div>
  );
}

const PASO_MS = 260;

export function CancionFuera() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const lista = useCancionesExtra();
  const pos = lista.findIndex(x => x.id === id);
  const c = pos >= 0 ? lista[pos] : undefined;
  const { puedeEditar } = useAcceso();
  const [error, setError] = useState(false);
  const [editando, setEditando] = useState(false);

  // (1.18.2, Josué) Deslizar al lado = la anterior / la siguiente de la carpeta (en el mismo orden alfabético). La
  // página sigue al dedo directo (style, sin estado de React) y al soltar sale por ese lado; la nueva entra por el otro.
  const pagina = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number; lateral: boolean | null } | null>(null);
  const mover = (px: number, animar: boolean) => {
    const el = pagina.current;
    if (!el) return;
    el.style.transition = animar ? `transform ${PASO_MS}ms cubic-bezier(0.22, 1, 0.36, 1)` : 'none';
    el.style.transform = px ? `translateX(${px}px)` : 'none';
  };
  // Al llegar desde otra por deslizamiento, entra desde el lado contrario.
  const entrada = (location.state as { entrada?: 1 | -1 } | null)?.entrada;
  useLayoutEffect(() => {
    setError(false);
    const el = pagina.current;
    if (!el || !entrada) return;
    mover(entrada * el.clientWidth, false);
    void el.offsetWidth; // aplica la posición de partida antes de animar
    mover(0, true);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const ir = (dir: 1 | -1) => {
    const otra = lista[pos + dir];
    const el = pagina.current;
    if (!otra || !el) { mover(0, true); return; }
    mover(-dir * el.clientWidth, true);
    setTimeout(() => navigate(`/hymnal/extra/${otra.id}`, { replace: true, state: { entrada: dir } }), PASO_MS);
  };
  const alTocar = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) { toque.current = null; return; }
    toque.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, lateral: null };
  };
  const alMover = (e: React.TouchEvent) => {
    const t0 = toque.current;
    if (!t0) return;
    const dx = e.touches[0].clientX - t0.x, dy = e.touches[0].clientY - t0.y;
    if (t0.lateral === null) t0.lateral = direccionFirme(dx, dy);
    if (!t0.lateral) return;
    // En la primera o la última, cede poco (tope elástico).
    const hay = dx < 0 ? pos < lista.length - 1 : pos > 0;
    mover(hay ? dx : dx / 4, false);
  };
  const alSoltar = (e: React.TouchEvent) => {
    const t0 = toque.current;
    toque.current = null;
    if (!t0?.lateral) return;
    const dx = e.changedTouches[0].clientX - t0.x;
    if (Math.abs(dx) > 60) ir(dx < 0 ? 1 : -1);
    else mover(0, true);
  };

  if (!c) return <div className="p-6 text-center text-sm text-muted-foreground">{t.hymnal_no_results}</div>;
  // (1.13.4, Josué) Igual que dentro de una minuta: título CENTRADO arriba, tonalidad (roja) debajo y la etiqueta.
  // Volver: botón redondo arriba a la izquierda, sin empujar el título.
  return (
    <div className="relative flex flex-col w-full max-w-3xl mx-auto overflow-clip" style={{ height: 'calc(100dvh - var(--barra))', touchAction: 'pan-y' }}
         onTouchStart={alTocar} onTouchMove={alMover} onTouchEnd={alSoltar} onTouchCancel={alSoltar}>
      <button onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} aria-label={t.tab_hymnal}
              className="tap-btn absolute top-3 left-3 z-10 p-2 rounded-full text-foreground"><ArrowLeft size={20} /></button>
      {/* (1.18.2) Solo creadores: lápiz arriba a la derecha → el mismo panel que en el editor de minutas. */}
      {puedeEditar && (
        <button onClick={() => setEditando(true)} aria-label={t.fuera_editar} title={t.fuera_editar}
                onTouchStart={e => e.stopPropagation()}
                className="tap-btn absolute top-3 right-3 z-10 p-2 rounded-full text-foreground"><Pencil size={18} /></button>
      )}
      <div ref={pagina} className="flex-1 min-h-0 flex flex-col">
        {c.imagen && !error ? (
          <MarcoImagenes key={c.imagen} imagen={c.imagen} titulo={c.titulo} altoMax="max-h-[calc(100dvh-var(--barra)-8rem)]"
                         onError={() => setError(true)}
                         cabecera={<div className="px-10"><CabeceraFuera titulo={c.titulo} tono={c.tonalidad} /></div>} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-6">
            <Music2 size={34} className="text-muted-foreground/60" />
            <span className="text-2xl font-semibold text-foreground">{c.titulo}</span>
            {c.tonalidad && <span translate="no" className="text-xl font-semibold text-hymn-key">{c.tonalidad}</span>}
            <span className="text-xs text-muted-foreground mt-2">{t.fuera_no_esta}</span>
          </div>
        )}
      </div>
      <DialogFuera abierto={editando} nuevo={false} idGuardada={c.id}
                   inicial={{ titulo: c.titulo, tonalidad: c.tonalidad, tempo: c.tempo ?? null, imagen: c.imagen }}
                   onCerrar={() => setEditando(false)} onListo={() => setEditando(false)}
                   onEliminar={async () => {
                     setEditando(false);
                     try {
                       await eliminarCancionExtra(c.id);
                       toast.success(t.fuera_eliminada);
                       if (((history.state as { idx?: number } | null)?.idx ?? 0) > 0) navigate(-1);
                       else navigate('/hymnal/extra', { replace: true });
                     } catch (e: any) { toast.error(e instanceof ErrorDeRed ? t.editor_needs_internet : e.message); }
                   }} />
    </div>
  );
}
