// Recordatorios (1.7.0, Josué): nota adhesiva amarilla sobre una alabanza. Ver src/lib/recordatorios.ts.
// - NotasRecordatorio: las notas, entre el título y la letra (más chicas con el celular girado).
//     propia → amarillo; recibida → amarillo + "De: …"; dejada a otro → borde punteado +
//     "Para: … · Enviado/Visto/Eliminado por …". Al tocarla: Editar (propias) y Eliminar (con confirmación).
// - BotonRecordatorio: el botón amarillo de arriba.
// - PanelRecordatorio: escribir / editar / borrar. Para quién y si es "siempre" o "solo esta minuta".
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Check, CheckCheck, Eye, MoveDiagonal2, Music2, PenLine, Send, Trash2, Type } from 'lucide-react';
import { toast } from '@/lib/aviso';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n/index';
import recortes from '@/datos/recortes.json';
import { useAcceso } from '@/hooks/useAcceso';
import { useAlTocarFuera } from '@/hooks/useAlTocarFuera';
import { useToque } from '@/hooks/useToque';
import { ErrorDeRed } from '@/lib/api';
import {
  ajustarRecordatorio, borrarRecordatorio, cargarPersonas, marcarVisto, moverRecordatorio, MAX_TEXTO, TAM_MAX, TAM_MIN, guardarRecordatorio, personasGuardadas, type Persona, type Recordatorio,
} from '@/lib/recordatorios';

const Punto = ({ color }: { color: string }) => (
  <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
);

/** Símbolos en vez de texto (1.13.3, Josué): ojo, flecha arriba, flecha abajo y corchea; íconos de LÍNEA, todos del
 *  mismo estilo, sin papel amarillo. Se guardan como texto "::nombre::" (no hace falta otra columna). */
/** (1.17.10, Josué) "Ojo" = DOS ojitos que miran hacia el lado (como el emoji 👀), de línea como los demás: el ojo
 *  solo se veía raro. Mismo formato que los íconos de lucide (size, strokeWidth, className). */
function Ojitos({ size = 24, strokeWidth = 1.6, className = '' }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {/* (1.17.14, Josué) Claro: como al principio (ojo sin relleno, pupila del color del texto). Oscuro: ojo BLANCO por
          dentro y pupila NEGRA (el contorno sigue el color del texto). */}
      <ellipse cx="7.6" cy="12" rx="4.3" ry="6.2" className="fill-none dark:fill-white" />
      <ellipse cx="16.4" cy="12" rx="4.3" ry="6.2" className="fill-none dark:fill-white" />
      <circle cx="9.3" cy="12.6" r="2" stroke="none" className="fill-current dark:fill-[#1f1d1a]" />
      <circle cx="18.1" cy="12.6" r="2" stroke="none" className="fill-current dark:fill-[#1f1d1a]" />
    </svg>
  );
}

export const SIMBOLOS = { ojo: Ojitos, arriba: ArrowUp, abajo: ArrowDown, corchea: Music2 } as const;
export type Simbolo = keyof typeof SIMBOLOS;
export const simboloDe = (texto: string): Simbolo | null => {
  const m = texto.match(/^::(ojo|arriba|abajo|corchea)::$/);
  return m ? (m[1] as Simbolo) : null;
};
export const textoSimbolo = (s: Simbolo) => `::${s}::`;
export function IconoSimbolo({ simbolo, tam = 30, className = '' }: { simbolo: Simbolo; tam?: number; className?: string }) {
  const I = SIMBOLOS[simbolo];
  return <I size={tam} strokeWidth={1.6} className={className} />;
}

/** Letra manuscrita de los post-it (1.9.0: Patrick Hand, más legible que Caveat; sin internet, la del sistema). */
export const LETRA_POSTIT = "'Patrick Hand', 'Segoe Print', 'Bradley Hand', cursive";

// Post-it RECIBIDOS ya "reconocidos" en este celular (1.13.2, Josué): la primera vez se ven con contorno celeste y
// "Te lo envió X"; un toque lo quita (queda reconocido) y desde ahí se comportan como cualquier otro.
const CLAVE_RECONOCIDOS = 'himnario_postit_reconocidos';
const reconocidos = new Set<string>((() => { try { return JSON.parse(localStorage.getItem(CLAVE_RECONOCIDOS) || '[]'); } catch { return []; } })());
function reconocer(id: string) {
  reconocidos.add(id);
  try { localStorage.setItem(CLAVE_RECONOCIDOS, JSON.stringify([...reconocidos].slice(-500))); } catch { /* sin espacio */ }
}

const MANTENER_MS = 420; // mantener presionado para despegar el post-it y moverlo
const MOVER_MAX = 7;     // si el dedo se mueve más que esto antes, es un deslizamiento (cambiar de canción), no mover
const TIRADOR_SEP = 12;  // separación del tirador respecto a la esquina del post-it (1.9.10: "un poco más lejos")
const TIRADOR_TAM = 30;
/** Ancho de letra (px) en que un post-it pegado mide su tamaño "normal". Sobre la letra el post-it crece y se achica
 *  CON la letra (1.10.1, Josué): si tapa una palabra en vertical, al girar sigue tapando la misma palabra. */
const ANCHO_REF_LETRA = 390;

/** Zona donde se ve el post-it: la página, recortada por los contenedores que no dejan ver lo que se sale. */
function zonaVisible(marco: HTMLElement, pagina: HTMLElement) {
  let { left, top, right, bottom } = pagina.getBoundingClientRect();
  for (let el = marco.parentElement; el && el !== pagina; el = el.parentElement) {
    const o = getComputedStyle(el);
    if (o.overflowX !== 'visible' || o.overflowY !== 'visible') {
      const r = el.getBoundingClientRect();
      left = Math.max(left, r.left); top = Math.max(top, r.top); right = Math.min(right, r.right); bottom = Math.min(bottom, r.bottom);
    }
  }
  return { left, top, right, bottom };
}

/** Lo que no cambia mientras se arrastra: se mide UNA vez al despegar (1.9.10, Josué: medir en cada movimiento
 *  obligaba al teléfono a recalcular la página y el arrastre daba saltitos). */
type Caja = { left: number; top: number; right: number; bottom: number };
type Zona = { m: DOMRect; z: Caja; tapas: DOMRect[]; abajo: number };
function medirZona(postit: HTMLElement): Zona | undefined {
  const pagina = postit.closest<HTMLElement>('[data-pagina]');
  const marco = pagina?.querySelector<HTMLElement>('[data-marco-letra]');
  if (!pagina || !marco) return undefined;
  const tapas = [...document.querySelectorAll<HTMLElement>('[data-tapa-postit]')].map(el => el.getBoundingClientRect()).filter(t => t.width > 0);
  const m = marco.getBoundingClientRect();
  // Hasta dónde puede bajar (1.12.1, Josué): el espacio que en el HIMNARIO queda entre el fin de la letra y el contador
  // (en este teléfono, de pie). Igual en la minuta, aunque ahí no haya contador: así el post-it "de siempre" nunca queda
  // tapado en el himnario. Página del himnario: 60 px arriba + 124 px abajo (botones, contador y barra); letra centrada.
  const alto = Math.max(innerHeight, innerWidth), ancho = Math.min(Math.min(innerHeight, innerWidth), 512);
  const sobra = ((alto - 184) - ancho * (m.height / m.width)) / 2 - 6;
  const abajo = m.bottom + Math.max(0, sobra / ancho) * m.width;
  return { m, z: zonaVisible(marco, pagina), tapas, abajo };
}

/** Dónde queda (1.9.1, Josué): en cualquier parte de la pantalla (también arriba del título o a los lados). Se guarda
 *  respecto al recuadro de la letra (data-marco-letra), así coincide en himnario y minuta, vertical u horizontal;
 *  puede ser < 0 o > 1 (fuera de la letra). `fuera` (1.9.10, Josué): ahí NO se puede dejar (se marca en rojo, vibra y
 *  al soltar vuelve a donde estaba): toca el borde de lo visible, queda MÁS ABAJO que la letra (el post-it "de siempre"
 *  se ve también en el himnario, donde abajo están el contador y la barra) o encima de botones (data-tapa-postit). */
function evaluar(n: Caja, texto: Caja, { m, z, tapas, abajo }: Zona) {
  const tapa = tapas.some(t => n.left < t.right && n.right > t.left && n.top < t.bottom && n.bottom > t.top);
  // A los lados el papel puede asomar fuera del borde mientras el TEXTO se vea entero (1.12.1, Josué).
  const fuera = texto.left < z.left + 2 || texto.right > z.right - 2 || n.top < z.top + 2
    || n.bottom > Math.min(z.bottom - 2, abajo) || tapa;
  return { x: (n.left - m.left) / m.width, y: (n.top - m.top) / m.height, fuera };
}

const mover = (c: Caja, dx: number, dy: number): Caja => ({ left: c.left + dx, right: c.right + dx, top: c.top + dy, bottom: c.bottom + dy });

