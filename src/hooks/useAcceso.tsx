// Estado de acceso de este celular: visor (ninguno), creador pendiente/aprobado/rechazado/deshabilitado, o admin.
// Se guarda una copia local para que la app sepa el rol aunque no haya internet.
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '@/lib/api';

export type EstadoAcceso = 'ninguno' | 'pendiente' | 'aprobado' | 'rechazado' | 'deshabilitado';

export interface Acceso {
  estado: EstadoAcceso;
  rol?: 'creador' | 'admin';
  nombre?: string;
  color?: string;
}

interface ContextoAcceso extends Acceso {
  puedeEditar: boolean;
  esAdmin: boolean;
  recargar: () => Promise<void>;
  solicitar: (nombre: string, color: string) => Promise<void>;
  activarAdmin: (clave: string, nombre: string, color: string) => Promise<void>;
  actualizarPerfil: (cambios: { nombre?: string; color?: string }) => Promise<void>;
}

const GUARDADO = 'himnario_acceso';

export const COLORES = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB',
  '#64B5F6', '#4DB6AC', '#81C784', '#FFD54F', '#FF8A65',
];

function leerGuardado(): Acceso {
  try {
    const raw = localStorage.getItem(GUARDADO);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { estado: 'ninguno' };
}

const Contexto = createContext<ContextoAcceso | null>(null);

export function AccesoProvider({ children }: { children: ReactNode }) {
  const [acceso, setAcceso] = useState<Acceso>(leerGuardado);

  const guardar = useCallback((a: Acceso) => {
    setAcceso(a);
    try { localStorage.setItem(GUARDADO, JSON.stringify(a)); } catch {}
  }, []);

  const recargar = useCallback(async () => {
    try {
      guardar(await api<Acceso>('acceso/yo'));
    } catch {
      // Sin internet: se mantiene la copia local.
    }
  }, [guardar]);

  useEffect(() => {
    recargar();
    const alVolver = () => { if (document.visibilityState === 'visible') recargar(); };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [recargar]);

  const solicitar = useCallback(async (nombre: string, color: string) => {
    guardar(await api<Acceso>('acceso/solicitar', { metodo: 'POST', datos: { nombre, color } }));
  }, [guardar]);

  const activarAdmin = useCallback(async (clave: string, nombre: string, color: string) => {
    guardar(await api<Acceso>('admin/activar', { metodo: 'POST', datos: { clave, nombre, color } }));
  }, [guardar]);

  const actualizarPerfil = useCallback(async (cambios: { nombre?: string; color?: string }) => {
    guardar(await api<Acceso>('acceso/yo', { metodo: 'PATCH', datos: cambios }));
  }, [guardar]);

  const valor: ContextoAcceso = {
    ...acceso,
    puedeEditar: acceso.estado === 'aprobado',
    esAdmin: acceso.estado === 'aprobado' && acceso.rol === 'admin',
    recargar,
    solicitar,
    activarAdmin,
    actualizarPerfil,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAcceso(): ContextoAcceso {
  const c = useContext(Contexto);
  if (!c) throw new Error('useAcceso debe usarse dentro de AccesoProvider');
  return c;
}
