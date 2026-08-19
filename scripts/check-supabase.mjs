/**
 * Verifica que las credenciales de .env.local funcionen de verdad:
 * la clave anónima lee el catálogo, la de servicio se salta RLS.
 *
 *   npm run check:supabase
 */

import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';

nextEnv.loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const importKey = process.env.ADMIN_IMPORT_KEY;

const faltantes = [
  ['NEXT_PUBLIC_SUPABASE_URL', url],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', anon],
  ['SUPABASE_SERVICE_ROLE_KEY', service],
  ['ADMIN_IMPORT_KEY', importKey],
]
  .filter(([, valor]) => !valor || valor.includes('xxxxx'))
  .map(([nombre]) => nombre);

if (faltantes.length > 0) {
  console.error('Sin completar en .env.local:\n  ' + faltantes.join('\n  '));
  process.exit(1);
}

let fallo = false;

// Clave anónima: debe ver los eventos activos.
const publico = createClient(url, anon);
const { data: eventos, error: errorEventos } = await publico
  .from('eventos')
  .select('slug, nombre, activo');

if (errorEventos) {
  console.error('anon key: ' + errorEventos.message);
  fallo = true;
} else {
  console.log(`anon key OK — ${eventos.length} evento(s): ${eventos.map((e) => e.slug).join(', ') || '(ninguno)'}`);
}

const { count, error: errorProductos } = await publico
  .from('productos')
  .select('*', { count: 'exact', head: true });

if (errorProductos) {
  console.error('productos: ' + errorProductos.message);
  fallo = true;
} else {
  console.log(`catálogo OK — ${count} producto(s) visibles con RLS`);
}

// Service role: debe leer una tabla sin política de select.
const admin = createClient(url, service, { auth: { persistSession: false } });
const { error: errorPedidos } = await admin.from('pedidos').select('id').limit(1);

if (errorPedidos) {
  console.error('service role: ' + errorPedidos.message);
  fallo = true;
} else {
  console.log('service role OK — lee pedidos saltándose RLS');
}

process.exit(fallo ? 1 : 0);
