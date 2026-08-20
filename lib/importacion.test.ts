import { describe, expect, it } from 'vitest';
import { detectarDelimitador, normalizarEncabezado, parsearCsv } from '@/lib/csv';
import { plantillaCsv, validarCsv } from '@/lib/importacion';

const ENCABEZADO = 'bodega;stand;nombre;tipo;precio';

/** Un CSV mínimo válido con las filas que se le pasen. */
const csv = (...filas: string[]) => [ENCABEZADO, ...filas].join('\n');

describe('parsearCsv', () => {
  it('respeta las comas dentro de comillas', () => {
    const [fila] = parsearCsv('a,"uno, dos",c');
    expect(fila).toEqual(['a', 'uno, dos', 'c']);
  });

  it('entiende las comillas escapadas', () => {
    expect(parsearCsv('a,"dice ""hola""",c')[0]).toEqual(['a', 'dice "hola"', 'c']);
  });

  it('se traga el BOM que mete Excel', () => {
    expect(parsearCsv('﻿bodega;stand')[0]).toEqual(['bodega', 'stand']);
  });

  it('acepta saltos CRLF y descarta las líneas vacías', () => {
    expect(parsearCsv('a;b\r\n1;2\r\n\r\n3;4')).toEqual([
      ['a', 'b'],
      ['1', '2'],
      ['3', '4'],
    ]);
  });

  it('detecta el punto y coma de Excel en español', () => {
    expect(detectarDelimitador('a;b;c')).toBe(';');
    expect(detectarDelimitador('a,b,c')).toBe(',');
    // Una coma dentro de comillas no convierte el archivo en separado por comas.
    expect(detectarDelimitador('a;"uno, dos";c')).toBe(';');
  });

  it('normaliza los encabezados con tildes y espacios', () => {
    expect(normalizarEncabezado(' Añada ')).toBe('anada');
    expect(normalizarEncabezado('Grado Alcohol')).toBe('grado_alcohol');
    expect(normalizarEncabezado('DESCRIPCIÓN')).toBe('descripcion');
  });
});

