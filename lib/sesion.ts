/**
 * Sesión anónima del asistente. No hay login: la identidad es un UUID en
 * localStorage, por evento. La fila en `sesiones` es telemetría, no una
 * dependencia: si Supabase no responde, la sesión existe igual y se sincroniza
 * después. En el pico del evento el WiFi va a fallar y la persona no puede
 * quedarse mirando un spinner en la primera pantalla.
 */

import { escribir, instantanea, leer } from '@/lib/almacen';
import { createClient } from '@/lib/supabase/client';

export interface SesionLocal {
  id: string;
  eventoId: string;
  edadConfirmada: boolean;
  /** Lo escribe el quiz al guardar el perfil. Decide adónde va la entrada. */
  perfilId: string | null;
  /** false mientras la fila no exista en Supabase. */
  sincronizada: boolean;
  creadaEn: string;
}

export const claveSesion = (slug: string) => `vinos:sesion:${slug}`;

/**
 * `crypto.randomUUID` solo existe en contexto seguro. En el evento la app corre
 * bajo https, pero en pruebas por IP de red local no, y ahí esto salva el día.
 */
export function uuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function validar(dato: unknown): SesionLocal | null {
  const s = dato as Partial<SesionLocal> | null;
  if (!s || typeof s.id !== 'string' || typeof s.eventoId !== 'string') return null;

  return {
    id: s.id,
    eventoId: s.eventoId,
    edadConfirmada: s.edadConfirmada === true,
    perfilId: typeof s.perfilId === 'string' ? s.perfilId : null,
    sincronizada: s.sincronizada === true,
    creadaEn: typeof s.creadaEn === 'string' ? s.creadaEn : new Date().toISOString(),
  };
}

export function leerSesion(slug: string): SesionLocal | null {
  return leer(claveSesion(slug), validar);
}

export function instantaneaSesion(slug: string): SesionLocal | null {
  return instantanea(claveSesion(slug), validar);
}

export function guardarSesion(slug: string, sesion: SesionLocal): SesionLocal {
  escribir(claveSesion(slug), sesion);
  return sesion;
}

/** Inserta la fila. La sesión sigue siendo válida aunque esto falle. */
async function insertarEnSupabase(sesion: SesionLocal): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('sesiones').insert({
      // El id se genera aquí porque RLS no deja leer de vuelta la fila insertada.
      id: sesion.id,
      evento_id: sesion.eventoId,
      edad_confirmada: sesion.edadConfirmada,
      user_agent: navigator.userAgent,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Gate de edad. Crea la sesión si no existe y la marca como confirmada.
 * Resuelve apenas queda escrita en local; la red va por detrás.
 */
export async function confirmarEdad(slug: string, eventoId: string): Promise<SesionLocal> {
  const previa = leerSesion(slug);

  const sesion: SesionLocal = previa
    ? { ...previa, edadConfirmada: true }
    : {
        id: uuid(),
        eventoId,
        edadConfirmada: true,
        perfilId: null,
        sincronizada: false,
        creadaEn: new Date().toISOString(),
      };

  guardarSesion(slug, sesion);

  if (!sesion.sincronizada) void sincronizarSesion(slug);

  return sesion;
}

/** Reintento de la fila pendiente. Se llama al entrar y al volver la red. */
export async function sincronizarSesion(slug: string): Promise<void> {
  const sesion = leerSesion(slug);
  if (!sesion || sesion.sincronizada) return;

  if (await insertarEnSupabase(sesion)) {
    const actual = leerSesion(slug);
    if (actual) guardarSesion(slug, { ...actual, sincronizada: true });
  }
}

/** Adónde mandar a alguien que ya pasó el gate. */
export function rutaSiguiente(slug: string, sesion: SesionLocal): string {
  return sesion.perfilId ? `/${slug}/resultados` : `/${slug}/quiz`;
}
