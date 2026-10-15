import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { flushSync } from 'react-dom';
import type { MinutaData, ParsedSong } from '@/lib/types';
import Portada from '@/components/Portada';
import Zoomable from '@/components/Zoomable';
import HimnoRecortado from '@/components/HimnoRecortado';
import { getThemedHymnImageUrl, precargarHimno, imageCache, imageCacheDark } from '@/lib/hymnCache';
import { useTheme } from '@/hooks/useTheme';
import { useHorizontal, puedeGirar, girarPantalla } from '@/hooks/useHorizontal';
import { Music2, Presentation, RotateCwSquare } from 'lucide-react';
import { urlImagen } from '@/lib/cancionesExtra';
import PanelProyeccion from '@/components/PanelProyeccion';
import { esComputador } from '@/lib/proyeccion';
import { useAcceso } from '@/hooks/useAcceso';
import { useToque } from '@/hooks/useToque';
import { useRecordatorios, type Recordatorio } from '@/lib/recordatorios';
import { AcotacionesPostit, BotonEnviados, BotonRecordatorio, NotasRecordatorio, PanelRecordatorio, sobresaleArriba, vaSobreLetra } from '@/components/Recordatorios';
import { getMinuta, guardarMinutaLocal } from '@/lib/minutaCache';
import { renumerar } from '@/lib/minutaUtils';
import { api } from '@/lib/api';
import { useI18n } from '@/lib/i18n/index';
import { CURVA_DESLIZAR, DURACION_DESLIZAR, direccionFirme, UMBRAL_LADO } from '@/lib/deslizar';
function SongPage({ song, horizontal, notas, onTocarNota, enviados = false }: {
  song: ParsedSong;
  /** (1.13.1) Las notas son las que envié (vista "Enviados"). */
  enviados?: boolean;
  horizontal: boolean;
  /** Recordatorios de esta alabanza (1.7.0): van entre el título y la letra. */
  notas: Recordatorio[];
  onTocarNota: (r: Recordatorio) => void;
}) {
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
        <div className="w-full flex flex-col items-center pt-3" style={{ containerType: 'inline-size' }}>
          {/* Girado = solo para ver (1.9.10, Josué): ver HymnDetail. */}
          <AcotacionesPostit notas={notas} className="w-full px-[5%] pb-1" />
          {/* Espacio para los post-it que asoman por arriba de la letra (padding en % = del ancho). */}
          <div className="w-full" style={{ paddingTop: `${sobresaleArriba(notas, hymnNumber) * 100}%` }} />
          {imgError ? (
            song.firstLine && <p className="py-8 px-4 text-center text-muted-foreground text-sm italic">{song.firstLine}</p>
          ) : (
            <HimnoRecortado num={hymnNumber} src={imgUrl} alt={`${song.title} - #${hymnNumber}`} onError={() => setImgError(true)}>
              <NotasRecordatorio notas={notas.filter(vaSobreLetra)} sobreLetra soloVer enviados={enviados} onTocar={onTocarNota} />
            </HimnoRecortado>
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
          // Solo la franja con letra, CENTRADA en el espacio libre (1.9.0, Josué: con la hoja completa cada himno
          // quedaba a otra altura según dónde venía la letra en la imagen). Se achica si no cabe de alto.
          <div className="flex-1 min-h-0 w-full max-w-lg flex items-center justify-center py-2" style={{ containerType: 'size' }}>
            <HimnoRecortado num={hymnNumber} src={imgUrl} alt={`${song.title} - #${hymnNumber}`} onError={() => setImgError(true)} ajustarAlto>
              {/* Sin mover: en fila justo ARRIBA de la letra, flotando (1.9.2: antes estaban en el flujo y al agregar
                  uno la letra bajaba, y al moverlo volvía a subir). */}
              <NotasRecordatorio notas={notas} enviados={enviados} onTocar={onTocarNota} className="absolute bottom-full left-0 right-0 pb-3 z-10 pointer-events-none" />
              <NotasRecordatorio notas={notas} sobreLetra enviados={enviados} onTocar={onTocarNota} />
            </HimnoRecortado>
          </div>
        )}
      </div>
    </Zoomable>
  );
}

