// Archivos de la app (/assets/*): si no existen, Cloudflare responde con index.html y código 200, y el
// celular podía guardar esa página en lugar del CSS o JS (la app se veía sin estilos). Aquí se responde 404,
// así la descarga de la versión nueva falla limpio y se reintenta después, en vez de guardar algo roto.
interface Env { ASSETS: { fetch: (r: Request) => Promise<Response> } }

export const onRequest = async ({ request, env }: { request: Request; env: Env }) => {
  const r = await env.ASSETS.fetch(request);
  if ((r.headers.get('content-type') || '').includes('text/html')) return new Response('No encontrado', { status: 404 });
  return r;
};
