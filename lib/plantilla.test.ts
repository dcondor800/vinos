import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aNumero, validarCsv } from '@/lib/importacion';

/**
 * La plantilla que se le manda a las bodegas es un archivo aparte del código
 * que la genera, así que puede quedar desfasada sin que nada avise. Esto la
 * pasa por el mismo validador que usará el importador.
 */
describe('la plantilla que se envía a las bodegas', () => {
  const csv = readFileSync('docs/plantilla-catalogo.csv', 'utf8');
  const r = validarCsv(csv);

  it('no le falta ninguna columna obligatoria', () => {
    expect(r.faltantes).toEqual([]);
  });

  it('no trae columnas que el importador no reconozca', () => {
    expect(r.ignoradas).toEqual([]);
  });

  it('su fila de ejemplo pasa la validación entera', () => {
    expect(r.problemas).toEqual([]);
    expect(r.filas).toHaveLength(1);
  });

  it('el ejemplo de foto es un nombre de archivo, no una dirección web', () => {
    // Se comprueba la forma y no el nombre exacto: la plantilla se edita para
    // probar con vinos reales y eso no debería romper la prueba.
    expect(r.filas[0].foto).toMatch(/^[^/\\]+\.(jpg|jpeg|png|webp)$/i);
  });
});

describe('aNumero', () => {
  it('lee decimales con punto y con coma', () => {
    expect(aNumero('89.50')).toBe(89.5);
    expect(aNumero('89,50')).toBe(89.5);
    expect(aNumero('120')).toBe(120);
    expect(aNumero('13,5')).toBe(13.5);
  });

  it('entiende el separador de miles', () => {
    // Antes daban 1.25: un vino de mil doscientos cincuenta entraba costando
    // uno veinticinco, sin error y viéndose bien en el catálogo.
    expect(aNumero('1.250')).toBe(1250);
    expect(aNumero('1,250')).toBe(1250);
    expect(aNumero('1.250.000')).toBe(1250000);
  });

  it('resuelve los dos separadores juntos por el último', () => {
    expect(aNumero('1.250,50')).toBe(1250.5);
    expect(aNumero('1,250.50')).toBe(1250.5);
  });

  it('rechaza lo que no es un número', () => {
    expect(aNumero('S/ 120')).toBeNull();
    expect(aNumero('gratis')).toBeNull();
    expect(aNumero('')).toBeNull();
  });
});

describe('precios reales dentro del CSV', () => {
  const E = 'bodega;stand;nombre;tipo;precio';
  const precio = (v: string) => validarCsv(`${E}\nA;A-1;Malbec;tinto;${v}`).filas[0]?.precio;

  it('carga un precio de cuatro cifras con punto de miles', () => {
    expect(precio('1.250')).toBe(1250);
  });

  it('sigue leyendo bien los precios normales', () => {
    expect(precio('89,50')).toBe(89.5);
    expect(precio('120')).toBe(120);
  });

  it('bloquea el precio con símbolo de moneda en vez de adivinarlo', () => {
    const r = validarCsv(`${E}\nA;A-1;Malbec;tinto;S/ 120`);
    expect(r.filas).toEqual([]);
    expect(r.problemas[0]).toMatchObject({ columna: 'precio' });
  });
});