/** (1.13.0, Josué) Alabanza que no está en el himnario. Con imagen subida: se ve con un CONTORNO y la marca "Imagen
 *  subida" (que se note que no es parte de la app: es un sustituto provisorio), con zoom. Sin imagen: página limpia. */
function PaginaFuera({ canto, horizontal }: { canto: ParsedSong; horizontal: boolean }) {
  const { t } = useI18n();
  const [error, setError] = useState(false);
  const cabecera = (
    <div className="text-center shrink-0 pt-4 px-4">
      <h2 className="text-lg font-bold text-foreground">{canto.title}</h2>
      <div className="flex items-center justify-center gap-2">
        {canto.key && <span translate="no" className="font-semibold text-hymn-key">{canto.key}</span>}
        <span className="rounded-md border border-border px-1.5 py-px text-[10px] text-muted-foreground">{t.fuera_etiqueta}</span>
      </div>
    </div>
  );
  if (!canto.imagen || error) {
    return (
      <div className="m-auto flex flex-col items-center gap-2 text-center px-6">
        <Music2 size={34} className="text-muted-foreground/60" />
        <span className="text-2xl font-semibold text-foreground">{canto.title}</span>
        {canto.key && <span translate="no" className="text-xl font-semibold text-hymn-key">{canto.key}</span>}
        <span className="text-xs text-muted-foreground mt-2">{t.fuera_no_esta}</span>
      </div>
    );
  }
  return (
    <Zoomable className={horizontal ? 'w-full m-auto' : 'w-full h-full'} reiniciarCon={canto.imagen}>
      <div className={`w-full flex flex-col items-center px-3 ${horizontal ? 'pt-3' : 'h-full'}`}>
        {!horizontal && cabecera}
        <div className={`relative w-full max-w-lg ${horizontal ? '' : 'flex-1 min-h-0 flex items-center justify-center py-3'}`}>
          <div className="relative rounded-lg border-2 border-dashed border-muted-foreground/40 p-1.5 max-h-full">
            <span className="absolute -top-2.5 left-3 bg-background px-1.5 text-[10px] text-muted-foreground">{t.fuera_imagen_subida}</span>
            <img src={urlImagen(canto.imagen)} alt={canto.title} draggable={false} onError={() => setError(true)}
                 className={`block w-full rounded ${horizontal ? 'h-auto' : 'max-h-[70dvh] object-contain'}`} />
          </div>
        </div>
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
  const { theme: temaLector } = useTheme();
  // Recordatorios (1.7.0): los "siempre en esta alabanza" y los "solo en esta minuta".
  const { registrado, puedeProyectar, puedeDejarAOtros } = useAcceso();
  // Vista "Enviados" (1.13.1): los post-it que dejé a otras personas en vez de los míos.
  const [verEnviados, setVerEnviados] = useState(false);
  // Generar proyección (1.12.0): solo en el computador y con el permiso; en la portada de la minuta.
  const [proyeccionAbierta, setProyeccionAbierta] = useState(false);
  const [enComputador] = useState(esComputador);
  const notasDe = useRecordatorios(registrado, id ?? null);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const [notaEditada, setNotaEditada] = useState<Recordatorio | null>(null);
  const abrirPanel = (r: Recordatorio | null) => { setNotaEditada(r); setPanelAbierto(true); };
  const toqueGirar = useToque(() => girarPantalla(horizontal)); // al soltar el dedo (ver useToque)
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
  // Deslizar hacia arriba o abajo (celular derecho) sale a la lista de minutas, como en el himno abierto (Josué,
  // 1.7.9): la pantalla sigue al dedo directo (style, sin estado de React) y al soltar sale por ese lado o vuelve.
  const exteriorRef = useRef<HTMLDivElement>(null);
  const dragYRef = useRef(0);
  const saliendo = useRef(false);
  const moverVertical = (dy: number, modo: 'arrastre' | 'volver' | 'salir') => {
    const el = exteriorRef.current;
    if (!el) return;
    const d = Math.abs(dy);
    el.style.transition = modo === 'arrastre' ? 'none' : 'all 280ms ease-out';
    if (modo === 'salir') {
      el.style.transform = `translateY(${dy < 0 ? '-' : ''}100vh) scale(0.85)`;
      el.style.opacity = '0';
      el.style.borderRadius = '16px';
      return;
    }
    el.style.transform = d > 0 ? `translateY(${dy}px) scale(${Math.max(0.88, 1 - d / 2000)})` : 'none';
    el.style.opacity = String(d > 0 ? Math.max(0.3, 1 - d / 300) : 1);
    el.style.borderRadius = d > 0 ? '16px' : '0';
  };
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
    swipeItems.forEach(s => { if (s.hymnNumber) precargarHimno(s.hymnNumber, temaLector); }); // solo el tema en uso (1.7.2)
  }, [minuta, temaLector]);

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
    // Volviendo a su lugar tras un deslizamiento corto: el gesto nuevo la toma al instante (1.7.5).
    else if (animando.current) { animando.current = false; moverCarrusel(0, false); }
    if (saliendo.current) return;
    dragYRef.current = 0;
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
    // Vertical: NO sale de la minuta (1.9.4, Josué: se salía sin querer al pasar a llevar; solo con "atrás" del
    // celular). Con el celular girado, el gesto vertical recorre la letra (nativo).
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
    const dragY = dragYRef.current;
    if (Math.abs(dragY) > 80) { saliendo.current = true; moverVertical(dragY, 'salir'); setTimeout(() => navigate('/minutas'), 280); return; }
    if (dragY !== 0) { dragYRef.current = 0; moverVertical(0, 'volver'); return; }
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
  // Alabanza que se está viendo (para el botón de recordatorio): no en la portada ni en Palabra/Oración.
  const itemVisible = itemAt(paginaVisible);
  const cantoVisible = itemVisible && itemVisible.hymnNumber && itemVisible.found && !itemVisible.isPalabra && !itemVisible.isOracion ? itemVisible : null;


  const renderPage = (pageIdx: number, offset: number) => {
    if (pageIdx < 0 || pageIdx >= totalPages) return null;
    const item = itemAt(pageIdx);
    const esCanto = !!item && !item.isPalabra && !item.isOracion && !item.isEspecial;
    // key: cada página con su propio nodo (en horizontal cada una guarda su desplazamiento y empieza arriba).
    // La portada lleva su margen DENTRO del zoom: si no, al ampliarla se recortaba 20 px antes del borde (1.6.5).
    const portada = pageIdx === 0;
    const clase = horizontal
      ? `absolute inset-0 flex overflow-y-auto overflow-x-hidden ${esCanto ? 'pb-6' : portada ? '' : 'p-5'}`
      : `absolute inset-0 flex items-center justify-center ${esCanto || portada ? '' : 'p-5 overflow-y-auto'}`;
    return (
      <div
        key={pageIdx}
        data-pagina
        className={clase}
        style={{
          transform: `translateX(${offset * 100}%)`,
          ...(horizontal && { overscrollBehavior: 'contain', paddingLeft: 'env(safe-area-inset-left, 0px)', paddingRight: 'env(safe-area-inset-right, 0px)' }),
        }}
      >
        {pageIdx === 0 ? (
          // Portada sin recuadro, directo sobre el fondo, como las páginas de las canciones (Josué, 1.5.1).
          // m-auto: centrada, y si no cabe (horizontal) empieza arriba en vez de cortarse.
          // Con zoom como las canciones (Josué, 1.6.4): pellizcar o doble toque; el zoom ocupa toda la página.
          <Zoomable className="w-full h-full" reiniciarCon={minuta.id}>
            {/* Derecho: el gesto vertical es para salir (como en las canciones), no para desplazar la portada. */}
            <div className="h-full w-full flex overflow-y-auto p-5"
                 style={{ overscrollBehavior: 'contain', touchAction: horizontal ? 'pan-y' : 'none' }}>
              <div className="w-full max-w-sm m-auto">
                <Portada date={minuta.fecha} songs={minuta.cantos} plano />
              </div>
            </div>
          </Zoomable>
        ) : item?.isPalabra ? (
          <span className="m-auto text-3xl font-bold text-palabra">{t.portada_palabra}</span>
        ) : item?.isOracion ? (
          <span className="m-auto text-3xl font-bold text-oracion">{t.portada_oracion}</span>
        ) : item?.isEspecial ? (
          // (1.13.0) Especial: solo texto, como Oración; el nombre debajo.
          <div className="m-auto flex flex-col items-center gap-1 text-center px-6">
            <span className="text-3xl font-bold text-especial">{t.especial.toLocaleUpperCase()}</span>
            {item.nombre && <span className="text-2xl font-medium text-foreground">{item.nombre}</span>}
          </div>
        ) : item?.fuera ? (
          <PaginaFuera canto={item} horizontal={horizontal} />
        ) : item ? (
          <SongPage song={item} horizontal={horizontal} enviados={verEnviados}
                    notas={verEnviados ? notasDe(item.hymnNumber, 'enviados') : notasDe(item.hymnNumber)} onTocarNota={abrirPanel} />
        ) : null}
      </div>
    );
  };

  return (
    // overflow CLIP (no hidden): un contenedor "hidden" se puede desplazar solo (p. ej. al abrir un panel) y la
    // página quedaba corrida mostrando la vecina. clip recorta igual y no se desplaza (1.7.0).
    <div ref={exteriorRef} className="h-[100dvh] bg-background text-foreground flex flex-col overflow-clip" style={{ willChange: 'transform' }}>
      <div style={{ height: 'env(safe-area-inset-top, 0px)' }} />

      <div
        ref={areaRef}
        className="flex-1 relative overflow-clip"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        // Derecho: todo el gesto lo maneja la app (cambiar de página o salir arriba/abajo). Girado: pan-y para recorrer.
        style={{ touchAction: horizontal ? 'pan-y' : 'none' }}
      >
        <div ref={carruselRef} className="absolute inset-0" style={{ transform: 'translateX(0px)', willChange: 'transform' }}>
          {renderPage(currentPage - 1, -1)}
          {renderPage(currentPage, 0)}
          {renderPage(currentPage + 1, 1)}
        </div>
        {/* Arriba a la derecha: añadir recordatorio a esta alabanza (1.7.0; solo en páginas de canto) y girar
            (1.6.1). Discretos, para no tapar la letra. */}
        {/* Arriba a la izquierda (1.13.1, Josué: simétrico): los dos de post-it, solo en páginas de canto y de pie. */}
        <div className="absolute top-2 left-2 z-20 flex gap-2 transition-opacity duration-200"
             style={{ opacity: cantoVisible && !horizontal ? 1 : 0, pointerEvents: cantoVisible && !horizontal ? 'auto' : 'none' }}>
          <BotonRecordatorio onClick={() => abrirPanel(null)} />
          {puedeDejarAOtros && <BotonEnviados activo={verEnviados} onClick={() => setVerEnviados(v => !v)} />}
        </div>
        <div className="absolute top-2 right-2 z-20 flex gap-2">
          {puedeProyectar && enComputador && (
            <button onClick={() => setProyeccionAbierta(true)} title={t.proy_titulo}
                    className="tap-btn-overlay h-[37px] px-3 rounded-full bg-card/90 border border-border text-foreground text-xs font-medium flex items-center gap-1.5 transition-opacity duration-200"
                    style={{ opacity: paginaVisible === 0 ? 1 : 0, pointerEvents: paginaVisible === 0 ? 'auto' : 'none' }}>
              <Presentation size={15} />{t.proy_titulo}
            </button>
          )}

          {puedeGirar && (
            <button {...toqueGirar} onTouchStart={e => e.stopPropagation()} aria-label="Girar" style={{ touchAction: 'none' }}
                    className="tap-btn-overlay p-2 rounded-full bg-card/90 border border-border text-foreground/70">
              <RotateCwSquare size={18} />
            </button>
          )}
        </div>
      </div>
      {puedeProyectar && enComputador && (
        <PanelProyeccion abierto={proyeccionAbierta} onCerrar={() => setProyeccionAbierta(false)} minuta={minuta} />
      )}
      <PanelRecordatorio abierto={panelAbierto} onCerrar={() => setPanelAbierto(false)} himno={cantoVisible?.hymnNumber ?? null}
                         anterior={notaEditada} enviados={notasDe(cantoVisible?.hymnNumber, 'enviados')} minutaId={minuta.id} minutaPublicada={minuta.publicada} />

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
