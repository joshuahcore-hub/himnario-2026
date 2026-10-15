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
  /** (1.7.1) Registrado sin permiso de crear minutas = false. El admin siempre true. */
  crea_minutas?: boolean;
  /** (1.7.1) Puede dejar recordatorios a otras personas (lo activa el admin). */
  recordatorios_otros?: boolean;
  /** (1.10.0) Puede ver las minutas (lo activa el admin; desde 1.11.0 apagado al registrarse). */
  ve_minutas?: boolean;
  /** (1.12.0) Generar la proyección (PowerPoint del culto). El admin siempre. */
  proyeccion?: boolean;
}

interface ContextoAcceso extends Acceso {
  /** Crear y editar minutas (creadores y admin). */
  puedeEditar: boolean;
  /** Registrado con nombre y color (recordatorios en el servidor; se le pueden dejar recordatorios). */
  registrado: boolean;
  /** Dejar recordatorios a otras personas. */
  puedeDejarAOtros: boolean;
  /** (1.11.0) Ver minutas: hay que estar registrado y con el permiso (o crear minutas, o ser admin). */
  puedeVerMinutas: boolean;
  /** (1.12.0) Generar la proyección (solo se ofrece en el computador). */
  puedeProyectar: boolean;
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
    puedeEditar: acceso.estado === 'aprobado' && (acceso.rol === 'admin' || acceso.crea_minutas !== false),
    registrado: acceso.estado === 'aprobado',
    puedeDejarAOtros: acceso.estado === 'aprobado' && (acceso.rol === 'admin' || !!acceso.recordatorios_otros),
    esAdmin: acceso.estado === 'aprobado' && acceso.rol === 'admin',
    // Copia guardada de antes de 1.10.0 (sin el campo): como estaba, hasta que llegue la respuesta del servidor.
    puedeVerMinutas: acceso.estado === 'aprobado'
      && (acceso.rol === 'admin' || acceso.ve_minutas !== false || acceso.crea_minutas !== false),
    puedeProyectar: acceso.estado === 'aprobado' && (acceso.rol === 'admin' || !!acceso.proyeccion),
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
