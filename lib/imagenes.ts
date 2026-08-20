/**
 * `next/image` lanza una excepción cuando el host de una imagen no está en
 * `remotePatterns`. Como las fotos se pintan dentro del map de las tarjetas,
 * una sola fila con un enlace ajeno tumbaba la pantalla de resultados entera.
 *
 * Las bodegas mandan enlaces a sus propias webs, así que esto no es hipotético:
 * pasa en cuanto se importa el primer catálogo con fotos.
 */

/** Mismo host que autoriza next.config.ts. */
function hostPermitido(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;

  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

export function imagenPermitida(src: string | null | undefined): src is string {
  if (!src) return false;

  try {
    const { protocol, hostname } = new URL(src);
    return protocol === 'https:' && hostname === hostPermitido();
  } catch {
    // Ruta relativa dentro de /public.
    return src.startsWith('/');
  }
}