describe('validarCsv', () => {
  it('avisa qué columnas obligatorias faltan', () => {
    const r = validarCsv('bodega;nombre\nValle Norte;Cabernet');

    expect(r.faltantes).toEqual(['stand', 'tipo', 'precio']);
    expect(r.filas).toEqual([]);
  });

  it('ignora las columnas que no conoce sin tratarlas como error', () => {
    const r = validarCsv(`${ENCABEZADO};stock;proveedor\nValle Norte;A-04;Cabernet;tinto;89;12;Juan`);

    expect(r.ignoradas).toEqual(['stock', 'proveedor']);
    expect(r.problemas).toEqual([]);
    expect(r.filas).toHaveLength(1);
  });

  it('carga una fila completa con los tipos convertidos', () => {
    const r = validarCsv(
      'bodega;stand;zona;nombre;tipo;precio;anada;grado_alcohol;cuerpo;notas;maridajes;destacado\n' +
        'Valle Norte;A-04;Chile;Cabernet;Tinto;89,50;2021;14,5;4;cassis|vainilla;carnes rojas|quesos;si',
    );

    expect(r.problemas).toEqual([]);
    expect(r.filas[0]).toMatchObject({
      bodega: 'Valle Norte',
      stand: 'A-04',
      zona: 'Chile',
      tipo: 'tinto',
      // Excel en español escribe los decimales con coma.
      precio: 89.5,
      grado_alcohol: 14.5,
      anada: 2021,
      cuerpo: 4,
      dulzor: null,
      notas: ['cassis', 'vainilla'],
      maridajes: ['carnes rojas', 'quesos'],
      destacado: true,
      disponible: true,
    });
  });

  it('rechaza un tipo que no existe', () => {
    const r = validarCsv(csv('Valle Norte;A-04;Cabernet;reserva;89'));

    expect(r.filas).toEqual([]);
    expect(r.problemas[0]).toMatchObject({ fila: 2, columna: 'tipo' });
  });

  it('acepta las variantes de tipo que mandan las bodegas', () => {
    const r = validarCsv(
      csv(
        'A;A-1;Uno;ESPUMOSO;50',
        'B;B-1;Dos;Rosé;50',
        'C;C-1;Tres;Champagne;50',
        'D;D-1;Cuatro;postre;50',
      ),
    );

    expect(r.filas.map((f) => f.tipo)).toEqual(['espumante', 'rosado', 'espumante', 'dulce']);
  });

  it('señala el maridaje que el motor no sabría cruzar', () => {
    const r = validarCsv(
      `${ENCABEZADO};maridajes\nValle Norte;A-04;Cabernet;tinto;89;carnes rojas|sushi`,
    );

    expect(r.filas).toEqual([]);
    expect(r.problemas).toHaveLength(1);
    expect(r.problemas[0].mensaje).toContain('sushi');
  });

  it('acepta "solo, para tomar", que lleva una coma dentro del propio valor', () => {
    const r = validarCsv(
      `${ENCABEZADO};maridajes\nValle Norte;A-04;Cabernet;tinto;89;"solo, para tomar"`,
    );

    expect(r.problemas).toEqual([]);
    expect(r.filas[0].maridajes).toEqual(['solo, para tomar']);
  });

  it('lo acepta sin comillas, que es como queda en un archivo separado por ;', () => {
    const r = validarCsv(
      `${ENCABEZADO};maridajes\nValle Norte;A-04;Cabernet;tinto;89;solo, para tomar`,
    );

    expect(r.problemas).toEqual([]);
    expect(r.filas[0].maridajes).toEqual(['solo, para tomar']);
  });

  it('acepta ese valor combinado con otros por barra', () => {
    const r = validarCsv(
      `${ENCABEZADO};maridajes\nValle Norte;A-04;Cabernet;tinto;89;"quesos|solo, para tomar"`,
    );

    expect(r.problemas).toEqual([]);
    expect(r.filas[0].maridajes).toEqual(['quesos', 'solo, para tomar']);
  });

  it('acepta una lista separada por comas, que es como la escribe mucha gente', () => {
    const r = validarCsv(
      `${ENCABEZADO};maridajes\nValle Norte;A-04;Cabernet;tinto;89;"carnes rojas, quesos"`,
    );

    expect(r.problemas).toEqual([]);
    expect(r.filas[0].maridajes).toEqual(['carnes rojas', 'quesos']);
  });

  it('no repite un maridaje que aparece dos veces', () => {
    const r = validarCsv(
      `${ENCABEZADO};maridajes\nValle Norte;A-04;Cabernet;tinto;89;"quesos|Queso"`,
    );

    expect(r.filas[0].maridajes).toEqual(['quesos']);
  });

  it('traduce las variantes conocidas de maridaje', () => {
    const r = validarCsv(
      `${ENCABEZADO};maridajes\nValle Norte;A-04;Cabernet;tinto;89;Carne roja|Pescado|POLLO`,
    );

    expect(r.problemas).toEqual([]);
    expect(r.filas[0].maridajes).toEqual(['carnes rojas', 'pescados y mariscos', 'aves']);
  });

  it('deja pasar las escalas sensoriales vacías, que es el caso normal', () => {
    const r = validarCsv(`${ENCABEZADO};cuerpo;dulzor\nValle Norte;A-04;Cabernet;tinto;89;;`);

    expect(r.problemas).toEqual([]);
    expect(r.filas[0]).toMatchObject({ cuerpo: null, dulzor: null });
  });

  it('rechaza una escala fuera del 1 al 5', () => {
    const r = validarCsv(`${ENCABEZADO};cuerpo\nValle Norte;A-04;Cabernet;tinto;89;8`);

    expect(r.problemas[0]).toMatchObject({ fila: 2, columna: 'cuerpo' });
  });

  it('rechaza un año imposible', () => {
    const r = validarCsv(`${ENCABEZADO};anada\nValle Norte;A-04;Cabernet;tinto;89;20221`);

    expect(r.problemas[0]).toMatchObject({ columna: 'anada' });
  });

  it('detecta el mismo vino repetido para la misma bodega', () => {
    const r = validarCsv(
      csv('Valle Norte;A-04;Cabernet;tinto;89', 'VALLE NORTE;A-04;cabernet;tinto;95'),
    );

    expect(r.problemas[0]).toMatchObject({ fila: 3, columna: 'nombre' });
  });

  it('permite el mismo nombre en bodegas distintas', () => {
    const r = validarCsv(
      csv('Valle Norte;A-04;Malbec;tinto;89', 'Viñedos del Sur;B-11;Malbec;tinto;120'),
    );

    expect(r.problemas).toEqual([]);
    expect(r.filas).toHaveLength(2);
  });

  it('numera las filas como las ve Excel', () => {
    const r = validarCsv(
      csv('Valle Norte;A-04;Uno;tinto;10', 'Valle Norte;A-04;Dos;tinto;20', 'Valle Norte;A-04;;tinto;30'),
    );

    // Encabezado en la 1, así que la tercera fila de datos es la 4.
    expect(r.problemas[0].fila).toBe(4);
  });

  it('acepta el nombre del archivo de la foto', () => {
    const r = validarCsv(`${ENCABEZADO};foto\nValle Norte;A-04;Cabernet;tinto;89;malbec.jpg`);

    expect(r.problemas).toEqual([]);
    expect(r.filas[0].foto).toBe('malbec.jpg');
  });

  it('rechaza una ruta o una URL en la columna de la foto', () => {
    // La bodega manda los archivos sueltos; una ruta de su computadora haría
    // imposible emparejarlos con lo que sube.
    for (const valor of ['C:\\fotos\\malbec.jpg', '/fotos/malbec.jpg', 'https://web.com/m.jpg']) {
      const r = validarCsv(`${ENCABEZADO};foto\nValle Norte;A-04;Cabernet;tinto;89;${valor}`);
      expect(r.problemas[0]?.columna).toBe('foto');
    }
  });

  it('rechaza un archivo sin extensión de imagen', () => {
    const r = validarCsv(`${ENCABEZADO};foto\nValle Norte;A-04;Cabernet;tinto;89;malbec.pdf`);

    expect(r.problemas[0]).toMatchObject({ columna: 'foto' });
  });

  it('la foto puede ir vacía', () => {
    const r = validarCsv(`${ENCABEZADO};foto\nValle Norte;A-04;Cabernet;tinto;89;`);

    expect(r.problemas).toEqual([]);
    expect(r.filas[0].foto).toBeNull();
  });

  it('detecta un stand asignado a dos bodegas distintas', () => {
    const r = validarCsv(
      csv('Valle Norte;A-04;Uno;tinto;50', 'Viñedos del Sur;A-04;Dos;tinto;60'),
    );

    expect(r.filas).toEqual([]);
    expect(r.problemas[0].mensaje).toContain('A-04');
  });

  it('la plantilla que se le manda a las bodegas pasa su propia validación', () => {
    const r = validarCsv(plantillaCsv());

    expect(r.faltantes).toEqual([]);
    expect(r.problemas).toEqual([]);
    expect(r.ignoradas).toEqual([]);
    expect(r.filas).toHaveLength(1);
  });
});
