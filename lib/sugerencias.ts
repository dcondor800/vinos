/**
 * Selección de lo que se muestra en la pantalla de resultados. Va aparte del
 * motor porque no es scoring: es la política de qué merece llamarse
 * "sugerencia". El motor puntúa todo el catálogo y nunca filtra.
 */

import { recomendar, type Perfil, type Producto, type Sugerencia } from '@/lib/recomendacion';

/**
 * Score mínimo para considerar que un vino de verdad encaja. Sin este corte,
 * "sugerencias" y "catálogo completo" serían la misma lista en distinto orden.
 * Número puesto a ojo: hay que calibrarlo con catálogo real.
 */
export const UMBRAL_RELEVANCIA = 55;

export const MAXIMO_SUGERENCIAS = 12;

/** Por debajo de esto la lista se siente vacía y conviene relajar el criterio. */
const MINIMO_ACEPTABLE = 4;

export interface Seleccion {
  lista: Sugerencia[];
  /** true cuando se bajó el criterio por falta de encajes reales. */
  ampliada: boolean;
}

export function seleccionarSugerencias(
  catalogo: Producto[],
  perfil: Perfil,
  opciones: { umbral?: number; limite?: number } = {},
): Seleccion {
  const { umbral = UMBRAL_RELEVANCIA, limite = MAXIMO_SUGERENCIAS } = opciones;

  const todas = recomendar(catalogo, perfil, { limite });
  const relevantes = todas.filter((s) => s.score >= umbral);

  // Menos de 4 encajes reales: se muestra lo mejor que haya y se avisa.
  const ampliada = relevantes.length < MINIMO_ACEPTABLE && todas.length > relevantes.length;

  return { lista: ampliada ? todas : relevantes, ampliada };
}
