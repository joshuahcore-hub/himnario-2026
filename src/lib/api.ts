// Conexión con la API (/api, Cloudflare Pages Functions).
// Cada celular tiene una llave secreta propia, creada al azar y guardada solo en este dispositivo.
// La persona nunca la ve; el servidor solo guarda su huella (SHA-256).

const LLAVE_KEY = 'himnario_llave_dispositivo';

function crearLlave(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function llaveDispositivo(): string {
  try {
    let llave = localStorage.getItem(LLAVE_KEY);
    if (!llave) {
      llave = crearLlave();
      localStorage.setItem(LLAVE_KEY, llave);
    }
    return llave;
  } catch {
    return crearLlave();
  }
}

export class ErrorDeRed extends Error {}

export async function api<T = any>(ruta: string, opciones: { metodo?: string; datos?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api/${ruta}`, {
      method: opciones.metodo || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${llaveDispositivo()}`,
      },
      body: opciones.datos !== undefined ? JSON.stringify(opciones.datos) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ErrorDeRed('Sin conexión a internet.');
  }
  const datos = await res.json().catch(() => null);
  if (!res.ok) throw new Error(datos?.error || `Error ${res.status}`);
  return datos as T;
}
