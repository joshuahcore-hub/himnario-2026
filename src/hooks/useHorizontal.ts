// Celular girado (Josué, 1.6.0): la app queda en vertical, salvo el himno abierto y el lector de minutas, donde se
// puede girar y la letra se ve a todo el ancho (se recorre hacia abajo con el dedo).
// El manifiesto dice orientation "any"; el resto de la app se fija en vertical con screen.orientation.lock.
// (1.6.1) En esas pantallas se pide lock('any') en vez de unlock(): unlock vuelve a la orientación con que se
// INSTALÓ la app (en Android quedaba "portrait" grabado y no giraba). Además hay un botón para girar a mano.
import { useEffect, useState } from 'react';

// Solo celulares: alto chico en horizontal. Tabletas y computador no cambian.
const CONSULTA = '(orientation: landscape) and (max-height: 560px)';

type Orientacion = 'portrait' | 'landscape' | 'any';

async function fijar(o: Orientacion): Promise<boolean> {
  try {
    await (screen.orientation as any).lock(o);
    return true;
  } catch {
    return false;
  }
}

export function fijarVertical() {
  fijar('portrait');
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
}

/** El botón de girar solo tiene sentido en celulares que permiten fijar la orientación (Android). */
export const puedeGirar = (() => {
  try {
    return typeof (screen.orientation as any)?.lock === 'function' && window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
})();

/**
 * Botón "girar": pasa a horizontal o vuelve a vertical, aunque el celular esté derecho.
 * Si el navegador solo deja fijar la orientación en pantalla completa (no instalada), entra a pantalla completa.
 */
export async function girarPantalla(horizontalAhora: boolean) {
  const destino: Orientacion = horizontalAhora ? 'portrait' : 'landscape';
  if (await fijar(destino)) return;
  try {
    await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    await fijar(destino);
  } catch { /* no se puede en este celular */ }
}

/** true si el celular está en horizontal. Además permite girar mientras la pantalla esté abierta. */
export function useHorizontal(): boolean {
  const [horizontal, setHorizontal] = useState(() => window.matchMedia(CONSULTA).matches);
  useEffect(() => {
    const mq = window.matchMedia(CONSULTA);
    const cambio = () => setHorizontal(mq.matches);
    mq.addEventListener('change', cambio);
    fijar('any');
    return () => { mq.removeEventListener('change', cambio); fijarVertical(); };
  }, []);
  return horizontal;
}
