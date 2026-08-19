/**
 * Acceso al evento. Todo lo demás de la app cuelga de aquí: el slug de la URL
 * resuelve un evento_id, y ese id filtra cada query del resto del dominio.
 */

import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

export interface Evento {
  id: string;
  slug: string;
  nombre: string;
  cliente: string | null;
  sede: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  logo_url: string | null;
  color_primario: string;
  moneda: string;
}

const CAMPOS =
  'id, slug, nombre, cliente, sede, fecha_inicio, fecha_fin, logo_url, color_primario, moneda';

/**
 * Eventos activos. Solo lo usa la raíz del sitio para saber adónde mandar a
 * quien llega sin escanear el QR; el resto de la app entra siempre por slug.
 */
export const listarEventos = cache(async (): Promise<Evento[]> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('eventos')
    .select(CAMPOS)
    .order('fecha_inicio', { ascending: true });

  if (error) {
    throw new Error(`No se pudieron leer los eventos: ${error.message}`);
  }

  return (data ?? []) as Evento[];
});

/**
 * Devuelve null si el evento no existe o no está activo. La política RLS
 * `lectura_eventos` ya filtra los inactivos, así que no hace falta repetirlo.
 *
 * `cache` lo memoiza por request: el layout y la página del evento lo piden
 * los dos y la consulta sale una sola vez.
 */
export const obtenerEvento = cache(async (slug: string): Promise<Evento | null> => {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('eventos')
    .select(CAMPOS)
    .eq('slug', slug)
    .maybeSingle<Evento>();

  if (error) {
    throw new Error(`No se pudo leer el evento "${slug}": ${error.message}`);
  }

  return data;
});
