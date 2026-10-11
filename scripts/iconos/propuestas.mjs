// Propuestas de ícono (SVG 512x512): fondo blanco, solo trazo celeste, centro blanco.
// Elegida la libreta anillada (10-10-2026); aquí están sus variantes.
export const CELESTE = '#4AA8E8';
const trazo = (ancho = 22) =>
  `fill="none" stroke="${CELESTE}" stroke-width="${ancho}" stroke-linecap="round" stroke-linejoin="round"`;

const nota = (x, y, s = 1, ancho = 22) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <ellipse cx="0" cy="0" rx="26" ry="19" transform="rotate(-22)" ${trazo(ancho / s)}/>
    <path d="M24 -8 V -120 Q 62 -104 70 -68" ${trazo(ancho / s)}/>
  </g>`;

// Libreta base: tapa + anillos a la izquierda.
const libreta = `
  <rect x="160" y="104" width="220" height="304" rx="26" ${trazo()}/>
  ${[150, 196, 242, 288, 334].map(y => `<path d="M138 ${y} H182" ${trazo()}/>`).join('')}`;

export const propuestas = {
  // 1: limpia, solo la libreta
  '1': libreta,
  // 2: renglones de texto (como hojas escritas)
  '2': `${libreta}
    ${[190, 240, 290, 340].map((y, i) => `<path d="M216 ${y} H ${i === 3 ? 296 : 340}" ${trazo(18)}/>`).join('')}`,
  // 3: etiqueta de título en la tapa (como un himnario de verdad)
  '3': `${libreta}
    <rect x="214" y="168" width="128" height="66" rx="14" ${trazo(18)}/>`,
  // 4: nota musical pequeña arriba y renglones abajo (como una página de himno)
  '4': `${libreta}
    ${nota(262, 236, 0.62, 18)}
    <path d="M216 294 H 340 M 216 340 H 300" ${trazo(18)}/>`,
  // 5: cruz pequeña centrada
  '5': `${libreta}
    <path d="M272 186 V 318 M 236 228 H 308" ${trazo(20)}/>`,
  // 6: etiqueta de título + renglones (tapa de himnario clásica)
  '6': `${libreta}
    <rect x="214" y="160" width="128" height="58" rx="13" ${trazo(18)}/>
    <path d="M216 282 H 340 M 216 330 H 300" ${trazo(18)}/>`,
};

/** Ícono completo. `margen` encoge el dibujo hacia el centro (para la zona segura de Android).
 *  `dx` corre todo el dibujo en horizontal (unidades de 512; negativo = a la izquierda). */
export function svgIcono(dibujo, { margen = 0, fondo = '#FFFFFF', dx = 0 } = {}) {
  const s = 1 - margen * 2;
  const t = 256 * (1 - s);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="${fondo}"/>
  <g transform="translate(${t + dx * s} ${t}) scale(${s})">${dibujo}</g>
</svg>`;
}
