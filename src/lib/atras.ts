// "Atrás" del celular con un panel abierto (1.13.4, Josué: "todos esos detalles, ser riguroso"): si hay un panel
// (diálogo, buscador, filtros, calendario…) abierto, "atrás" CIERRA ESE PANEL y nada más; no sale de la pantalla ni
// pregunta "¿Descartar?". Cada panel abierto deja una entrada en el historial; al cerrarlo a mano se quita sola.
// La escucha se registra al cargar este módulo (antes que React Router y que useSalidaProtegida), así puede cortar el
// evento para que nadie más lo procese.
import { useEffect, useRef } from 'react';

const pila: { id: number; cerrar: () => void }[] = [];
let siguiente = 0;
let ignorar = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', e => {
    if (ignorar > 0) { ignorar--; e.stopImmediatePropagation(); return; }
    const arriba = pila.pop();
    if (arriba) { e.stopImmediatePropagation(); arriba.cerrar(); }
  });
}

export function useAtrasCierra(abierto: boolean, cerrar: () => void) {
  const cerrarRef = useRef(cerrar);
  cerrarRef.current = cerrar;
  useEffect(() => {
    if (!abierto) return;
    const id = ++siguiente;
    const entrada = { id, cerrar: () => cerrarRef.current() };
    history.pushState({ ...(history.state ?? {}), panelAtras: id }, '');
    pila.push(entrada);
    return () => {
      const i = pila.indexOf(entrada);
      if (i < 0) return; // ya se cerró con "atrás"
      pila.splice(i, 1);
      // Cerrado a mano: quitar su entrada, pero solo si seguimos en ella (si la app ya navegó a otra pantalla, no).
      if ((history.state as { panelAtras?: number } | null)?.panelAtras === id) { ignorar++; history.back(); }
    };
  }, [abierto]);
}
