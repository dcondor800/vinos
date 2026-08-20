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

export const BUCKET_CATALOGO = 'catalogo';

/**
 * Nombre de archivo convertido en clave de almacenamiento. La bodega puede
 * mandar "Reserva Cabernet Añejo.JPG" y hay que guardarlo con un nombre que
 * viaje bien en una URL. La conversión tiene que ser la misma al subir y al
 * resolver, o el vino se queda sin foto.
 */
export function claveDeFoto(slug: string, nombreArchivo: string): string {
  const limpio = nombreArchivo
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug}/${limpio}`;
}

/** URL pública de una foto ya subida. Se deriva, no se recibe del cliente. */
export function urlPublicaDeFoto(slug: string, nombreArchivo: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;

  return `${base}/storage/v1/object/public/${BUCKET_CATALOGO}/${claveDeFoto(slug, nombreArchivo)}`;
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
