import 'server-only';

/**
 * Cliente con service_role: se salta RLS por completo. Solo para el importador
 * de catálogo y la lectura de pedidos desde el servidor.
 *
 * El import de "server-only" hace que el build falle si este módulo llega a un
 * bundle de cliente, en vez de filtrar la clave en producción.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { claveServicio, urlSupabase } from './env';

export function createAdminClient() {
  return createSupabaseClient(urlSupabase(), claveServicio(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
