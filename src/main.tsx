import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
// Primero: la escucha de "atrás" de los paneles debe registrarse antes que las de React Router y del editor.
import "@/lib/atras";
import App from "./App.tsx";
import "./index.css";
import { fijarVertical } from "@/hooks/useHorizontal";

// La app va en vertical; solo el himno abierto y el lector de minutas permiten girar (useHorizontal).
fijarVertical();

// Service worker: guarda la app y los himnos para usarlos sin internet.
// Actualizaciones sin interrumpir: la versión nueva se descarga en silencio y queda en espera;
// se activa cuando la app pasa a segundo plano, SIN recargar la pantalla. La próxima vez que se abra
// la app desde cero ya usa la versión nueva. Nunca se corta lo que la persona está haciendo.
if (import.meta.env.PROD) {
  let hayVersionNueva = false;
  const activarVersionNueva = registerSW({
    immediate: true,
    onNeedRefresh() {
      hayVersionNueva = true;
      if (document.visibilityState === "hidden") activarVersionNueva();
    },
    onNeedReload() {
      // No recargar nunca por una actualización.
    },
    onRegisteredSW(_url, registro) {
      if (registro) setInterval(() => registro.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && hayVersionNueva) activarVersionNueva();
  });

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

createRoot(document.getElementById("root")!).render(<App />);
