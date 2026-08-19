/**
 * Lectura de variables de entorno con error explícito. Sin esto, una variable
 * faltante se manifiesta como un 401 opaco de Supabase en medio del evento.
 */

function requerida(nombre: string, valor: string | undefined): string {
  if (!valor) {
    throw new Error(
      `Falta la variable de entorno ${nombre}. Copia .env.example a .env.local y complétala.`,
    );
  }
  return valor;
}

export function urlSupabase(): string {
  return requerida('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function claveAnon(): string {
  return requerida('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function claveServicio(): string {
  return requerida('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function claveImportador(): string {
  return requerida('ADMIN_IMPORT_KEY', process.env.ADMIN_IMPORT_KEY);
}
