/**
 * Cómo está mirando el catálogo esta persona: modo, búsqueda y filtros.
 *
 * Vive en localStorage y no en la URL a propósito. La ruta es dinámica, así que
 * cada cambio de parámetro sería una petición al servidor: filtrar por tipo con
 * la señal del salón daría un parpadeo de carga en cada toque. Aquí el filtrado
 * es instantáneo y además sobrevive a volver desde una ficha, que era el
 * problema original: abrías un vino y al regresar habías perdido el filtro y el
 * modo de vista.
 */

import { escribir, instantanea, leer } from '@/lib/almacen';
import type { TipoVino } from '@/lib/recomendacion';

export interface Vista {
  /** true = todo el catálogo; false = las sugerencias del perfil. */
  todo: boolean;
  busqueda: string;
  tipo: TipoVino | null;
  zona: string | null;
}

export const VISTA_INICIAL: Vista = { todo: false, busqueda: '', tipo: null, zona: null };

const claveVista = (slug: string) => `vinos:vista:${slug}`;

function validar(dato: unknown): Vista | null {
  const v = dato as Partial<Vista> | null;
  if (!v) return null;

  return {
    todo: v.todo === true,
    busqueda: typeof v.busqueda === 'string' ? v.busqueda : '',
    tipo: typeof v.tipo === 'string' ? (v.tipo as TipoVino) : null,
    zona: typeof v.zona === 'string' ? v.zona : null,
  };
}

export function leerVista(slug: string): Vista {
  return leer(claveVista(slug), validar) ?? VISTA_INICIAL;
}

export function instantaneaVista(slug: string): Vista | null {
  return instantanea(claveVista(slug), validar);
}

export function guardarVista(slug: string, cambios: Partial<Vista>): Vista {
  const vista = { ...leerVista(slug), ...cambios };
  escribir(claveVista(slug), vista);
  return vista;
}

/** Sin tildes ni mayúsculas: "cabernet" encuentra "Cabernet Sauvignon". */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export interface Filtrable {
  nombre: string;
  bodega: string;
  varietal: string | null;
  tipo: TipoVino;
  zona: string | null;
}

/** Busca por nombre de vino, bodega y cepa, que es como la gente los nombra. */
export function filtrar<T extends Filtrable>(catalogo: T[], vista: Vista): T[] {
  const termino = normalizar(vista.busqueda.trim());

  return catalogo.filter((p) => {
    if (vista.tipo && p.tipo !== vista.tipo) return false;
    if (vista.zona && p.zona !== vista.zona) return false;
    if (!termino) return true;

    return normalizar(`${p.nombre} ${p.bodega} ${p.varietal ?? ''}`).includes(termino);
  });
}
