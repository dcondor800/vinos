/**
 * Health check del servicio. Responde sin tocar Supabase ni leer variables de
 * entorno a propósito.
 *
 * Antes el chequeo apuntaba a `/`, que consulta los eventos en cada visita. Con
 * eso, un problema de configuración o una caída de Supabase hacía que la ruta
 * devolviera 500, el proveedor sacara la instancia de rotación y el sitio
 * entero respondiera 502 — aunque la app estuviera perfectamente viva y el
 * resto de las pantallas pudieran seguir sirviéndose.
 *
 * Un health check responde una sola pregunta: ¿está el proceso en pie?
 */

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { estado: 'ok', hora: new Date().toISOString() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
