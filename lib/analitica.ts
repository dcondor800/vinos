/**
 * Telemetría de la recomendación: qué se sugirió, qué se miró y qué se pidió.
 *
 * Es el activo más valioso que produce la feria — qué buscó la gente contra qué
 * había — y el único que caduca: los informes se pueden construir el mes
 * siguiente, pero lo que no se registra ese día se pierde para siempre.
 *
 * Nada de esto puede estorbar. Los eventos se acumulan en el dispositivo y se
 * suben en lote por detrás; si falla la red se reintentan, y si el navegador se
 * cierra antes, se pierden unos pocos. Preferible eso a que la app se ponga
 * lenta por registrar estadísticas.
 */

import { escribir, leer } from '@/lib/almacen';
import { leerSesion, sincronizarSesion } from '@/lib/sesion';
import { createClient } from '@/lib/supabase/client';

export type Accion = 'sugerido' | 'abierto' | 'agregado' | 'removido';

export interface Evento {
  accion: Accion;
  productoId: string;
  /** Posición en la lista de sugerencias, empezando en 1. */
  posicion?: number;
  score?: number;
}

const clavePendientes = (slug: string) => `vinos:analitica:${slug}`;
/** Marca de qué versión del perfil ya se registró, para no duplicar la lista. */
const claveRegistrada = (slug: string) => `vinos:analitica-perfil:${slug}`;

/**
 * Tope de la cola. Si alguien pasa la feria entera sin señal, se quedan los
 * eventos más recientes en vez de crecer sin límite en su teléfono.
 */
const MAX_PENDIENTES = 500;

function validar(dato: unknown): Evento[] | null {
  return Array.isArray(dato)
    ? (dato.filter(
        (e) => e && typeof e.accion === 'string' && typeof e.productoId === 'string',
      ) as Evento[])
    : null;
}

const pendientes = (slug: string): Evento[] => leer(clavePendientes(slug), validar) ?? [];

export function encolar(slug: string, eventos: Evento[]): void {
  if (eventos.length === 0) return;

  const cola = [...pendientes(slug), ...eventos];
  escribir(clavePendientes(slug), cola.slice(-MAX_PENDIENTES));
}

/** Un solo evento, para los toques sueltos: abrir una ficha, agregar una botella. */
export function registrar(slug: string, accion: Accion, productoId: string): void {
  encolar(slug, [{ accion, productoId }]);
}

/**
 * La lista de sugerencias completa, con posición y score. Es la fila que de
 * verdad importa: permite comparar lo que el motor propuso con lo que la
 * persona acabó eligiendo.
 *
 * Se registra una vez por versión del perfil. Sin esto quedaría una copia por
 * cada vez que se abre la pantalla, y el embudo saldría deformado.
 */
export function registrarSugerencias(
  slug: string,
  versionPerfil: string,
  sugerencias: { productoId: string; score: number }[],
): void {
  if (leer(claveRegistrada(slug), (d) => (typeof d === 'string' ? d : null)) === versionPerfil) {
    return;
  }

  escribir(claveRegistrada(slug), versionPerfil);
  encolar(
    slug,
    sugerencias.map((s, i) => ({
      accion: 'sugerido' as const,
      productoId: s.productoId,
      posicion: i + 1,
      score: s.score,
    })),
  );
}

/**
 * Sube la cola. Hay FK a `sesiones`, así que la sesión va primero, igual que
 * con el perfil y el pedido.
 */
export async function sincronizarAnalitica(slug: string): Promise<void> {
  const cola = pendientes(slug);
  if (cola.length === 0) return;

  await sincronizarSesion(slug);
  const sesion = leerSesion(slug);
  if (!sesion?.sincronizada) return;

  try {
    const supabase = createClient();
    const { error } = await supabase.from('interacciones').insert(
      cola.map((e) => ({
        evento_id: sesion.eventoId,
        sesion_id: sesion.id,
        producto_id: e.productoId,
        accion: e.accion,
        posicion: e.posicion ?? null,
        score: e.score ?? null,
      })),
    );

    if (error) return; // se reintenta en la próxima pasada

    // Solo se quita lo que se subió: puede haberse encolado algo entretanto.
    const ahora = pendientes(slug);
    escribir(clavePendientes(slug), ahora.slice(cola.length));
  } catch {
    // Sin red. La cola espera.
  }
}
