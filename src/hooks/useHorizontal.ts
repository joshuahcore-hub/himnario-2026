// Celular girado (Josué, 1.6.0): la app queda en vertical, salvo el himno abierto y el lector de minutas, donde se
// puede girar y la letra se ve a todo el ancho (se recorre hacia abajo con el dedo).
// El manifiesto dice orientation "any"; el resto de la app se fija en vertical con screen.orientation.lock
// (funciona en la app instalada de Android; donde no se puede, simplemente no hace nada).
import { useEffect, useState } from 'react';

// Solo celulares: alto chico en horizontal. Tabletas y computador no cambian.
const CONSULTA = '(orientation: landscape) and (max-height: 560px)';

export function fijarVertical() {
  try { (screen.orientation as any)?.lock?.('portrait')?.catch?.(() => {}); } catch { /* no disponible */ }
}

function permitirGirar() {
  try { screen.orientation?.unlock?.(); } catch { /* no disponible */ }
}

/** true si el celular está en horizontal. Además permite girar mientras la pantalla esté abierta. */
export function useHorizontal(): boolean {
  const [horizontal, setHorizontal] = useState(() => window.matchMedia(CONSULTA).matches);
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const cambio = () => setHorizontal(mq.matches);
    mq.addEventListener('change', cambio);
    permitirGirar();
    return () => { mq.removeEventListener('change', cambio); fijarVertical(); };
  }, []);
  return horizontal;
}
