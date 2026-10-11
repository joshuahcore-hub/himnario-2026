// Permite que una pantalla con cambios sin guardar (el editor de minutas) intercepte la salida
// cuando se toca otra pestaña de abajo. La pantalla registra una guardia; las pestañas llaman a intentarSalir.
type Guardia = (continuar: () => void) => boolean; // true = la pantalla se encarga (muestra la pregunta)

let guardia: Guardia | null = null;

export function setGuardiaSalida(g: Guardia | null) {
  guardia = g;
}

/** Ejecuta `continuar` salvo que la pantalla actual tenga cambios sin guardar (entonces pregunta primero). */
export function intentarSalir(continuar: () => void) {
  if (guardia && guardia(continuar)) return;
  continuar();
}
