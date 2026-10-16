// Espacios de minutas (1.16.0, Josué): Batuco, Talca… (el admin agrega más en Administración). Arriba en Minutas se
// ve SOLO el nombre del espacio actual; tocarlo pasa al siguiente. Las minutas nuevas se crean en el espacio que se
// está viendo. El espacio elegido se recuerda en este celular. Copia local de la lista para usar sin internet.
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export interface Espacio { id: string; nombre: string }

const GUARDADO = 'himnario_espacios';
const ACTUAL = 'himnario_espacio';
const PREDETERMINADOS: Espacio[] = [{ id: 'batuco', nombre: 'Batuco' }, { id: 'talca', nombre: 'Talca' }];

let lista: Espacio[] = (() => {
  try { const g = JSON.parse(localStorage.getItem(GUARDADO) || 'null'); return Array.isArray(g) && g.length ? g : PREDETERMINADOS; }
  catch { return PREDETERMINADOS; }
})();
let actual: string = (() => { try { return localStorage.getItem(ACTUAL) || lista[0].id; } catch { return lista[0].id; } })();
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach(f => f());

function fijarLista(l: Espacio[]) {
  if (!l.length) return;
  lista = l;
  try { localStorage.setItem(GUARDADO, JSON.stringify(l)); } catch { /* sin espacio */ }
  if (!l.some(e => e.id === actual)) actual = l[0].id;
  avisar();
}

export async function refrescarEspacios() {
  try { fijarLista(await api<Espacio[]>('espacios')); } catch { /* sin internet: la copia local */ }
}

export function elegirEspacio(id: string) {
  actual = id;
  try { localStorage.setItem(ACTUAL, id); } catch { /* da igual */ }
  avisar();
}

/** El espacio que se está viendo (para crear minutas en él). */
export const espacioActual = () => actual;

export async function agregarEspacio(nombre: string) {
  fijarLista(await api<Espacio[]>('espacios', { metodo: 'POST', datos: { nombre } }));
}

/** (1.17.7) Cambiar el nombre de un espacio (solo el admin). */
export async function renombrarEspacio(id: string, nombre: string) {
  fijarLista(await api<Espacio[]>(`espacios/${id}`, { metodo: 'PATCH', datos: { nombre } }));
}

/** (1.17.7) Eliminar un espacio: sus minutas pasan al primero de los que quedan (lo hace el servidor). */
export async function eliminarEspacio(id: string) {
  fijarLista(await api<Espacio[]>(`espacios/${id}`, { metodo: 'DELETE' }));
}

export function useEspacios(): { espacios: Espacio[]; actual: Espacio; siguiente: () => void } {
  const [, setN] = useState(0);
  useEffect(() => {
    const f = () => setN(n => n + 1);
    oyentes.add(f);
    refrescarEspacios();
    return () => { oyentes.delete(f); };
  }, []);
  const i = Math.max(0, lista.findIndex(e => e.id === actual));
  return {
    espacios: lista,
    actual: lista[i],
    siguiente: () => elegirEspacio(lista[(i + 1) % lista.length].id),
  };
}
