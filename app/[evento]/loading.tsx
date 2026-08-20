import { Esqueleto } from "./esqueleto";

/**
 * Cubre todas las rutas del evento. Cada pantalla lee de Supabase en el
 * servidor, así que con la señal del salón hay una espera real entre toque y
 * contenido; sin esto el navegador se queda mostrando la pantalla anterior y
 * parece que el toque no registró.
 */
export default function Cargando() {
  return <Esqueleto />;
}
