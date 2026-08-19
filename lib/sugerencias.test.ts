import { describe, expect, it } from 'vitest';
import type { Perfil, Producto } from '@/lib/recomendacion';
import { seleccionarSugerencias, UMBRAL_RELEVANCIA } from '@/lib/sugerencias';

function vino(over: Partial<Producto> & { id: string }): Producto {
  return {
    nombre: `Vino ${over.id}`,
    expositor_id: `bodega-${over.id}`,
    tipo: 'tinto',
    precio: 50,
    cuerpo: 3,
    dulzor: 3,
    acidez: null,
    taninos: null,
    maridajes: [],
    disponible: true,
    ...over,
  };
}

/** Encaja con el perfil de abajo: tipo, dulzor, cuerpo, maridaje y precio. */
const encaja = (id: string) =>
  vino({ id, tipo: 'tinto', dulzor: 2, cuerpo: 4, maridajes: ['carnes rojas'], precio: 80 });

/** Falla en todo lo que se puede fallar. */
const noEncaja = (id: string) =>
  vino({ id, tipo: 'blanco', dulzor: 5, cuerpo: 1, maridajes: ['postres'], precio: 400 });

const PERFIL: Perfil = {
  tipos: ['tinto'],
  dulzor: 2,
  cuerpo: 4,
  maridajes: ['carnes rojas'],
  precioMax: 100,
};

describe('seleccionarSugerencias', () => {
  it('deja fuera lo que no llega al umbral', () => {
    const { lista, ampliada } = seleccionarSugerencias(
      [encaja('a'), encaja('b'), encaja('c'), encaja('d'), noEncaja('z')],
      PERFIL,
    );

    expect(lista.map((s) => s.producto.id)).not.toContain('z');
    expect(lista).toHaveLength(4);
    expect(ampliada).toBe(false);
    expect(lista.every((s) => s.score >= UMBRAL_RELEVANCIA)).toBe(true);
  });

  it('amplía la búsqueda cuando hay menos de cuatro encajes reales', () => {
    const { lista, ampliada } = seleccionarSugerencias(
      [encaja('a'), noEncaja('x'), noEncaja('y'), noEncaja('z')],
      PERFIL,
    );

    // Con un solo encaje, mostrar uno solo se ve roto: se enseña todo y se avisa.
    expect(ampliada).toBe(true);
    expect(lista).toHaveLength(4);
  });

  it('no se declara ampliada cuando el catálogo entero ya pasa el umbral', () => {
    const { lista, ampliada } = seleccionarSugerencias([encaja('a'), encaja('b')], PERFIL);

    expect(ampliada).toBe(false);
    expect(lista).toHaveLength(2);
  });

  it('no marca ampliada con el catálogo vacío', () => {
    expect(seleccionarSugerencias([], PERFIL)).toEqual({ lista: [], ampliada: false });
  });

  it('corta en el máximo de sugerencias', () => {
    const catalogo = Array.from({ length: 20 }, (_, n) => encaja(`v${n}`));

    expect(seleccionarSugerencias(catalogo, PERFIL).lista).toHaveLength(12);
  });
});
