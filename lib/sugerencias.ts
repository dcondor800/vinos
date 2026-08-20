/**
 * Selección de lo que se muestra en la pantalla de resultados. Va aparte del
 * motor porque no es scoring: es la política de qué merece llamarse
 * "sugerencia". El motor puntúa todo el catálogo y nunca filtra.
 */

import {
  recomendar,
  type Perfil,
  type Producto,
  type Sugerencia,
} from '@/lib/recomendacion';

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

/**
 * Se le pide al motor mucho más de lo que se va a mostrar para que el corte lo
 * ponga el tope por bodega y no el límite de la lista. Si se pidieran 12 y las
 * 12 quedaran fuera de presupuesto, filtrar después dejaría la lista vacía
 * teniendo el catálogo opciones más baratas más abajo.
 */
const CANDIDATOS = 200;

export function seleccionarSugerencias(
  catalogo: Producto[],
  perfil: Perfil,
  opciones: { umbral?: number; limite?: number } = {},
): Seleccion {
  const { umbral = UMBRAL_RELEVANCIA, limite = MAXIMO_SUGERENCIAS } = opciones;

  const todas = recomendar(catalogo, perfil, { limite: CANDIDATOS });

  /**
   * El presupuesto se trata como filtro, no como puntaje. Con catálogo real el
   * peso de 10 puntos no alcanzaba: quien pedía "hasta S/100" recibía una lista
   * casi entera por encima de S/100, porque un vino caro que encaja en todo lo
   * demás le gana a uno barato que encaja casi igual. Pedir un presupuesto y
   * que no se respete es la forma más rápida de perder la confianza.
   */
  const enPresupuesto = (s: Sugerencia) =>
    perfil.precioMax == null || s.producto.precio <= perfil.precioMax;

  const relevantes = todas.filter((s) => s.score >= umbral && enPresupuesto(s));

  if (relevantes.length >= MINIMO_ACEPTABLE) {
    return { lista: relevantes.slice(0, limite), ampliada: false };
  }

  // Menos de 4 encajes reales: se afloja el criterio y se avisa.
  return {
    lista: todas.slice(0, limite),
    ampliada: todas.length > relevantes.length,
  };
}
