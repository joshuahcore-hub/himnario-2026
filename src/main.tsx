import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

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
}

createRoot(document.getElementById("root")!).render(<App />);

// Desvanece la pantalla de apertura (index.html) apenas la app ya se dibujó.
// Respaldo con tiempo: si la pantalla no está dibujando (app en segundo plano), igual se quita.
let aperturaQuitada = false;
const quitarApertura = () => {
  const apertura = document.getElementById("apertura");
  if (aperturaQuitada || !apertura) return;
  aperturaQuitada = true;
  apertura.classList.add("oculta");
  setTimeout(() => apertura.remove(), 300);
};
requestAnimationFrame(() => requestAnimationFrame(quitarApertura));
setTimeout(quitarApertura, 600);
