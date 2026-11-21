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
// (1.33.8, Josué 20-11-2026: "que se actualice sola para todas las personas, sin tener que recargar") ANTES la versión
// nueva quedaba EN ESPERA y solo se activaba si esta página alcanzaba a correr al ocultarse; Android congela la app
// oculta en segundos, así que muchas veces nunca pasaba y la gente seguía con la vieja hasta recargar a mano.
// AHORA la versión nueva se activa SOLA dentro del service worker apenas termina de bajarse (vite.config.ts,
// registerType "autoUpdate"), aunque la app esté cerrada, oculta o congelada: la próxima apertura YA es la nueva.
// Además el celular la busca en segundo plano (sincronización periódica, public/sw-push.js) aunque nadie abra la app.
// Si la app estaba abierta cuando llegó la nueva, la pantalla se refresca SOLO en un momento sin uso: al ocultarse,
// recién abierta o recién vuelta a la app antes del primer toque (parece parte de la apertura). NUNCA con un panel
// abierto, cambios sin guardar o escribiendo. Al recargar se vuelve a la misma pantalla.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  let visibleDesde = Date.now();
  let tocó = false;
  let recargaPendiente = false;
  let ultimaBusqueda = 0;
  let registroSW: ServiceWorkerRegistration | undefined;
  let habiaControlador = !!navigator.serviceWorker.controller;
  const marcarToque = () => { tocó = true; };
  window.addEventListener("pointerdown", marcarToque, { capture: true });
  window.addEventListener("keydown", marcarToque, { capture: true });

  /** Recién abierta (o recién vuelta a la app) y sin tocar todavía: recargar ahí se ve como parte de la apertura. */
  const recienAbierta = () => !tocó && Date.now() - visibleDesde < 6000;
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

  const intentarRecargar = () => {
    if (!recargaPendiente || !momentoBueno() || recargoHacePoco()) return;
    try { sessionStorage.setItem("act-recarga", String(Date.now())); } catch { /* nada */ }
    recargaPendiente = false;
    location.reload();
  };
  /** La versión nueva ya manda en el celular: esta pantalla abierta es la vieja → refrescarla en cuanto se pueda. */
  const llegoVersionNueva = () => {
    recargaPendiente = true;
    intentarRecargar();
  };

  const buscar = (minimo: number) => {
    if (!registroSW || !navigator.onLine || Date.now() - ultimaBusqueda < minimo) return;
    ultimaBusqueda = Date.now();
    registroSW.update().catch(() => {});
  };

  registerSW({
    immediate: true,
    onNeedReload: llegoVersionNueva,
    onRegisteredSW(_url, registro) {
      registroSW = registro;
      ultimaBusqueda = Date.now(); // el registro recién hecho ya buscó
      setInterval(() => { if (document.visibilityState === "visible") buscar(4 * 60 * 1000); }, 5 * 60 * 1000);
      // Búsqueda en segundo plano aunque la app esté cerrada (Chrome/Android con la app instalada; sin aviso al usuario).
      // Si el celular no lo permite, no pasa nada: igual se actualiza al abrir.
      (async () => {
        try {
          const ps = (registro as ServiceWorkerRegistration & { periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void> } }).periodicSync;
          if (!ps) return;
          const permiso = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
          if (permiso.state === "granted") await ps.register("buscar-version", { minInterval: 6 * 60 * 60 * 1000 });
        } catch { /* sin soporte */ }
      })();
    },
  });
  // Respaldo: si el cambio de versión llega sin el aviso de arriba (p. ej. mientras la app estaba congelada).
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!habiaControlador) { habiaControlador = true; return; } // primera instalación: no es una versión nueva
    llegoVersionNueva();
  });
  // Si la pantalla vieja intenta abrir una parte que ya no existe en el servidor (la versión cambió), recargar.
  window.addEventListener("vite:preloadError", (e) => {
    e.preventDefault();
    if (!recargoHacePoco()) { try { sessionStorage.setItem("act-recarga", String(Date.now())); } catch { /* nada */ } location.reload(); }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      intentarRecargar();
      buscar(60 * 1000); // si hay nueva, el service worker la baja y la activa aunque la app quede congelada
    } else {
      visibleDesde = Date.now(); // volver a la app cuenta como apertura hasta el primer toque
      tocó = false;
      intentarRecargar();
      buscar(30 * 1000);
    }
  });
  window.addEventListener("online", () => buscar(0));
  window.addEventListener("focus", () => intentarRecargar());

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
