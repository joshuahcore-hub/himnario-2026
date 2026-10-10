import { useEffect, RefObject } from 'react';

/**
 * Mientras `activo` sea true, tocar fuera del elemento `ref` llama a `alTocarFuera`
 * (por ejemplo, cerrar una edición o salir de un modo), igual que pulsar la X.
 */
export function useAlTocarFuera(ref: RefObject<HTMLElement>, activo: boolean, alTocarFuera: () => void) {
  useEffect(() => {
    if (!activo) return;
    const manejar = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) alTocarFuera();
    };
    document.addEventListener('pointerdown', manejar, { capture: true });
    return () => document.removeEventListener('pointerdown', manejar, { capture: true });
  }, [ref, activo, alTocarFuera]);
}
