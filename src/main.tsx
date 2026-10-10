import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Service worker: guarda la app y los himnos para usarlos sin internet, y la actualiza sola.
// Al abrir la app con internet revisa si hay versión nueva; también cada hora si queda abierta.
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registro) {
      if (registro) setInterval(() => registro.update().catch(() => {}), 60 * 60 * 1000);
    },
  });
}

createRoot(document.getElementById("root")!).render(<App />);