/** Soltado donde no se puede (1.12.1, Josué): en vez de volver al inicio, el lugar permitido MÁS CERCANO. */
function acomodar(n: Caja, texto: Caja, zona: Zona, dx: number, dy: number): [number, number] | null {
  const { z, tapas, abajo } = zona;
  const minX = z.left + 2 - texto.left, maxX = z.right - 2 - texto.right;
  const minY = z.top + 2 - n.top, maxY = Math.min(z.bottom - 2, abajo) - n.bottom;
  if (minX > maxX || minY > maxY) return null;
  const x = Math.min(maxX, Math.max(minX, dx));
  const candidatos = [Math.min(maxY, Math.max(minY, dy))];
  for (const t of tapas) candidatos.push(t.bottom + 2 - n.top, t.top - 2 - n.bottom);
  const validos = candidatos.filter(y => y >= minY && y <= maxY && !evaluar(mover(n, x, y), mover(texto, x, y), zona).fuera);
  if (!validos.length) return null;
  validos.sort((a, b) => Math.abs(a - dy) - Math.abs(b - dy));
  return [x, validos[0]];
}

/** Zoom de pellizcar en que está la letra (tamaño en pantalla ÷ tamaño de su recuadro). */
const escalaVista = (el: HTMLElement) => (el.offsetWidth ? el.getBoundingClientRect().width / el.offsetWidth : 1);

