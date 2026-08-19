/**
 * Catálogo del evento. Se lee entero de una vez: son cientos de filas, no
 * miles, y bajarlo completo es lo que permite puntuar y filtrar en el cliente
 * sin volver a la red. El cacheo en el dispositivo lo hace `cachearCatalogo`.
 */

import { cache } from 'react';
import type { Producto } from '@/lib/recomendacion';
import { createClient } from '@/lib/supabase/server';

/** Producto con lo que necesitan la tarjeta y la ficha, ya aplanado. */
export interface ProductoCatalogo extends Producto {
  varietal: string | null;
  pais: string | null;
  region: string | null;
  anada: number | null;
  grado_alcohol: number | null;
  notas: string[];
  descripcion: string | null;
  imagen_url: string | null;
  destacado: boolean;
  bodega: string;
  stand: string;
  zona: string | null;
}

/** La forma que devuelve PostgREST con los embeds. */
interface FilaProducto {
  id: string;
  nombre: string;
  expositor_id: string;
  tipo: Producto['tipo'];
  precio: number | string;
  cuerpo: number | null;
  dulzor: number | null;
  acidez: number | null;
  taninos: number | null;
  maridajes: string[] | null;
  notas: string[] | null;
  disponible: boolean | null;
  destacado: boolean | null;
  varietal: string | null;
  pais: string | null;
  region: string | null;
  anada: number | null;
  grado_alcohol: number | string | null;
  descripcion: string | null;
  imagen_url: string | null;
  expositores: { nombre: string } | null;
  stands: { codigo: string; zona: string | null } | null;
}

const CAMPOS = `
  id, nombre, expositor_id, tipo, precio, cuerpo, dulzor, acidez, taninos,
  maridajes, notas, disponible, destacado, varietal, pais, region, anada,
  grado_alcohol, descripcion, imagen_url,
  expositores ( nombre ),
  stands ( codigo, zona )
`;

/** numeric de Postgres llega como string por el JSON. */
const aNumero = (v: number | string | null): number =>
  typeof v === 'number' ? v : v ? Number(v) : 0;

function aplanar(f: FilaProducto): ProductoCatalogo {
  return {
    id: f.id,
    nombre: f.nombre,
    expositor_id: f.expositor_id,
    tipo: f.tipo,
    precio: aNumero(f.precio),
    cuerpo: f.cuerpo,
    dulzor: f.dulzor,
    acidez: f.acidez,
    taninos: f.taninos,
    maridajes: f.maridajes ?? [],
    notas: f.notas ?? [],
    disponible: f.disponible !== false,
    destacado: f.destacado === true,
    varietal: f.varietal,
    pais: f.pais,
    region: f.region,
    anada: f.anada,
    grado_alcohol: f.grado_alcohol == null ? null : aNumero(f.grado_alcohol),
    descripcion: f.descripcion,
    imagen_url: f.imagen_url,
    bodega: f.expositores?.nombre ?? 'Bodega sin nombre',
    stand: f.stands?.codigo ?? '—',
    zona: f.stands?.zona ?? null,
  };
}

export const obtenerCatalogo = cache(async (eventoId: string): Promise<ProductoCatalogo[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('productos')
    .select(CAMPOS)
    .eq('evento_id', eventoId)
    .eq('disponible', true)
    .order('nombre');

  if (error) {
    throw new Error(`No se pudo leer el catálogo: ${error.message}`);
  }

  return (data as unknown as FilaProducto[]).map(aplanar);
});
