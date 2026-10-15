// Recordatorios (1.7.0, Josué): notas amarillas sobre un himno, que aparecen al abrirlo en el himnario o en
// cualquier minuta que lo tenga.
// - Personas registradas (nombre y color; creadores, músicos y admin): en el servidor. Copia local para verlos sin
//   internet. Dejar recordatorios a OTROS: solo el admin y quienes él autorice; aparecen directo (1.7.1).
// - Visores sin registrarse: solo para sí mismos, guardados SOLO en su celular.
// Solo quien escribió un recordatorio lo edita. Quien lo recibe lo puede borrar (manteniéndolo presionado): deja de
// verlo y quien lo dejó ve "Eliminado por …".
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface Persona { id: string; nombre: string; color: string }

export interface Recordatorio {
  id: string;
  himno: number;
  texto: string;
  /** null = siempre en este canto (himnario y toda minuta); un id = solo en esa minuta (y sus copias). */
  minuta: string | null;
  creado: string;
  /** Dejado a otra persona: enviado → visto (le apareció) → eliminado (lo borró quien lo recibió). */
  estado: 'enviado' | 'visto' | 'eliminado';
  /** Lo escribí yo (puedo editarlo y borrarlo). */
  mio: boolean;
  /** Quién me lo dejó (null si lo escribí yo). */
  autor: { nombre: string; color: string } | null;
  /** Para quién lo dejé (null si es para mí). */
  para: Persona | null;
  /** Guardado solo en este celular (visor). */
  local?: boolean;
}

const CLAVE_SERVIDOR = 'himnario_recordatorios';
const CLAVE_LOCALES = 'himnario_recordatorios_locales';
const CLAVE_PERSONAS = 'himnario_personas';

const leer = <T,>(clave: string, porDefecto: T): T => {
  try {
    const raw = localStorage.getItem(clave);
    return raw ? JSON.parse(raw) : porDefecto;
  } catch {
    return porDefecto;
  }
};
const escribir = (clave: string, valor: unknown) => {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch { /* sin espacio */ }
};

let delServidor: Recordatorio[] = leer(CLAVE_SERVIDOR, []);
let locales: Recordatorio[] = leer(CLAVE_LOCALES, []);
let personas: Persona[] = leer(CLAVE_PERSONAS, []);
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());

function fijarServidor(lista: Recordatorio[]) { delServidor = lista; escribir(CLAVE_SERVIDOR, lista); avisar(); }
function fijarLocales(lista: Recordatorio[]) { locales = lista; escribir(CLAVE_LOCALES, lista); avisar(); }

let ultimaCarga = 0;
/** Trae del servidor los recordatorios propios y los recibidos (solo creadores y admin). */
export async function cargarRecordatorios(registrado: boolean, forzar = false) {
  if (!registrado) return;
  if (!forzar && Date.now() - ultimaCarga < 15_000) return;
  ultimaCarga = Date.now();
  try {
    fijarServidor(await api<Recordatorio[]>('recordatorios'));
  } catch { /* sin internet: queda la copia local */ }
}

export async function cargarPersonas(): Promise<Persona[]> {
  try {
    personas = await api<Persona[]>('personas');
    escribir(CLAVE_PERSONAS, personas);
  } catch { /* sin internet: la última lista conocida */ }
  return personas;
}
export const personasGuardadas = () => personas;

/**
 * Devuelve una función que da los recordatorios de un himno: primero los míos para mí, luego los que me dejaron y
 * al final los que dejé a otros. minutaId: la minuta que se está viendo (null en el himnario): ahí se suman los
 * "solo en esta minuta". Se redibuja solo cuando cambian los recordatorios.
 */
export function useRecordatorios(registrado: boolean, minutaId: string | null = null): (himno: number | null | undefined) => Recordatorio[] {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const f = () => setVersion(v => v + 1);
    oyentes.add(f);
    cargarRecordatorios(registrado);
    const alVolver = () => { if (document.visibilityState === 'visible') cargarRecordatorios(registrado, true); };
    document.addEventListener('visibilitychange', alVolver);
    return () => { oyentes.delete(f); document.removeEventListener('visibilitychange', alVolver); };
  }, [registrado]);
  const todos = [...locales, ...(registrado ? delServidor : [])];
  const orden = (r: Recordatorio) => (r.para ? 2 : r.autor ? 1 : 0);
  return himno => (!himno ? [] : todos
    .filter(r => r.himno === himno && (r.minuta === null || r.minuta === undefined || r.minuta === minutaId))
    .sort((a, b) => orden(a) - orden(b) || a.creado.localeCompare(b.creado)));
}

/** Crea o cambia un recordatorio. paraId null = para mí. */
export async function guardarRecordatorio(datos: { anterior: Recordatorio | null; himno: number; texto: string; paraId: string | null; minuta: string | null }, registrado: boolean) {
  const { anterior, himno, texto, paraId, minuta } = datos;
  // Visor (o recordatorio que se guardó cuando era visor): solo en este celular.
  if (!registrado || anterior?.local) {
    if (anterior) fijarLocales(locales.map(r => (r.id === anterior.id ? { ...r, texto, minuta } : r)));
    else fijarLocales([...locales, { id: crypto.randomUUID(), himno, texto, minuta, estado: 'enviado', creado: new Date().toISOString(), mio: true, autor: null, para: null, local: true }]);
    return;
  }
  const r = anterior
    ? await api<Recordatorio>(`recordatorios/${anterior.id}`, { metodo: 'PATCH', datos: { texto, para: paraId, minuta } })
    : await api<Recordatorio>('recordatorios', { metodo: 'POST', datos: { himno, texto, para: paraId, minuta } });
  fijarServidor(anterior ? delServidor.map(x => (x.id === r.id ? r : x)) : [...delServidor, r]);
}

/** Quien lo recibe: avisa (una vez) que le apareció, para que quien lo dejó vea "Visto". Sin internet, otro día. */
export function marcarVisto(r: Recordatorio) {
  if (r.local || !r.autor || r.estado !== 'enviado') return;
  api(`recordatorios/${r.id}/visto`, { metodo: 'POST' })
    .then(() => fijarServidor(delServidor.map(x => (x.id === r.id ? { ...x, estado: 'visto' } : x))))
    .catch(() => {});
}

export async function borrarRecordatorio(r: Recordatorio) {
  if (r.local) { fijarLocales(locales.filter(x => x.id !== r.id)); return; }
  await api(`recordatorios/${r.id}`, { metodo: 'DELETE' });
  fijarServidor(delServidor.filter(x => x.id !== r.id));
}