function Nota({ r, compacto, indice, abierta, sobreLetra, alDerecha = false, soloVer = false, escalaLetra = 1, enviado = false, onAlternar, onCerrarOpciones, onEditar, onBorrar }: {
  r: Recordatorio;
  /** (1.13.1) Vista "Enviados": papel más transparente, encima flota "Para X" con los tics; no se mueve ni estira. */
  enviado?: boolean;
  /** Pegado sobre la letra: ancho de la letra / ANCHO_REF_LETRA (el post-it se escala con ella). */
  escalaLetra?: number;
  /** Solo para ver (celular girado, 1.9.10): no se toca, no se mueve ni se estira. */
  soloVer?: boolean;
  /** En la fila: pegados a la derecha (celular girado: sobre la esquina del autor) en vez de a la izquierda. */
  alDerecha?: boolean;
  compacto: boolean;
  /** Para inclinar los post-it un poco distinto uno de otro. */
  indice: number;
  /** Opciones (Editar / Eliminar) desplegadas. */
  abierta: boolean;
  /** Pegado en un lugar de la letra (posición absoluta) en vez de en la fila de arriba. */
  sobreLetra: boolean;
  onAlternar: () => void;
  onCerrarOpciones: () => void;
  onEditar: (r: Recordatorio) => void;
  onBorrar: (r: Recordatorio) => void;
}) {
  const { t } = useI18n();
  const dejadaAOtro = !!r.para;
  const persona = r.autor ?? r.para;
  // Quien lo recibe: al aparecerle, quien lo dejó ve "Visto".
  useEffect(() => { if (r.autor && r.estado === 'enviado') marcarVisto(r); }, [r.id, r.estado]); // eslint-disable-line react-hooks/exhaustive-deps
  // Recibido y todavía sin reconocer en este celular: contorno celeste + "Te lo envió X" (ver arriba).
  const [nuevoRecibido, setNuevoRecibido] = useState(() => !!r.autor && !r.local && !reconocidos.has(r.id));

  const simbolo = simboloDe(r.texto);
  const colorEstado = r.estado === 'visto' ? 'text-green-700' : r.estado === 'eliminado' ? 'text-red-700' : '';
  const textoEstado = r.estado === 'visto' ? t.rec_seen : r.estado === 'eliminado' ? t.rec_deleted_by(r.para?.nombre ?? '') : t.rec_sent;
  const toqueEditar = useToque(() => onEditar(r));
  const toqueBorrar = useToque(() => onBorrar(r));
  const opcion = 'flex items-center gap-1.5 rounded-full font-medium [touch-action:none] h-8 px-3.5 text-xs';

  // Toque corto = opciones; mantener presionado = despegarlo (vibra) y arrastrarlo (1.9.0). Mientras se arrastra se
  // mueve DIRECTO (style.transform, sin estado de React: fluido) y no deja que la página cambie de canción.
  const caja = useRef<HTMLDivElement>(null);
  const papel = useRef<HTMLDivElement>(null);
  // escala: cuánto está ampliada la letra (zoom). El movimiento se divide por ella para que el post-it siga al dedo
  // (1.9.5, Josué: con zoom "saltaba lejos": se movía el doble que el dedo).
  const gesto = useRef<{ x: number; y: number; t: number; id: number; timer: number; arrastrando: boolean; escala: number; mouse?: boolean;
    fuera?: boolean; zona?: Zona; inicio?: DOMRect; texto?: DOMRect; dx?: number; dy?: number } | null>(null);
  const [levantado, setLevantado] = useState(false);
  // (1.17.7) Despegado con el mouse: no se agranda.
  const conMouse = useRef(false);

  // Opciones (Editar/Eliminar) hacia donde HAYA ESPACIO (1.9.1, Josué: pegado al borde izquierdo se salían de la
  // pantalla). Se calcula antes de dibujar al abrir: corrida para caber de lado y, si abajo no cabe, arriba.
  const opciones = useRef<HTMLDivElement>(null);
  // escala: cuánto está ampliada la letra (zoom) al tocar el post-it. Las opciones y el tirador se "des-amplían"
  // (scale 1/escala) para verse siempre del mismo tamaño y a la misma distancia (1.9.8, Josué).
  const [escala, setEscala] = useState(1);
  // Posición de las opciones en px de PANTALLA respecto al centro (de arriba o de abajo) del post-it.
  // 1.9.10 (Josué): ARRIBA si caben; si no (post-it en el tope), abajo, pero NUNCA encima del tirador: corridas a
  // la izquierda de él y, si no caben ahí, más abajo que el tirador. `baja` = px extra hacia abajo.
  const [ubic, setUbic] = useState<{ dx: number; arriba: boolean; baja: number }>({ dx: 0, arriba: true, baja: 0 });
  // Lado del tirador (1.12.1, Josué): NUNCA oculto tras el borde. Normalmente abajo a la derecha; si no cabe a la
  // derecha pasa a la izquierda, y si no cabe abajo pasa arriba.
  const [lado, setLado] = useState<{ izq: boolean; arriba: boolean }>({ izq: false, arriba: false });
  useLayoutEffect(() => {
    if (!abierta || !caja.current || !opciones.current) return;
    const n = caja.current.getBoundingClientRect(), o = opciones.current.getBoundingClientRect();
    const pagina = caja.current.closest<HTMLElement>('[data-pagina]')?.getBoundingClientRect();
    const izq = Math.max(pagina?.left ?? 0, 0) + 6, der = Math.min(pagina?.right ?? innerWidth, innerWidth) - 6;
    const abajoLim = Math.min(pagina?.bottom ?? innerHeight, innerHeight) - 6;
    const espacio = TIRADOR_SEP + TIRADOR_TAM;
    const tIzq = n.right + espacio > der && n.left - espacio >= izq;
    const tArriba = n.bottom + espacio > abajoLim;
    setLado({ izq: tIzq, arriba: tArriba });
    // Dónde queda el tirador en la pantalla (para que las opciones no lo tapen).
    const tir = {
      left: tIzq ? n.left - espacio : n.right + TIRADOR_SEP, right: tIzq ? n.left - TIRADOR_SEP : n.right + espacio,
      top: tArriba ? n.top - espacio : n.bottom + TIRADOR_SEP, bottom: tArriba ? n.top - TIRADOR_SEP : n.bottom + espacio,
    };
    const choca = (l: number, t: number) => l < tir.right && l + o.width > tir.left && t < tir.bottom && t + o.height > tir.top;
    const centro = n.left + n.width / 2;
    let left = Math.min(Math.max(centro - o.width / 2, izq), der - o.width);
    if (tArriba && choca(left, n.top - o.height - 8)) {
      // Tirador arriba: las opciones van abajo (si caben) o arriba corridas para no taparlo.
      if (n.bottom + 10 + o.height <= abajoLim) { setUbic({ dx: left - centro, arriba: false, baja: 0 }); return; }
      left = tIzq ? Math.min(der - o.width, tir.right + 8) : Math.max(izq, tir.left - 8 - o.width);
      setUbic({ dx: left - centro, arriba: true, baja: 0 });
      return;
    }
    // Arriba sin meterse bajo los botones que flotan sobre la página (volver, girar…).
    let arribaLim = Math.max(pagina?.top ?? 0, 0) + 6;
    for (const el of document.querySelectorAll<HTMLElement>('[data-tapa-postit]')) {
      const t = el.getBoundingClientRect();
      if (t.width > 0 && t.bottom <= n.top && t.left < left + o.width && t.right > left) arribaLim = Math.max(arribaLim, t.bottom + 6);
    }
    if (n.top - o.height - 8 >= arribaLim) { setUbic({ dx: left - centro, arriba: true, baja: 0 }); return; }
    // Abajo, sin tapar el tirador: corridas hacia el lado contrario al tirador y, si no caben, más abajo que él.
    if (choca(left, n.bottom + 10)) left = tIzq ? Math.max(left, tir.right + 8) : Math.min(left, tir.left - 8 - o.width);
    if (left >= izq && left + o.width <= der && !choca(left, n.bottom + 10)) { setUbic({ dx: left - centro, arriba: false, baja: 0 }); return; }
    left = Math.min(Math.max(centro - o.width / 2, izq), der - o.width);
    setUbic({ dx: left - centro, arriba: false, baja: tArriba ? 0 : espacio });
  }, [abierta, escala, r.tam]);

  // Tirador de la esquina para agrandar/achicar (1.9.1, Josué): sigue el dedo (zoom directo, sin estado de React) y
  // al soltar se guarda; entre TAM_MIN y TAM_MAX.
  const tam = r.tam ?? 1;
  const f = escalaLetra;
  const estirar = useRef<{ x: number; y: number; ancho: number; tam: number; id: number;
    /** Tamaño del papel y del recuadro de la letra en la pantalla (para mover la posición si crece a la izq./arriba). */
    pw: number; ph: number; marco: DOMRect | null;
    /** (1.17.7) Ancho visible de la página: el post-it nunca más ancho que eso. */
    anchoPagina: number } | null>(null);
  const tamAl = (e: React.PointerEvent) => {
    const g = estirar.current!;
    // Tirador a la izquierda o arriba: estirar hacia AFUERA (izquierda/arriba) también agranda.
    const d = ((e.clientX - g.x) * (lado.izq ? -1 : 1) + (e.clientY - g.y) * (lado.arriba ? -1 : 1)) / 2;
    const maxPantalla = (g.tam * (g.anchoPagina - 16)) / g.ancho; // que no se salga de la pantalla
    const limite = Math.max(g.tam, maxPantalla); // si ya era más ancho, al menos puede quedar como estaba
    return Math.min(TAM_MAX, limite, Math.max(TAM_MIN, g.tam * (1 + d / g.ancho)));
  };
  // Mientras se estira NO se cambia el zoom (eso vuelve a acomodar el texto en cada movimiento y, con la pantalla
  // ampliada, la letra "temblaba"; 1.11.6, Josué): el papel se agranda con transform (fluido, como una imagen) dejando
  // fija su esquina de arriba a la izquierda, y el tirador lo acompaña. Al soltar se fija el tamaño real (zoom).
  const anclaTirador = useRef<HTMLDivElement>(null);
  // (1.17.7, Josué) Con el MOUSE no se agranda al arrastrar (con el dedo sí, para que se vea "despegado").
  const transformPapel = `rotate(${indice % 2 === 0 ? -1.2 : 0.9}deg) scale(${levantado && !conMouse.current ? 1.05 : 1})`;
  const transformAncla = `scale(${1 / escala})`;
  const base = useRef({ w: 0, h: 0 });
  const verEstirado = (k: number) => {
    const p = papel.current, a = anclaTirador.current;
    if (!p) return;
    const { w, h } = base.current;
    // OJO (1.13.4): el translate del papel va en SUS unidades (el navegador lo multiplica por su zoom = tam × letra);
    // antes se usaba el tamaño ya ampliado y, con el post-it grande (computador), se corría y "saltaba" al soltar.
    // (1.17.0) Crece hacia el lado del TIRADOR y queda fija la esquina contraria: con el tirador a la izquierda (post-it
    // junto al borde derecho) antes crecía hacia la derecha, se salía de la pantalla y parecía moverse.
    const z = tam * f;
    const sx = lado.izq ? -1 : 1, sy = lado.arriba ? -1 : 1;
    p.style.transition = 'none';
    p.style.transform = `translate(${(sx * (k - 1) * w) / 2 / z}px, ${(sy * (k - 1) * h) / 2 / z}px) ${transformPapel} scale(${k})`;
    if (a) a.style.transform = `translate(${sx * (k - 1) * w}px, ${sy * (k - 1) * h}px) ${transformAncla}`;
  };
  const dejarDeEstirar = (zoomFinal: number) => {
    const p = papel.current, a = anclaTirador.current;
    if (p) { p.style.zoom = String(zoomFinal); p.style.transform = transformPapel; p.style.transition = ''; }
    if (a) a.style.transform = transformAncla;
  };
  const tirador = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!papel.current) return;
      // Tamaño del papel en px de su recuadro (sin el zoom de pellizcar), para mover el tirador junto con la esquina.
      base.current = { w: papel.current.offsetWidth * tam * f, h: papel.current.offsetHeight * tam * f };
      const rp = papel.current.getBoundingClientRect();
      estirar.current = { x: e.clientX, y: e.clientY, ancho: rp.width, tam, id: e.pointerId, pw: papel.current.offsetWidth * tam * f,
                          ph: papel.current.offsetHeight * tam * f,
                          marco: r.pos ? caja.current?.closest('[data-marco-letra]')?.getBoundingClientRect() ?? null : null,
                          anchoPagina: Math.min(innerWidth, caja.current?.closest('[data-pagina]')?.getBoundingClientRect().width ?? innerWidth) };
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* igual funciona */ }
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!estirar.current || !papel.current) return;
      verEstirado(tamAl(e) / tam);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      if (!estirar.current) return;
      const nuevo = Math.round(tamAl(e) * 100) / 100;
      const g = estirar.current;
      estirar.current = null;
      // Creció hacia la izquierda o hacia arriba: su esquina de arriba a la izquierda (la posición guardada) se corre lo
      // mismo, así queda exactamente donde se veía. Medidas en px del recuadro (sin el zoom de pellizcar).
      const k = nuevo / tam;
      const marcoW = g.marco && caja.current ? g.marco.width / (escalaVista(caja.current) || 1) : 0;
      const marcoH = g.marco && caja.current ? g.marco.height / (escalaVista(caja.current) || 1) : 0;
      const pos = r.pos && marcoW && marcoH && (lado.izq || lado.arriba)
        ? { x: r.pos.x - (lado.izq ? ((k - 1) * g.pw) / marcoW : 0), y: r.pos.y - (lado.arriba ? ((k - 1) * g.ph) / marcoH : 0) }
        : undefined;
      flushSync(() => ajustarRecordatorio(r, pos ? { tam: nuevo, pos } : { tam: nuevo }));
      // Queda EXACTAMENTE el tamaño que se veía al soltar (1.9.7, Josué: antes se borraba y volvía al normal).
      dejarDeEstirar(nuevo * f);
    },
    onPointerCancel: () => { estirar.current = null; dejarDeEstirar(tam * f); },
    // El gesto es del tirador: la página no se desliza ni se cierra.
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchMove: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchEnd: (e: React.TouchEvent) => e.stopPropagation(),
  };

  // Contorno rojo de "aquí no": siempre del mismo grosor a la vista (1.12.1, Josué), aunque el post-it esté agrandado
  // o la letra con zoom (el papel lleva CSS zoom = tam × letra y la página puede estar ampliada).
  const marcarFuera = (fuera: boolean, escalaVista = 1) => {
    const p = papel.current;
    if (!p) return;
    const z = (tam * f) * escalaVista;
    p.style.outline = fuera ? `${2.5 / z}px solid hsl(0 72% 52%)` : '';
  };
  const soltar = (g: NonNullable<typeof gesto.current>) => {
    const el = caja.current;
    if (!el || !papel.current) return;
    marcarFuera(false);
    el.style.willChange = '';
    const { zona, inicio, texto } = g;
    let dx = g.dx ?? 0, dy = g.dy ?? 0;
    if (!zona || !inicio || !texto) { setLevantado(false); el.style.transform = ''; return; }
    // Se calcula con el tamaño REAL (sin el 5 % de "levantado"): al soltar se achica desde el centro y queda justo donde
    // se veía (1.12.1, Josué: antes se achicaba hacia la esquina de arriba a la izquierda y parecía moverse).
    let valida = !evaluar(mover(inicio, dx, dy), mover(texto, dx, dy), zona).fuera;
    let animar = false;
    if (!valida) {
      const otra = acomodar(inicio, texto, zona, dx, dy);
      if (otra) { [dx, dy] = otra; valida = true; animar = true; }
    }
    if (!valida) {
      // Ni acomodándolo cabe: vuelve suavemente a donde estaba (no se guarda nada).
      setLevantado(false);
      el.style.transition = 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = '';
      window.setTimeout(() => { if (caja.current) caja.current.style.transition = ''; }, 280);
      return;
    }
    const n = mover(inicio, dx, dy);
    const pos = { x: (n.left - zona.m.left) / zona.m.width, y: (n.top - zona.m.top) / zona.m.height };
    const fijar = () => {
      flushSync(() => { setLevantado(false); moverRecordatorio(r, pos); });
      if (caja.current) { caja.current.style.transition = ''; caja.current.style.transform = ''; }
    };
    if (!animar) { fijar(); return; }
    // Se desliza al lugar permitido más cercano y ahí queda.
    el.style.transition = 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)';
    el.style.transform = `translate3d(${dx / g.escala}px, ${dy / g.escala}px, 0)`;
    window.setTimeout(fijar, 210);
  };
  // Despegar el post-it para moverlo: con el dedo, al mantener presionado; con el MOUSE (1.13.4, Josué), apenas se
  // arrastra (un clic sin mover sigue abriendo las opciones).
  const despegar = () => {
    const g = gesto.current;
    if (!g || g.arrastrando || r.id.startsWith('tmp-') || enviado) return;
    conMouse.current = !!g.mouse;
    g.arrastrando = true;
    navigator.vibrate?.(15);
    try { caja.current?.setPointerCapture(g.id); } catch { /* sin captura igual funciona */ }
    if (papel.current) {
      g.zona = medirZona(papel.current);
      g.inicio = papel.current.getBoundingClientRect();
      // El texto (para permitir que el papel asome por los lados sin cortarlo).
      g.texto = (papel.current.querySelector('[data-texto-postit]') ?? papel.current).getBoundingClientRect();
    }
    if (caja.current) caja.current.style.willChange = 'transform'; // capa propia: moverlo no repinta nada
    onCerrarOpciones();
    setLevantado(true);
  };
  const eventos = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      e.stopPropagation();
      gesto.current = {
        x: e.clientX, y: e.clientY, t: Date.now(), id: e.pointerId, arrastrando: false,
        escala: caja.current && caja.current.offsetWidth ? caja.current.getBoundingClientRect().width / caja.current.offsetWidth : 1,
        timer: window.setTimeout(despegar, MANTENER_MS),
        mouse: e.pointerType === 'mouse',
      };
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      const g = gesto.current;
      if (!g || g.id !== e.pointerId) return;
      const dx = e.clientX - g.x, dy = e.clientY - g.y;
      if (!g.arrastrando) {
        if (Math.hypot(dx, dy) <= MOVER_MAX) return;
        window.clearTimeout(g.timer);
        if (!g.mouse) { gesto.current = null; return; }
        despegar();
        if (!g.arrastrando) { gesto.current = null; return; }
      }
      if (caja.current) caja.current.style.transform = `translate3d(${dx / g.escala}px, ${dy / g.escala}px, 0)`;
      g.dx = dx; g.dy = dy;
      const a = g.inicio;
      const fuera = !!(a && g.texto && g.zona && evaluar(mover(a, dx, dy), mover(g.texto, dx, dy), g.zona).fuera);
      if (fuera !== !!g.fuera) {
        g.fuera = fuera;
        marcarFuera(fuera, g.escala);
        if (fuera) navigator.vibrate?.([30, 40, 30]);
      }
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      const g = gesto.current;
      gesto.current = null;
      if (!g) return;
      window.clearTimeout(g.timer);
      if (g.arrastrando) { soltar(g); return; }
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) < 12 && !r.id.startsWith('tmp-')) {
        // Primer toque a uno recién recibido: solo quita el aviso (cuenta como visto); el siguiente abre las opciones.
        if (nuevoRecibido) { reconocer(r.id); setNuevoRecibido(false); return; }
        const c = caja.current;
        setEscala(c && c.offsetWidth ? c.getBoundingClientRect().width / c.offsetWidth : 1);
        onAlternar();
      }
    },
    onPointerCancel: () => {
      const g = gesto.current;
      gesto.current = null;
      if (!g) return;
      window.clearTimeout(g.timer);
      if (g.arrastrando) soltar(g);
    },
    // Mientras se arrastra, el gesto es del post-it: la página no se desliza ni se cierra.
    onTouchMove: (e: React.TouchEvent) => { if (gesto.current?.arrastrando) e.stopPropagation(); },
    onTouchEnd: (e: React.TouchEvent) => { if (levantado || gesto.current?.arrastrando) e.stopPropagation(); },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
  };

  return (
    <div
      ref={caja}
      role={soloVer ? undefined : 'button'}
      {...(soloVer ? {} : eventos)}
      className={sobreLetra ? `absolute ${soloVer ? 'pointer-events-none' : 'pointer-events-auto'}` : `relative ${alDerecha ? 'self-end' : 'self-start'} max-w-[88%] pointer-events-auto`}
      style={{
        touchAction: soloVer ? undefined : 'none',
        zIndex: levantado ? 40 : abierta ? 30 : sobreLetra ? 10 : undefined,
        ...(sobreLetra && r.pos ? { left: `${r.pos.x * 100}%`, top: `${r.pos.y * 100}%`, maxWidth: '85%', width: 'max-content' } : {}),
      }}
    >
      {/* Post-it (Josué, 1.8.2, estilo C): papelito amarillo con un trozo de cinta, letra manuscrita y apenas
          inclinado (cada uno un poco distinto). Igual en claro, oscuro y en todos los colores: es "papel". */}
      <div
        ref={papel}
        className={`relative text-left ${compacto ? 'px-2.5 pt-1.5 pb-1.5' : 'px-3.5 pt-2.5 pb-2.5'}`}
        style={{
          zoom: tam * f,
          opacity: enviado ? 0.62 : 1,
          // Símbolo: sin papel (el ícono solo, del color del texto de la app; se ve en claro y en oscuro).
          background: simbolo ? 'transparent' : '#FFF3B0', color: '#4A3800', borderRadius: '2px 2px 12px 2px',
          ...(simbolo ? { padding: 2 } : {}),
          boxShadow: simbolo ? (nuevoRecibido && !soloVer ? '0 0 0 2px hsl(var(--especial) / 0.75)' : 'none')
            : levantado ? '0 10px 24px rgba(0,0,0,0.28)'
            : nuevoRecibido && !soloVer ? '0 0 0 2px hsl(var(--especial) / 0.75), 0 2px 6px rgba(0,0,0,0.16)' : '0 2px 6px rgba(0,0,0,0.16)',
          transform: transformPapel,
          transition: 'transform 160ms ease-out, box-shadow 160ms ease-out',
        }}
      >
        {/* Cinta adhesiva (no en los símbolos: van sin papel) */}
        {!simbolo && <span className="absolute left-1/2 -top-1.5 h-3 w-10 -ml-5 bg-white/55 dark:bg-white/35 pointer-events-none"
              style={{ transform: 'rotate(2deg)', boxShadow: '0 0 0 1px rgba(0,0,0,0.04)' }} />}
        {persona && !enviado && !r.autor && (
          <span className={`flex items-center gap-1 font-semibold ${compacto ? 'text-[10px]' : 'text-[11px]'}`} style={{ color: '#7A6420' }}>
            {r.autor ? `${t.rec_from}:` : `${t.rec_for}:`}
            <Punto color={persona.color} />
            {persona.nombre}
            {dejadaAOtro && <span className={colorEstado}>· {textoEstado}</span>}
          </span>
        )}
        {simbolo ? (
          <span data-texto-postit className="block text-foreground"><IconoSimbolo simbolo={simbolo} tam={compacto ? 24 : 30} /></span>
        ) : (
          <span data-texto-postit className="block whitespace-pre-wrap break-words"
                style={{ fontFamily: LETRA_POSTIT, fontSize: compacto ? 15 : 17.5, lineHeight: 1.2 }}>
            {r.texto}
          </span>
        )}
      </div>
      {/* Opciones al tocar (Josué, 1.7.1): Editar (solo las propias) y Eliminar. FLOTAN bajo la nota (no la agrandan):
          si la nota creciera, la letra y la propia nota se moverían bajo el dedo (regla de Josué, 1.4.4). */}
      {/* Tirador para estirar (solo con el post-it tocado): SEPARADO de la esquina de abajo a la derecha (no tapa el
          post-it) y siempre del mismo tamaño y distancia a la vista, aunque haya zoom (1.9.8, Josué). El ancla mide 0 y
          está en la esquina; dentro, todo va "des-ampliado". */}
      {r.autor && !soloVer && nuevoRecibido && (
        // Recibido (1.13.2): la primera vez "Te lo envió X" (celeste); después, al tocarlo, una acotación leve
        // "Enviado por X". Fuera del papel, flotando arriba.
        <div className={`absolute bottom-full left-0 mb-1.5 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap pointer-events-none transition-opacity duration-200 ${
          nuevoRecibido ? 'bg-[hsl(var(--especial))] text-white shadow-sm' : 'bg-card/90 border border-border text-muted-foreground'}`}
             style={{ transform: `scale(${1 / escala})`, transformOrigin: '0 100%' }}>
          {!nuevoRecibido && <Punto color={r.autor.color} />}
          {nuevoRecibido ? t.rec_te_lo_envio(r.autor.nombre) : t.rec_enviado_por(r.autor.nombre)}
        </div>
      )}
      {enviado && r.para && (
        // Fuera del papel, flotando arriba (1.13.1, Josué): a quién se lo envié y si lo vio (tics) o lo eliminó.
        <div className="absolute bottom-full left-0 mb-1.5 flex items-center gap-1 rounded-full bg-card/95 border border-border px-2 py-0.5 text-[10px] font-medium text-foreground whitespace-nowrap shadow-sm pointer-events-none">
          <Punto color={r.para.color} />{r.para.nombre}
          {r.estado === 'eliminado' ? (
            <span className="text-red-600 dark:text-red-400">· {t.rec_deleted_short}</span>
          ) : r.estado === 'visto' ? (
            <Ticks dos className="text-especial" etiqueta={t.rec_seen} />
          ) : (
            <Ticks className="text-muted-foreground" etiqueta={t.rec_sent} />
          )}
        </div>
      )}
      {!soloVer && <>
      {!enviado && <div ref={anclaTirador} className={`absolute ${lado.izq ? 'left-0' : 'right-0'} ${lado.arriba ? 'top-0' : 'bottom-0'} w-0 h-0 z-20`}
           style={{ transform: transformAncla, transformOrigin: '0 0' }}>
        <div {...tirador} aria-label="Tamaño"
             className="absolute rounded-full border border-border bg-card shadow-md flex items-center justify-center text-foreground"
             style={{ left: lado.izq ? -(TIRADOR_SEP + TIRADOR_TAM) : TIRADOR_SEP, top: lado.arriba ? -(TIRADOR_SEP + TIRADOR_TAM) : TIRADOR_SEP,
                      width: TIRADOR_TAM, height: TIRADOR_TAM, touchAction: 'none', opacity: abierta ? 1 : 0, pointerEvents: abierta ? 'auto' : 'none', transition: 'opacity 160ms ease-out' }}>
          <MoveDiagonal2 size={14} />
        </div>
      </div>}
      {/* Opciones: ancla en el centro de abajo (o de arriba) del post-it, des-ampliada como el tirador. */}
      <div className={`absolute left-1/2 ${ubic.arriba ? 'top-0' : 'top-full'} w-0 h-0 z-10`}
           style={{ transform: `scale(${1 / escala})`, transformOrigin: '0 0' }}>
        <div ref={opciones} className="absolute flex gap-2 rounded-full border border-border bg-card p-1 shadow-lg"
             style={{
               left: ubic.dx, ...(ubic.arriba ? { bottom: 8 } : { top: 10 + ubic.baja }),
               opacity: abierta ? 1 : 0, transform: abierta ? 'none' : `translateY(${ubic.arriba ? 4 : -4}px) scale(0.96)`,
               pointerEvents: abierta ? 'auto' : 'none', transition: 'opacity 160ms ease-out, transform 160ms ease-out',
             }}>
          {(r.mio || r.autor) && (
            <button type="button" tabIndex={abierta ? 0 : -1} className={`${opcion} text-foreground whitespace-nowrap`} {...toqueEditar}>
              <PenLine size={13} />{t.rec_edit}
            </button>
          )}
          <button type="button" tabIndex={abierta ? 0 : -1} className={`${opcion} bg-destructive/10 text-destructive whitespace-nowrap`} {...toqueBorrar}>
            <Trash2 size={13} />{t.rec_delete}
          </button>
        </div>
      </div>
      </>}
    </div>
  );
}

