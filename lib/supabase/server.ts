/**
 * Cliente para Server Components, Route Handlers y Server Actions. Clave
 * anónima: mismos permisos que el navegador. Para leer pedidos o escribir
 * catálogo usa el cliente de admin.ts.
 */

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { claveAnon, urlSupabase } from './env';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(urlSupabase(), claveAnon(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Un Server Component no puede escribir cookies. Se ignora: la app no
          // usa Supabase Auth, la sesión del asistente vive en localStorage.
        }
      },
    },
  });
}
