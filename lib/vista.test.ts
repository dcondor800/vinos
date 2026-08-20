import { describe, expect, it } from 'vitest';
import { filtrar, VISTA_INICIAL, type Filtrable, type Vista } from '@/lib/vista';

const vino = (over: Partial<Filtrable> & { nombre: string }): Filtrable => ({
  bodega: 'Bodega Valle Norte',
  varietal: null,
  tipo: 'tinto',
  zona: 'Chile',
  ...over,
});

const vista = (over: Partial<Vista> = {}): Vista => ({ ...VISTA_INICIAL, ...over });

const CATALOGO: Filtrable[] = [
  vino({ nombre: 'Reserva Cabernet Sauvignon', varietal: 'Cabernet Sauvignon' }),
  vino({ nombre: 'Sauvignon Blanc Costero', tipo: 'blanco', varietal: 'Sauvignon Blanc' }),
  vino({ nombre: 'Malbec de Altura', bodega: 'Viñedos del Sur', zona: 'Argentina' }),
  vino({ nombre: 'Espumante Brut Nature', tipo: 'espumante', bodega: 'Casa Ica', zona: 'Perú' }),
];

const nombres = (r: Filtrable[]) => r.map((p) => p.nombre);

describe('filtrar', () => {
  it('sin filtros devuelve el catálogo entero', () => {
    expect(filtrar(CATALOGO, vista())).toHaveLength(4);
  });

  it('busca por nombre del vino', () => {
    expect(nombres(filtrar(CATALOGO, vista({ busqueda: 'malbec' })))).toEqual([
      'Malbec de Altura',
    ]);
  });

  it('busca por bodega, que es como mucha gente nombra el vino', () => {
    expect(nombres(filtrar(CATALOGO, vista({ busqueda: 'casa ica' })))).toEqual([
      'Espumante Brut Nature',
    ]);
  });

  it('busca por cepa aunque no esté en el nombre', () => {
    const r = filtrar(CATALOGO, vista({ busqueda: 'cabernet' }));
    expect(nombres(r)).toEqual(['Reserva Cabernet Sauvignon']);
  });

  it('ignora tildes y mayúsculas', () => {
    // Nadie escribe la tilde de "Perú" en el buscador de un teléfono.
    expect(filtrar(CATALOGO, vista({ busqueda: 'VIÑEDOS' }))).toHaveLength(1);
    expect(filtrar(CATALOGO, vista({ busqueda: 'vinedos' }))).toHaveLength(1);
  });

  it('ignora los espacios sobrantes', () => {
    expect(filtrar(CATALOGO, vista({ busqueda: '   ' }))).toHaveLength(4);
  });

  it('filtra por tipo', () => {
    expect(nombres(filtrar(CATALOGO, vista({ tipo: 'blanco' })))).toEqual([
      'Sauvignon Blanc Costero',
    ]);
  });

  it('filtra por zona', () => {
    expect(filtrar(CATALOGO, vista({ zona: 'Chile' }))).toHaveLength(2);
  });

  it('combina búsqueda y filtros', () => {
    expect(filtrar(CATALOGO, vista({ busqueda: 'sauvignon', tipo: 'tinto' }))).toHaveLength(1);
    expect(filtrar(CATALOGO, vista({ busqueda: 'sauvignon', zona: 'Argentina' }))).toEqual([]);
  });
});