/**
 * Post-it de una alabanza. Dos lugares:
 *  - sin `sobreLetra`: los que aún no se movieron, en fila arriba de la letra (su lugar de siempre);
 *  - con `sobreLetra`: los que se movieron, pegados en su lugar de la letra (capa encima del recuadro de la letra,
 *    que debe ser `relative` y llevar data-marco-letra; la página entera lleva data-pagina).
 * Mantener presionado uno lo despega y se arrastra; si se suelta arriba, fuera de la letra, vuelve a la fila.
 */
export function NotasRecordatorio({ notas, compacto = false, onTocar, className = '', sobreLetra = false, alDerecha = false, soloVer = false, enviados = false }: {
  notas: Recordatorio[];
  /** (1.13.1) Son los que envié (vista "Enviados"). */
  enviados?: boolean;
  /** Solo para ver (celular girado): ver Nota. */
  soloVer?: boolean;
  /** Fila pegada a la derecha (ver Nota). */
  alDerecha?: boolean;
  compacto?: boolean;
  /** Editar uno propio (abre el panel). Tocar una nota despliega Editar / Eliminar. */
  onTocar: (r: Recordatorio) => void;
  className?: string;
  sobreLetra?: boolean;
}) {
  const { t } = useI18n();
  const lista = notas.filter(r => (sobreLetra ? !!r.pos : !r.pos));
  // Nota con las opciones desplegadas (una a la vez). Tocar fuera las cierra (regla de Josué).
  const [abiertaId, setAbiertaId] = useState<string | null>(null);
  const contenedor = useRef<HTMLDivElement>(null);
  useAlTocarFuera(contenedor, abiertaId !== null, useCallback(() => setAbiertaId(null), []));
  // Sobre la letra: el post-it se escala con el ancho de la letra (la capa mide lo mismo que el recuadro de la letra;
  // offsetWidth no incluye el zoom de pellizcar, que ya amplía todo junto).
  const [escalaLetra, setEscalaLetra] = useState(1);
  useLayoutEffect(() => {
    const el = contenedor.current;
    if (!sobreLetra || !el) return;
    const medir = () => { if (el.offsetWidth) setEscalaLetra(el.offsetWidth / ANCHO_REF_LETRA); };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, [sobreLetra, lista.length > 0]);
  // Confirmar el borrado. El aviso se fija al ABRIRLO (no cambia mientras se desvanece al cerrar).
  const [aBorrar, setABorrar] = useState<Recordatorio | null>(null);
  const [confirmar, setConfirmar] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const pedirBorrar = (r: Recordatorio) => { setAbiertaId(null); setABorrar(r); setBorrando(false); setConfirmar(true); };
  const editar = (r: Recordatorio) => { setAbiertaId(null); onTocar(r); };
  const borrar = () => {
    if (!aBorrar || borrando) return;
    setBorrando(true);
    setConfirmar(false); // al instante; si el servidor falla, la nota vuelve a aparecer con el aviso
    borrarRecordatorio(aBorrar).catch(e => toast.error(e instanceof ErrorDeRed ? t.rec_needs_internet : e.message));
  };
  const aviso = !aBorrar ? '' : aBorrar.autor ? t.rec_delete_received(aBorrar.autor.nombre)
    : aBorrar.para && aBorrar.estado !== 'eliminado' ? t.rec_delete_both(aBorrar.para.nombre) : '';

  if (lista.length === 0 && !confirmar) return null;
  return (
    <div ref={contenedor}
         className={sobreLetra ? `absolute inset-0 pointer-events-none ${className}` : `w-full flex flex-col pt-1.5 ${compacto ? 'gap-2.5' : 'gap-3.5'} ${className}`}>
      {lista.map((r, i) => (
        <Nota key={r.id} r={r} compacto={compacto} indice={i} abierta={abiertaId === r.id} sobreLetra={sobreLetra} alDerecha={alDerecha} soloVer={soloVer} enviado={enviados} escalaLetra={sobreLetra ? escalaLetra : 1}
              onAlternar={() => setAbiertaId(a => (a === r.id ? null : r.id))} onCerrarOpciones={() => setAbiertaId(null)}
              onEditar={editar} onBorrar={pedirBorrar} />
      ))}
      <Dialog open={confirmar} onOpenChange={o => { if (!o && !borrando) setConfirmar(false); }}>
        <DialogContent capa="z-[70]" className="max-w-[320px] rounded-2xl gap-3">
          <DialogHeader>
            <DialogTitle className="text-base">{t.rec_delete_confirm}</DialogTitle>
          </DialogHeader>
          {aviso && <p className="text-xs text-muted-foreground text-center">{aviso}</p>}
          <div className="flex justify-center gap-2">
            <Button variant="outline" className="h-9 px-4 text-sm" onClick={() => setConfirmar(false)}>{t.rec_cancel}</Button>
            <Button variant="destructive" className="h-9 px-4 text-sm gap-1.5" onClick={borrar} style={{ opacity: borrando ? 0.6 : 1 }}>
              <Trash2 size={14} />{t.rec_delete}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** Con el celular girado (1.9.10, Josué): los post-it que van SOBRE LA LETRA quedan en su lugar; los que se dejaron
 *  arriba del título o sin mover se muestran como acotación arriba del título.
 *  "Sobre la letra" (1.11.0, Josué) = alguna parte del post-it toca la letra: también uno que asoma por arriba de la
 *  primera línea (p. ej. encima de un acorde) sigue en ese punto al girar. Su alto se estima en ~9 % del ancho de la
 *  letra por su tamaño (un renglón; ahora el post-it se escala con la letra, así que esa proporción es fija). */
const tablaRecortes = recortes as unknown as Record<string, [number, number, number, number]>;
export const vaSobreLetra = (r: Recordatorio) => {
  if (!r.pos) return false;
  if (r.pos.y >= 0) return true;
  const rc = tablaRecortes[String(r.himno)];
  const altoSobreAncho = rc ? rc[2] / rc[0] : 0.7;
  return r.pos.y * altoSobreAncho + 0.09 * (r.tam ?? 1) > 0;
};

/** Celular girado (1.11.5, Josué): cuánto sobresalen por ARRIBA de la letra los post-it que van sobre ella (p. ej. uno
 *  encima de un acorde de la primera línea), como fracción del ANCHO de la letra. Se deja ese espacio arriba para que
 *  se vean completos (si no, quedaban cortados y no se podía desplazar hasta ellos). Incluye la cinta (~1,5 %). */
export function sobresaleArriba(notas: Recordatorio[], himno: number): number {
  const rc = tablaRecortes[String(himno)];
  const altoSobreAncho = rc ? rc[2] / rc[0] : 0.7;
  let max = 0;
  for (const r of notas) if (r.pos && r.pos.y < 0 && vaSobreLetra(r)) max = Math.max(max, -r.pos.y * altoSobreAncho);
  return max > 0 ? max + 0.015 : 0;
}

/** Acotaciones (celular girado, 1.9.10): mini post-it + texto del tamaño del título, en fila hacia la derecha, arriba
 *  del título. Solo para ver. El contenedor debe tener container-type inline-size (el tamaño sigue al de la letra). */
export function AcotacionesPostit({ notas, className = '', grande = false }: { notas: Recordatorio[]; className?: string;
  /** (1.17.1) Páginas de texto giradas: un poco más grandes que las de los himnos. */
  grande?: boolean }) {
  const lista = notas.filter(r => !vaSobreLetra(r));
  if (lista.length === 0) return null;
  return (
    // Cada uno es un post-it amarillo ALARGADO hacia el lado (1.10.1, Josué: como el papel, no ícono + texto suelto).
    <div className={`flex flex-wrap items-center gap-x-[0.8em] gap-y-[0.45em] pt-[0.3em] ${className}`}
         style={{ fontSize: grande ? 'clamp(15px, 4.2cqw, 40px)' : 'clamp(13px, 3.4cqw, 34px)', lineHeight: 1.2 }}>
      {lista.map((r, i) => (
        <span key={r.id} className="relative inline-block min-w-0 max-w-full px-[0.6em] pt-[0.18em] pb-[0.14em] whitespace-pre-wrap break-words"
              style={{ fontFamily: LETRA_POSTIT, background: '#FFF3B0', color: '#4A3800', borderRadius: '2px 2px 0.4em 2px',
                       boxShadow: '0 2px 6px rgba(0,0,0,0.16)', transform: `rotate(${i % 2 === 0 ? -0.8 : 0.6}deg)` }}>
          {/* Cinta adhesiva */}
          <span className="absolute left-1/2 -top-[0.22em] h-[0.42em] w-[1.6em] -ml-[0.8em] bg-white/55 dark:bg-white/35 pointer-events-none"
                style={{ transform: 'rotate(2deg)' }} />
          {simboloDe(r.texto) ? <IconoSimbolo simbolo={simboloDe(r.texto)!} tam={18} className="inline-block align-[-0.15em]" /> : r.texto}
        </span>
      ))}
    </div>
  );
}

/** Post-it en miniatura (1.9.6): el mismo papel amarillo con su cinta; con "+" en el botón de arriba. Se usa en
 *  todos lados donde va el ícono de recordatorio, para que coincida con los post-it. */
export function MiniPostit({ tam = 27, mas = true, enviar = false, className = '', contorno = false }: { tam?: number; mas?: boolean; enviar?: boolean; className?: string; contorno?: boolean }) {
  return (
    <span className={`relative inline-block shrink-0 ${className}`}
          style={{ width: tam, height: tam, background: '#FFF3B0', borderRadius: `${tam * 0.08}px ${tam * 0.08}px ${tam * 0.26}px ${tam * 0.08}px`,
                   boxShadow: contorno ? '0 0 0 2px hsl(var(--especial)), 0 1px 4px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.25)',
                   transform: 'rotate(-5deg)', transition: 'box-shadow 200ms ease-out' }}>
      <span className="absolute left-1/2 bg-white/60"
            style={{ top: -tam * 0.11, height: tam * 0.22, width: tam * 0.52, marginLeft: -tam * 0.26, transform: 'rotate(3deg)' }} />
      {(mas || enviar) && (
        <svg viewBox="0 0 24 24" className="absolute inset-0 m-auto" style={{ width: tam * 0.56, height: tam * 0.56 }}
             fill="none" stroke="#7A6420" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
          {/* "Enviados" (1.13.1): flecha que sale, con el mismo trazo que el "+". */}
          {enviar ? <path d="M7 17L17 7M9 7h8v8" /> : <path d="M12 6v12M6 12h12" />}
        </svg>
      )}
    </span>
  );
}

export function BotonRecordatorio({ onClick, className = '' }: { onClick: () => void; className?: string }) {
  const { t } = useI18n();
  // Se activa al soltar el dedo (useToque): tras deslizar a otra canción el navegador no generaba el click del
  // primer toque (Josué, 1.7.4).
  const toque = useToque(onClick);
  return (
    <button
      type="button"
      {...toque}
      onTouchStart={e => e.stopPropagation()}
      // touch-action none: si el dedo se mueve un poquito, el navegador no lo toma como desplazamiento y no cancela
      // el toque (a Josué a veces el primer toque "no funcionaba", 1.7.1).
      style={{ touchAction: 'none' }}
      aria-label={t.rec_add}
      // Un post-it en miniatura (1.9.1, Josué: el ícono genérico ya no calzaba con los post-it): mismo papel amarillo,
      // su trozo de cinta y un "+". Mide lo mismo que los botones redondos de al lado (37 px).
      className={`tap-btn-overlay relative w-[37px] h-[37px] flex items-center justify-center ${className}`}
    >
      <MiniPostit />
    </button>
  );
}

/** Ver los post-it que ENVIÉ (1.13.1, Josué): alterna la vista de la página. Encendido = con un anillo suave. */
export function BotonEnviados({ activo, onClick }: { activo: boolean; onClick: () => void }) {
  const { t } = useI18n();
  const toque = useToque(onClick);
  return (
    <button type="button" {...toque} onTouchStart={e => e.stopPropagation()} style={{ touchAction: 'none' }}
            aria-label={t.rec_sent_title} aria-pressed={activo}
            className="tap-btn-overlay relative w-[37px] h-[37px] flex items-center justify-center">
      {/* (1.17.7, Josué) Activo: el contorno celeste sigue la forma del papelito (no un círculo). */}
      <MiniPostit enviar mas={false} contorno={activo} />
    </button>
  );
}

/** Interruptor largo de dos lados (1.13.1, Josué): es UN solo botón; cada toque pasa al otro lado (no son dos
 *  botones). El lado elegido se marca con una "píldora" que se desliza. */
function Conmutador({ izquierda, derecha, derechaActiva, onCambiar, deshabilitado = false, dosLineas = false }: {
  izquierda: string; derecha: string; derechaActiva: boolean; onCambiar: (derecha: boolean) => void; deshabilitado?: boolean;
  /** (1.13.4, Josué, opción A) Textos largos en dos renglones: un poco más alto, se lee completo. */
  dosLineas?: boolean;
}) {
  const texto = dosLineas ? 'leading-tight [text-wrap:balance]' : 'truncate';
  return (
    <button type="button" role="switch" aria-checked={derechaActiva} disabled={deshabilitado}
            onClick={() => onCambiar(!derechaActiva)}
            className={`relative w-full ${dosLineas ? 'h-[52px] rounded-[22px]' : 'h-10 rounded-full'} bg-muted p-1 grid grid-cols-2 items-center text-[13px] font-medium [touch-action:manipulation] disabled:opacity-50`}>
      <span aria-hidden className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] ${dosLineas ? 'rounded-[18px]' : 'rounded-full'} bg-card shadow-sm`}
            style={{ transform: derechaActiva ? 'translateX(100%)' : 'none', transition: 'transform 200ms cubic-bezier(0.22, 1, 0.36, 1)' }} />
      <span className={`relative text-center ${texto} px-2 transition-colors duration-200 ${derechaActiva ? 'text-muted-foreground' : 'text-foreground'}`}>{izquierda}</span>
      <span className={`relative text-center ${texto} px-2 transition-colors duration-200 ${derechaActiva ? 'text-foreground' : 'text-muted-foreground'}`}>{derecha}</span>
    </button>
  );
}

export function PanelRecordatorio({ abierto, onCerrar, himno, anterior, enviados = [], minutaId = null, minutaPublicada = true }: {
  abierto: boolean;
  onCerrar: () => void;
  himno: number | null;
  /** null = recordatorio nuevo. */
  anterior: Recordatorio | null;
  /** Los que dejé a otras personas en esta alabanza (no se ven sobre la letra; aquí, en "Enviados"). */
  enviados?: Recordatorio[];
  /** La minuta que se está viendo (null en el himnario: ahí solo existe "siempre en esta alabanza"). */
  minutaId?: string | null;
  minutaPublicada?: boolean;
}) {
  const { t } = useI18n();
  const { registrado, puedeDejarAOtros } = useAcceso();
  // El recordatorio que se edita: empieza siendo `anterior`, pero desde "Enviados" se puede elegir otro.
  const [ant, setAnt] = useState<Recordatorio | null>(anterior);
  const [vista, setVista] = useState<'escribir' | 'enviados'>('escribir');
  const [porBorrar, setPorBorrar] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  // (1.17.9, Josué) Lo ESCRITO se recuerda aunque se elija un símbolo: al volver a "Aa" vuelve el texto que estaba.
  const [escrito, setEscrito] = useState('');
  // (1.17.7, Josué) Se puede enviar a VARIAS personas a la vez; al crear, además "También para mí".
  const [elegidos, setElegidos] = useState<string[]>([]);
  const [tambienMio, setTambienMio] = useState(false);
  // "Enviar" (1.13.1): con el interruptor en Enviar aparecen las personas; volver a "Para mí" las oculta.
  const [enviar, setEnviar] = useState(false);
  const [soloMinuta, setSoloMinuta] = useState(false);
  const [personas, setPersonas] = useState<Persona[]>(personasGuardadas);
  const [guardando, setGuardando] = useState(false);
  // Editar uno y dejarlo SIN texto = querer borrarlo: al cerrar (o tocar "Eliminar") se pregunta, en el MISMO panel
  // (Josué, 1.7.1: el basurero dentro de la edición se veía raro).
  const [confirmando, setConfirmando] = useState(false);

  const cargar = (r: Recordatorio | null) => {
    setAnt(r);
    setTexto(r?.texto ?? '');
    setEscrito(r && !simboloDe(r.texto) ? r.texto : '');
    setElegidos(r?.para?.id ? [r.para.id] : []);
    setTambienMio(false);
    setEnviar(!!r?.para);
    setSoloMinuta(r ? !!r.minuta : !!minutaId);
    setGuardando(false);
    setConfirmando(false);
  };

  // Se reinicia al ABRIR, nunca al cerrar (si no, durante el desvanecimiento se vería el estado anterior).
  // 1.8.1: se reinicia DURANTE el dibujo en que se abre (no en un efecto después): con el efecto, el primer cuadro
  // mostraba lo de la vez anterior (p. ej. Guardar/Cancelar visibles) y "parpadeaba" un botón (Josué).
  const [abiertoAntes, setAbiertoAntes] = useState(abierto);
  if (abierto !== abiertoAntes) {
    setAbiertoAntes(abierto);
    if (abierto) { cargar(anterior); setVista('escribir'); setPorBorrar(null); }
  }
  useEffect(() => {
    if (abierto && puedeDejarAOtros && !anterior?.local) cargarPersonas().then(setPersonas);
  }, [abierto]); // eslint-disable-line react-hooks/exhaustive-deps

  // Para otra persona: solo el admin y quienes él autorice. En una minuta privada, "solo esta minuta" no puede ir a
  // otro (no la vería).
  // (1.15.1, Josué) Uno que me ENVIARON: lo edito solo para mí (texto o símbolo); sin alcance ni "Para".
  const recibido = !!ant?.autor;
  const conPersonas = puedeDejarAOtros && !ant?.local && personas.length > 0 && !recibido;
  const bloqueoPrivada = soloMinuta && !!minutaId && !minutaPublicada;
  useEffect(() => { if (bloqueoPrivada) { setElegidos([]); setEnviar(false); } }, [bloqueoPrivada]);

  // Modos (1.17.7): nuevo (Para mí / Enviar), uno MÍO para mí (ya es mío: solo "Enviar" a otros, sin quitármelo),
  // uno que ENVIÉ (se cambia a quién, uno solo) y uno que me enviaron (solo el texto).
  const modo: 'nuevo' | 'mio' | 'enviado' | 'recibido' = !ant ? 'nuevo' : ant.autor ? 'recibido' : ant.para ? 'enviado' : 'mio';
  const alternar = (id: string) => {
    if (modo === 'enviado') { setElegidos([id]); return; }
    setElegidos(v => (v.includes(id) ? v.filter(x => x !== id) : [...v, id]));
  };
  const enviaA = enviar ? elegidos : [];
  const cambio = texto.trim() !== (ant?.texto ?? '') || soloMinuta !== (ant ? !!ant.minuta : !!minutaId)
    || (modo === 'enviado' ? elegidos[0] !== ant?.para?.id : enviaA.length > 0);
  // Con "Enviar" hay que elegir a quién.
  const listo = (cambio || modo === 'nuevo') && texto.trim().length > 0 && !guardando && !(enviar && elegidos.length === 0);

  // Guardar y borrar se ven AL INSTANTE (1.8.1, Josué: "todo fluido"): el panel se cierra ya y el servidor se
  // actualiza por detrás; si falla, el cambio se deshace solo y aparece el aviso.
  const avisarError = (e: any) => toast.error(e instanceof ErrorDeRed ? t.rec_needs_internet : e.message);
  const guardar = () => {
    if (!listo || !himno) return;
    setGuardando(true);
    onCerrar();
    const minuta = soloMinuta && minutaId ? minutaId : null;
    const base = { himno, texto: texto.trim(), minuta };
    const trabajos: Promise<unknown>[] = [];
    if (modo === 'enviado') {
      const id = elegidos[0];
      trabajos.push(guardarRecordatorio({ ...base, anterior: ant, paraId: id, para: personas.find(p => p.id === id) ?? null }, registrado));
    } else {
      // El mío: se crea (nuevo "para mí" o con "También para mí") o se actualiza (editar uno mío).
      if (modo === 'mio' || modo === 'recibido' || !enviar || tambienMio) {
        trabajos.push(guardarRecordatorio({ ...base, anterior: modo === 'nuevo' ? null : ant, paraId: null }, registrado));
      }
      // Y una copia para cada persona elegida.
      for (const id of enviaA) {
        trabajos.push(guardarRecordatorio({ ...base, anterior: null, paraId: id, para: personas.find(p => p.id === id) ?? null }, registrado));
      }
    }
    Promise.all(trabajos).catch(avisarError);
    // Lo enviado a otra persona no queda sobre la letra (1.8.3): un aviso confirma que salió.
    const nombres = enviaA.map(id => personas.find(p => p.id === id)?.nombre).filter(Boolean);
    if (modo !== 'enviado' && nombres.length) toast.success(t.rec_sent_to(nombres.join(', ')));
  };

  const borrar = () => {
    if (!ant || guardando) return;
    setGuardando(true);
    onCerrar();
    borrarRecordatorio(ant).catch(avisarError);
  };

  const vacio = !!ant && texto.trim().length === 0;
  /** Cerrar (tocar fuera, X, atrás): si quedó vacío, primero pregunta. Ya preguntando, cerrar = no borrar nada. */
  const intentarCerrar = () => {
    if (vista === 'escribir' && vacio && !confirmando && !guardando) setConfirmando(true);
    else if (!guardando) onCerrar();
  };
  const avisoBorrar = ant?.para && ant.estado !== 'eliminado' ? t.rec_delete_both(ant.para.nombre)
    : ant?.autor ? t.rec_delete_received(ant.autor.nombre) : '';

  // Opciones del panel: alto de 36 px (antes ~28 y costaba acertarles, Josué 1.7.1) y touch-action none (un toque
  // con un poco de movimiento no se cancela).
  const pastilla = (activa: boolean) =>
    // pan-x: la fila de personas se DESLIZA hacia el lado (con touch-action none no se podía ver a los de la derecha).
    `h-9 px-3.5 rounded-full text-[13px] font-medium border select-none [touch-action:pan-x] transition-colors duration-150 ${
      activa ? 'bg-[#FFF4CC] border-[#FFF4CC] text-[#4A3800]' : 'border-border text-muted-foreground'
    }`;
  const textoEstado = (r: Recordatorio) =>
    r.estado === 'visto' ? t.rec_seen : r.estado === 'eliminado' ? t.rec_deleted_by(r.para?.nombre ?? '') : t.rec_sent;
  const colorEstado = (r: Recordatorio) => (r.estado === 'visto' ? 'text-green-700' : r.estado === 'eliminado' ? 'text-red-700' : '');
  const letraManuscrita = { fontFamily: LETRA_POSTIT, fontSize: 17, lineHeight: 1.2 };

  return (
    <Dialog open={abierto} onOpenChange={o => { if (!o) intentarCerrar(); }}>
      <DialogContent capa="z-[70]" className="max-w-[340px] rounded-2xl gap-3 grid-cols-[minmax(0,1fr)]" onOpenAutoFocus={e => e.preventDefault()}>
        {confirmando ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-base">{t.rec_delete_confirm}</DialogTitle>
            </DialogHeader>
            {avisoBorrar && <p className="text-xs text-muted-foreground text-center">{avisoBorrar}</p>}
            <div className="flex justify-center gap-2">
              <Button variant="outline" className="h-9 px-4 text-sm" onClick={() => setConfirmando(false)}>{t.rec_cancel}</Button>
              <Button variant="destructive" className="h-9 px-4 text-sm gap-1.5" onClick={borrar} style={{ opacity: guardando ? 0.6 : 1 }}>
                <Trash2 size={14} />{t.rec_delete}
              </Button>
            </div>
          </>
        ) : vista === 'enviados' ? (
          // Enviados (1.8.3): los post-it que dejé a otras personas en esta alabanza, con su estado. Tocar uno lo
          // edita; el basurero pregunta antes de eliminar (en la misma fila).
          <>
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-2">
                <Send size={15} className="text-yellow-500" />{t.rec_sent_title}
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 max-h-[55vh] overflow-y-auto py-1 -mx-1 px-1">
              {enviados.length === 0 && <p className="text-xs text-muted-foreground py-4 text-center">{t.rec_sent_none}</p>}
              {enviados.map(r => (
                <div key={r.id} className="rounded-sm px-3 py-2" style={{ background: '#FFF3B0', color: '#4A3800', boxShadow: '0 1px 4px rgba(0,0,0,0.14)' }}>
                  <div className="flex items-start gap-2">
                    <button type="button" className="flex-1 min-w-0 text-left"
                            onClick={() => { if (!r.id.startsWith('tmp-')) { cargar(r); setVista('escribir'); } }}>
                      <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: '#7A6420' }}>
                        {t.rec_for}: <Punto color={r.para!.color} />{r.para!.nombre}
                        <span className={colorEstado(r)}>· {textoEstado(r)}</span>
                      </span>
                      <span className="block whitespace-pre-wrap break-words" style={letraManuscrita}>
                        {simboloDe(r.texto) ? <IconoSimbolo simbolo={simboloDe(r.texto)!} tam={20} /> : r.texto}
                      </span>
                    </button>
                    {porBorrar !== r.id && (
                      <button type="button" aria-label={t.rec_delete} className="p-1.5 -mr-1 rounded-full text-red-700/80 shrink-0"
                              onClick={() => setPorBorrar(r.id)}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                  {porBorrar === r.id && (
                    <div className="flex items-center justify-end gap-2 pt-1.5">
                      <span className="text-[11px] mr-auto" style={{ color: '#7A6420' }}>{t.rec_delete_confirm}</span>
                      <button type="button" className="h-8 px-3 rounded-full text-xs font-medium border border-black/15"
                              onClick={() => setPorBorrar(null)}>{t.rec_cancel}</button>
                      <button type="button" className="h-8 px-3 rounded-full text-xs font-semibold bg-red-600 text-white"
                              onClick={() => { setPorBorrar(null); borrarRecordatorio(r).catch(avisarError); }}>{t.rec_delete}</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-start pt-1">
              <Button variant="outline" className="h-9 px-4 text-sm gap-1.5" onClick={() => { cargar(null); setVista('escribir'); }}>
                <ArrowLeft size={14} />{t.rec_back}
              </Button>
            </div>
          </>
        ) : (<>
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2 pr-6">
            <MiniPostit tam={17} mas={false} className="mr-0.5" />
            {ant ? t.rec_title_edit : t.rec_title_new}
            {/* Recibido: a la derecha del título, quién lo envió (como recordatorio). */}
            {ant?.autor && (
              <span className="ml-auto flex items-center gap-1 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground whitespace-nowrap">
                <Punto color={ant.autor.color} />{t.rec_enviado_por(ant.autor.nombre)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Texto o símbolo (1.13.3, Josué): "Aa" = escribir; o un símbolo (ojo, flecha arriba/abajo, corchea). */}
        <div className="flex items-center gap-1.5">
          {([null, ...Object.keys(SIMBOLOS)] as (Simbolo | null)[]).map(sim => {
            const activo = (simboloDe(texto) ?? null) === sim;
            return (
              <button key={sim ?? 'texto'} type="button" aria-pressed={activo}
                      onClick={() => setTexto(sim ? textoSimbolo(sim) : (simboloDe(texto) ? escrito : texto))}
                      aria-label={sim ? t.rec_simbolo[sim] : t.rec_simbolo_texto}
                      className={`h-9 w-9 rounded-full flex items-center justify-center border transition-colors duration-150 ${
                        activo ? 'bg-[#FFF4CC] border-[#FFF4CC] text-[#4A3800]' : 'border-border text-muted-foreground'}`}>
                {sim ? <IconoSimbolo simbolo={sim} tam={18} /> : <Type size={17} />}
              </button>
            );
          })}
        </div>

        {simboloDe(texto) ? (
          // Mismo alto que el cuadro de texto (el panel no cambia de tamaño al elegir un símbolo).
          <div className="h-[86px] rounded-md border-[0.5px] border-input bg-[hsl(var(--campo))] flex items-center justify-center text-foreground">
            <IconoSimbolo simbolo={simboloDe(texto)!} tam={44} />
          </div>
        ) : (
        <div className="relative">
          <Textarea
            value={texto}
            onChange={e => { const v = e.target.value.slice(0, MAX_TEXTO); setTexto(v); setEscrito(v); }}
            maxLength={MAX_TEXTO}
            placeholder={t.rec_placeholder}
            rows={3}
            className="text-sm resize-none pb-5 h-[86px]"
          />
          {/* Cuenta regresiva de letras (1.9.10, Josué). */}
          <span className={`absolute right-2.5 bottom-1.5 text-[11px] tabular-nums pointer-events-none ${MAX_TEXTO - texto.length <= 10 ? 'text-destructive' : 'text-muted-foreground'}`}>
            {MAX_TEXTO - texto.length}
          </span>
        </div>
        )}

        {/* Alcance (1.13.1, Josué): interruptor largo. Por defecto, en una minuta: "Solo esta minuta". */}
        {minutaId && !recibido && (
          <Conmutador izquierda={t.rec_this_minuta} derecha={t.rec_always} derechaActiva={!soloMinuta} dosLineas
                      onCambiar={siempre => setSoloMinuta(!siempre)} />
        )}

        {/* Para mí / Enviar (1.13.1): interruptor largo DEBAJO; al pasar a Enviar aparecen las personas (en una fila que
            se desliza hacia el lado). Su espacio está siempre reservado: no empuja ni mueve nada. */}
        {conPersonas && (
          <div className="space-y-2">
            {modo === 'nuevo' ? (
              <Conmutador izquierda={t.rec_for_me} derecha={t.rec_send} derechaActiva={enviar} deshabilitado={bloqueoPrivada}
                          onCambiar={setEnviar} />
            ) : modo === 'mio' ? (
              // Ya es mío: solo la opción de enviarlo también a otras personas (no se quita "para mí").
              <button type="button" disabled={bloqueoPrivada} onClick={() => setEnviar(v => !v)} aria-pressed={enviar}
                      className={`w-full h-10 rounded-full border flex items-center justify-center gap-2 text-[13px] font-medium transition-colors duration-150 disabled:opacity-50 ${
                        enviar ? 'bg-[#FFF4CC] border-[#FFF4CC] text-[#4A3800]' : 'border-border text-foreground'}`}>
                <Send size={14} />{t.rec_enviar_otros}
              </button>
            ) : null}
            {bloqueoPrivada ? (
              <p className="text-[11px] text-muted-foreground h-9 flex items-center">{t.rec_private_hint}</p>
            ) : (
              // Fila que se DESLIZA hacia el lado; se puede elegir a VARIAS personas (1.17.7, Josué).
              <div className="flex gap-2 overflow-x-auto h-9 -mx-1 px-1 transition-opacity duration-200 [scrollbar-width:none] [touch-action:pan-x]"
                   style={{ opacity: enviar ? 1 : 0, pointerEvents: enviar ? 'auto' : 'none' }} aria-hidden={!enviar}>
                {modo === 'nuevo' && (
                  <button type="button" tabIndex={enviar ? 0 : -1} aria-pressed={tambienMio}
                          className={`${pastilla(tambienMio)} shrink-0 flex items-center gap-1.5`} onClick={() => setTambienMio(v => !v)}>
                    {tambienMio ? <Check size={13} /> : <MiniPostit tam={13} mas={false} />}{t.rec_tambien_mio}
                  </button>
                )}
                {personas.map(p => (
                  <button key={p.id} type="button" tabIndex={enviar ? 0 : -1} aria-pressed={elegidos.includes(p.id)}
                          className={`${pastilla(elegidos.includes(p.id))} shrink-0 flex items-center gap-1.5`} onClick={() => alternar(p.id)}>
                    <Punto color={p.color} />{p.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Abajo: a la izquierda "Enviados (N)" (si hay, siempre visible); a la derecha Guardar/Cancelar con su espacio
            reservado, que aparecen (opacidad) solo si algo cambió. Si se borró todo el texto de uno existente, en
            lugar de Guardar dice "Eliminar" (pregunta antes). */}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1" />
          <div className="flex gap-2 transition-opacity duration-200"
               style={{ opacity: listo || vacio ? 1 : 0, pointerEvents: listo || vacio ? 'auto' : 'none' }}>
            <Button variant="outline" className="h-9 px-4 text-sm" tabIndex={listo || vacio ? 0 : -1} onClick={onCerrar}>{t.rec_cancel}</Button>
            {vacio ? (
              // (1.17.9, Josué) Dejarlo sin texto ES un cambio: dice "Guardar" (no "Eliminar"); al tocarlo pregunta si
              // se quiere eliminar.
              <Button className="h-9 px-4 text-sm" onClick={() => setConfirmando(true)}>{t.rec_save}</Button>
            ) : (
              <Button className="h-9 px-4 text-sm" tabIndex={listo ? 0 : -1} onClick={guardar}>{t.rec_save}</Button>
            )}
          </div>
        </div>
        </>)}
      </DialogContent>
    </Dialog>
  );
}

/** (1.17.7, Josué) Tic(s) de enviado / visto: dos IGUALES, trazo curvo "en cursiva" (no rectas). */
function Ticks({ dos = false, className = '', etiqueta }: { dos?: boolean; className?: string; etiqueta: string }) {
  const tic = 'M1.5 8.2c1.3.8 2.4 1.9 3.2 3.4C6.7 7.4 9.2 4.2 12.6 1.8';
  return (
    <svg viewBox={dos ? '0 0 19 13' : '0 0 14 13'} width={dos ? 17 : 12.5} height={12} className={className} role="img" aria-label={etiqueta}
         fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <path d={tic} />
      {dos && <path d={tic} transform="translate(5.2 0)" />}
    </svg>
  );
}
