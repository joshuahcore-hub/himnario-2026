// (1.26.0, Josué) Colores por tempo en la minuta: encendido salvo que se apague en Ajustes (se guarda en este equipo).
const CLAVE = 'minuta_colores_tempo';

export function colorTempoActivo(): boolean {
  try { return localStorage.getItem(CLAVE) !== '0'; } catch { return true; }
}

export function fijarColorTempo(activo: boolean) {
  try { localStorage.setItem(CLAVE, activo ? '1' : '0'); } catch { /* sin almacenamiento: queda como estaba */ }
}
