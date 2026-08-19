/**
 * Perfil de gustos que sale del quiz. Vive en localStorage porque resultados lo
 * necesita para puntuar el catálogo sin red; la fila en `perfiles` es
 * telemetría diferida, igual que la de `sesiones`.
 */

import { escribir, instantanea, leer } from '@/lib/almacen';
import type { Perfil, TipoVino } from '@/lib/recomendacion';
import { leerSesion, guardarSesion, sincronizarSesion, uuid, type SesionLocal } from '@/lib/sesion';
import { createClient } from '@/lib/supabase/client';

export interface PerfilGuardado {
  id: string;
  perfil: Perfil;
  creadoEn: string;
  sincronizado: boolean;
}

const clavePerfil = (slug: string) => `vinos:perfil:${slug}`;

const TIPOS: TipoVino[] = ['tinto', 'blanco', 'rosado', 'espumante', 'dulce', 'otro'];

function enEscala(v: unknown): number | null {
  return typeof v === 'number' && v >= 1 && v <= 5 ? Math.round(v) : null;
}

function validar(dato: unknown): PerfilGuardado | null {
  const g = dato as Partial<PerfilGuardado> | null;
  const p = g?.perfil as Partial<Perfil> | undefined;
  if (!g || typeof g.id !== 'string' || !p) return null;

  const dulzor = enEscala(p.dulzor);
  const cuerpo = enEscala(p.cuerpo);
  if (dulzor === null || cuerpo === null) return null;

  return {
    id: g.id,
    creadoEn: typeof g.creadoEn === 'string' ? g.creadoEn : new Date().toISOString(),
    sincronizado: g.sincronizado === true,
    perfil: {
      tipos: Array.isArray(p.tipos) ? p.tipos.filter((t): t is TipoVino => TIPOS.includes(t)) : [],
      dulzor,
      cuerpo,
      maridajes: Array.isArray(p.maridajes) ? p.maridajes.filter((m) => typeof m === 'string') : [],
      precioMax: typeof p.precioMax === 'number' ? p.precioMax : null,
    },
  };
}

export function leerPerfil(slug: string): PerfilGuardado | null {
  return leer(clavePerfil(slug), validar);
}

export function instantaneaPerfil(slug: string): PerfilGuardado | null {
  return instantanea(clavePerfil(slug), validar);
}

async function insertarEnSupabase(
  guardado: PerfilGuardado,
  sesion: SesionLocal,
): Promise<boolean> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('perfiles').insert({
      id: guardado.id,
      evento_id: sesion.eventoId,
      sesion_id: sesion.id,
      respuestas: guardado.perfil,
    });
    return !error;
  } catch {
    return false;
  }
}

/**
 * Guarda el perfil y lo enlaza a la sesión. Devuelve apenas está en local: la
 * persona pasa a resultados sin esperar a la red.
 */
export function guardarPerfil(slug: string, perfil: Perfil): PerfilGuardado {
  const previo = leerPerfil(slug);

  const guardado: PerfilGuardado = {
    // Se reusa el id anterior si rehace el quiz: un perfil por sesión.
    id: previo?.id ?? uuid(),
    perfil,
    creadoEn: new Date().toISOString(),
    sincronizado: false,
  };

  escribir(clavePerfil(slug), guardado);

  const sesion = leerSesion(slug);
  if (sesion && sesion.perfilId !== guardado.id) {
    guardarSesion(slug, { ...sesion, perfilId: guardado.id });
  }

  void sincronizarPerfil(slug);

  return guardado;
}

/**
 * Reintento de la fila pendiente. `perfiles.sesion_id` tiene FK a `sesiones`,
 * así que la sesión tiene que estar arriba primero o el insert rebota.
 */
export async function sincronizarPerfil(slug: string): Promise<void> {
  const guardado = leerPerfil(slug);
  if (!guardado || guardado.sincronizado) return;

  await sincronizarSesion(slug);

  const sesion = leerSesion(slug);
  if (!sesion?.sincronizada) return;

  if (await insertarEnSupabase(guardado, sesion)) {
    const actual = leerPerfil(slug);
    if (actual) escribir(clavePerfil(slug), { ...actual, sincronizado: true });
  }
}
