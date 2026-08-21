'use server';

import { timingSafeEqual } from 'node:crypto';
import { claveImportador } from '@/lib/supabase/env';
import { obtenerInforme, type Informe } from './datos';

/** Misma clave que el importador. La comprobación va aquí, no en el cliente. */
function claveCorrecta(recibida: string): boolean {
  const esperada = Buffer.from(claveImportador());
  const dada = Buffer.from(recibida);
  return dada.length === esperada.length && timingSafeEqual(dada, esperada);
}

export async function cargarInforme(clave: string, slug: string): Promise<Informe | null> {
  if (!claveCorrecta(clave)) return null;
  return obtenerInforme(slug);
}
