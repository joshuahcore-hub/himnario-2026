// Paso de una página a otra al deslizar (himno abierto y lector de minutas), amortiguado como el carrusel de
// minutas: arranca rápido y se frena suave al llegar, en vez de llegar y "chocar" (antes 250 ms ease-out).
export const DURACION_DESLIZAR = 420;
export const CURVA_DESLIZAR = 'cubic-bezier(0.22, 1, 0.36, 1)';
