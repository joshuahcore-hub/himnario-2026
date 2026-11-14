import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { registerSW } from "virtual:pwa-register";
// Primero: la escucha de "atrás" de los paneles debe registrarse antes que las de React Router y del editor.
import "@/lib/atras";
import App from "./App.tsx";
import "./index.css";
import { fijarVertical } from "@/hooks/useHorizontal";
import { iniciarCompaGlobal } from "@/lib/compaGlobal";
import { hayGuardiaSalida } from "@/lib/guardiaSalida";

// La app va en vertical; solo el himno abierto y el lector de minutas permiten girar (useHorizontal).
fijarVertical();

// (1.30.0) Modo Compañerismo: lo pone el administrador para todos; cada equipo lo pregunta al servidor.
iniciarCompaGlobal();

// Service worker: guarda la app y los himnos para usarlos sin internet.
// (1.32.6, Josué: "que la actualización llegue al tiro, sin tener que recargar") Busca versión nueva SEGUIDO: al abrir,
// al volver a la app, al recuperar internet y cada 5 min con la app a la vista. La versión nueva se baja en silencio y se
// aplica SOLA (cambia y recarga) solo cuando nadie la está usando: al pasar a segundo plano, o recién abierta antes del
// primer toque (parece la misma apertura). NUNCA con un panel abierto, cambios sin guardar o escribiendo: entonces
// espera a la próxima vez que se oculte (o a la próxima apertura). Al recargar se vuelve a la misma pantalla.
if (import.meta.env.PROD) {
  const inicio = Date.now();
  let hayVersionNueva = false;
  let aplicando = false;
  let recargarAlOcultar = false;
  let tocó = false;
  let ultimaBusqueda = 0;
  let registroSW: ServiceWorkerRegistration | undefined;
  const marcarToque = () => { tocó = true; };
  window.addEventListener("pointerdown", marcarToque, { capture: true, once: true });
  window.addEventListener("keydown", marcarToque, { capture: true, once: true });

  /** Recién abierta y sin tocar todavía: recargar ahí se ve como parte de la apertura. */
  const recienAbierta = () => !tocó && Date.now() - inicio < 8000;
  /** Nadie está a mitad de algo: sin paneles abiertos, sin cambios sin guardar y sin escribir. */
  const esSeguro = () => {
    if (hayGuardiaSalida()) return false;
    if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return false;
    const a = document.activeElement as HTMLElement | null;
    if (a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable)) return false;
    return true;
  };
  /** Evita un bucle si algo falla: como mucho una recarga por actualización cada 2 min. */
  const recargoHacePoco = () => {
    try { return Date.now() - Number(sessionStorage.getItem("act-recarga") || 0) < 120000; } catch { return true; }
  };
  const momentoBueno = () => (document.visibilityState === "hidden" || recienAbierta()) && esSeguro();

  const buscar = (minimo: number) => {
    if (!registroSW || !navigator.onLine || Date.now() - ultimaBusqueda < minimo) return;
    ultimaBusqueda = Date.now();
    registroSW.update().catch(() => {});
  };

  const intentarAplicar = () => {
    if (!hayVersionNueva || aplicando || !momentoBueno() || recargoHacePoco()) return;
    aplicando = true;
    try { sessionStorage.setItem("act-recarga", String(Date.now())); } catch { /* nada */ }
    activarVersionNueva(); // la nueva toma el control → onNeedReload recarga
    setTimeout(() => { if (momentoBueno()) location.reload(); }, 4000); // por si el cambio no avisa
  };

  const activarVersionNueva = registerSW({
    immediate: true,
    onNeedRefresh() {
      hayVersionNueva = true;
      intentarAplicar();
    },
    onNeedReload() {
      // La versión nueva ya manda. Recargar solo si sigue siendo buen momento; si la persona volvió justo, al ocultar.
      if (momentoBueno()) location.reload();
      else recargarAlOcultar = true;
    },
    onRegisteredSW(_url, registro) {
      registroSW = registro;
      ultimaBusqueda = Date.now(); // el registro recién hecho ya buscó
      setInterval(() => { if (document.visibilityState === "visible") buscar(4 * 60 * 1000); }, 5 * 60 * 1000);
    },
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      if (recargarAlOcultar && esSeguro()) { location.reload(); return; }
      intentarAplicar();
      buscar(60 * 1000); // si hay nueva, se baja ahora y se aplica en cuanto quede lista (sigue oculta)
    } else {
      buscar(30 * 1000); // volvió a la app
    }
  });
  window.addEventListener("online", () => buscar(0));

  // Red de seguridad: si la app abrió SIN estilos (CSS guardado roto o de una versión que ya no existe),
  // se repara sola: 1.º recarga; 2.º si sigue igual, borra lo guardado y recarga desde internet. Solo 2 intentos.
  window.addEventListener("load", () => setTimeout(async () => {
    const conEstilos = getComputedStyle(document.documentElement).getPropertyValue("--background").trim() !== "";
    let intento = 0;
    try { intento = Number(sessionStorage.getItem("reparar-estilos") || 0); } catch { /* sin sessionStorage */ }
    if (conEstilos) {
      try { sessionStorage.removeItem("reparar-estilos"); } catch { /* nada */ }
      return;
    }
    if (intento >= 2 || !navigator.onLine) return;
    try { sessionStorage.setItem("reparar-estilos", String(intento + 1)); } catch { return; } // sin registro, no arriesgar un bucle
    if (intento === 1) {
      for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
      for (const k of await caches.keys()) await caches.delete(k);
    }
    location.reload();
  }, 300));
}

// (1.19.18, Josué) Primer dibujo SIN esperas: la app se arma completa mientras corre este archivo (flushSync) y el
// navegador no muestra nada antes (el script lleva blocking="render", ver vite.config.ts). Al recargar se sigue viendo la
// pantalla anterior hasta que aparece la nueva ya armada: sin el destello vacío de antes.
const raiz = createRoot(document.getElementById("root")!);
flushSync(() => raiz.render(<App />));
