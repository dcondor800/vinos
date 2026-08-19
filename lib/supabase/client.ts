/**
 * Cliente para componentes con "use client". Usa la clave anónima, así que solo
 * ve lo que las políticas RLS permiten: catálogo de eventos activos e inserts
 * de sesión, perfil, pedido e interacciones.
 */

import { createBrowserClient } from '@supabase/ssr';
import { claveAnon, urlSupabase } from './env';

export function createClient() {
  return createBrowserClient(urlSupabase(), claveAnon());
}
