// Protege una pantalla con cambios sin guardar: si la persona intenta salir (gesto/botón "atrás" del celular,
// la X de la pantalla o tocar otra pestaña), en vez de salir de golpe se pregunta qué hacer.
// Para el "atrás" del celular se agrega una entrada extra al historial ("trampa") mientras haya cambios:
// al volver atrás se consume esa entrada, se repone y se muestra la pregunta.
import { useCallback, useEffect, useRef, useState } from 'react';
import { setGuardiaSalida } from '@/lib/guardiaSalida';

export function useSalidaProtegida(hayCambios: boolean, antesDeSalir?: () => boolean) {
  /** Salida pendiente de confirmar (null = no hay pregunta abierta). */
  const [pendiente, setPendiente] = useState<null | (() => void)>(null);
  const trampa = useRef(false);
  const saliendo = useRef(false);
  // Con "atrás" primero se cierra lo que esté abierto encima (p. ej. el buscador de cantos).
  const antesRef = useRef(antesDeSalir);
  antesRef.current = antesDeSalir;

  /** Sale ejecutando `accion`, quitando antes la entrada extra del historial si la hay. */
  const salirHacia = useCallback((accion: () => void) => {
    saliendo.current = true;
    setGuardiaSalida(null);
    if (trampa.current) {
      trampa.current = false;
      window.addEventListener('popstate', () => accion(), { once: true });
      history.back();
    } else {
      accion();
    }
  }, []);

  const volver = useCallback(() => salirHacia(() => history.back()), [salirHacia]);

  // "Atrás" del celular.
  useEffect(() => {
    if (!hayCambios) {
      // Ya no hay cambios (p. ej. se deshicieron): quitar la entrada extra para que "atrás" salga normal.
      if (trampa.current && !saliendo.current) { trampa.current = false; history.back(); }
      return;
    }
    if (!trampa.current) { history.pushState({ trampaEditor: true }, ''); trampa.current = true; }
    const alVolver = () => {
      if (saliendo.current) return;
      history.pushState({ trampaEditor: true }, '');
      if (antesRef.current?.()) return;
      setPendiente(() => volver);
    };
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, [hayCambios, volver]);

  // Pestañas de abajo.
  useEffect(() => {
    setGuardiaSalida(hayCambios ? continuar => { setPendiente(() => () => salirHacia(continuar)); return true; } : null);
    return () => setGuardiaSalida(null);
  }, [hayCambios, salirHacia]);

  // Recargar o cerrar la app: aviso del sistema.
  useEffect(() => {
    if (!hayCambios) return;
    const antes = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', antes);
    return () => window.removeEventListener('beforeunload', antes);
  }, [hayCambios]);

  /** Salir (X de la pantalla): pregunta si hay cambios; si no, vuelve atrás. */
  const intentarVolver = useCallback(() => {
    if (hayCambios) setPendiente(() => volver);
    else history.back();
  }, [hayCambios, volver]);

  return { pendiente, cerrarPregunta: () => setPendiente(null), salirHacia, intentarVolver };
}
