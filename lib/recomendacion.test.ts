import { describe, expect, it } from 'vitest';
import { describirPerfil, recomendar, type Perfil, type Producto } from '@/lib/recomendacion';

/**
 * acidez y taninos van en null salvo que el test los necesite: aportan décimas
 * de desempate y ensucian las comparaciones exactas.
 */
function vino(over: Partial<Producto> & { id: string }): Producto {
  return {
    nombre: `Vino ${over.id}`,
    expositor_id: 'bodega-1',
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

function perfil(over: Partial<Perfil> = {}): Perfil {
  return { tipos: [], dulzor: 3, cuerpo: 3, maridajes: [], precioMax: null, ...over };
}

/** Score de un solo producto, sin el ruido del corte por bodega. */
function score(p: Producto, perf: Perfil): number {
  return recomendar([p], perf)[0].score;
}

describe('scoring', () => {
  it('suma los cinco factores cuando todo coincide', () => {
    const p = vino({
      id: 'a',
      tipo: 'tinto',
      precio: 89,
      cuerpo: 4,
      dulzor: 2,
      acidez: 3,
      taninos: 4,
      maridajes: ['carnes rojas'],
    });
    const perf = perfil({
      tipos: ['tinto'],
      dulzor: 2,
      cuerpo: 4,
      maridajes: ['carnes rojas'],
      precioMax: 100,
    });

    // 30 tipo + 25 dulzor + 20 cuerpo + 15 maridaje + 10 precio = 100,
    // más 0.3 de acidez y 0.32 de taninos por ser tinto.
    expect(score(p, perf)).toBe(100.6);
  });

  it('un tipo que no se pidió no suma nada', () => {
    const perf = perfil({ tipos: ['tinto'] });
    const conTipo = score(vino({ id: 'a', tipo: 'tinto' }), perf);
    const sinTipo = score(vino({ id: 'b', tipo: 'blanco' }), perf);

    expect(conTipo - sinTipo).toBe(30);
  });

  it('"me da igual" reparte medio peso de tipo en vez de castigar', () => {
    const daIgual = score(vino({ id: 'a', tipo: 'blanco' }), perfil({ tipos: ['otro'] }));
    const noPedido = score(vino({ id: 'a', tipo: 'blanco' }), perfil({ tipos: ['tinto'] }));
    const pedido = score(vino({ id: 'a', tipo: 'blanco' }), perfil({ tipos: ['blanco'] }));

    expect(daIgual).toBeGreaterThan(noPedido);
    expect(daIgual).toBeLessThan(pedido);
  });

  it('lista vacía de tipos se trata igual que "me da igual"', () => {
    const p = vino({ id: 'a', tipo: 'espumante' });
    expect(score(p, perfil({ tipos: [] }))).toBe(score(p, perfil({ tipos: ['otro'] })));
  });

  it('un dato sensorial faltante ni premia ni castiga', () => {
    const perf = perfil({ dulzor: 1 });
    const exacto = score(vino({ id: 'a', dulzor: 1 }), perf);
    const faltante = score(vino({ id: 'b', dulzor: null }), perf);
    const opuesto = score(vino({ id: 'c', dulzor: 5 }), perf);

    expect(faltante).toBeLessThan(exacto);
    expect(faltante).toBeGreaterThan(opuesto);
    // Exactamente a mitad de camino: cercania() devuelve 0.5.
    expect(faltante - opuesto).toBeCloseTo(exacto - faltante, 5);
  });

  it('el dulzor pesa más que el cuerpo ante el mismo desvío', () => {
    const perf = perfil({ dulzor: 1, cuerpo: 1 });
    const falloDulzor = score(vino({ id: 'a', dulzor: 5, cuerpo: 1 }), perf);
    const falloCuerpo = score(vino({ id: 'b', dulzor: 1, cuerpo: 5 }), perf);

    expect(falloDulzor).toBeLessThan(falloCuerpo);
  });

  it('castiga el exceso de precio en proporción, no de golpe', () => {
    const perf = perfil({ precioMax: 100 });
    const dentro = score(vino({ id: 'a', precio: 100 }), perf);
    const pocoMas = score(vino({ id: 'b', precio: 125 }), perf);
    const muchoMas = score(vino({ id: 'c', precio: 200 }), perf);

    expect(dentro - pocoMas).toBe(5); // 25% de exceso se lleva la mitad del peso
    expect(dentro - muchoMas).toBe(10); // 50% o más lo pierde entero
    expect(score(vino({ id: 'd', precio: 1000 }), perf)).toBe(muchoMas); // nunca negativo
  });

  it('sin presupuesto no se castiga ningún precio', () => {
    const perf = perfil({ precioMax: null });
    expect(score(vino({ id: 'a', precio: 40 }), perf)).toBe(
      score(vino({ id: 'b', precio: 900 }), perf),
    );
  });

  it('los taninos solo desempatan en tintos', () => {
    const perf = perfil();
    const tinto = score(vino({ id: 'a', tipo: 'tinto', taninos: 5 }), perf);
    const tintoSin = score(vino({ id: 'b', tipo: 'tinto', taninos: null }), perf);
    const blanco = score(vino({ id: 'c', tipo: 'blanco', taninos: 5 }), perf);
    const blancoSin = score(vino({ id: 'd', tipo: 'blanco', taninos: null }), perf);

    expect(tinto).toBeGreaterThan(tintoSin);
    expect(blanco).toBe(blancoSin);
  });
});

describe('razones', () => {
  it('explica cada factor que encajó, con tope de tres', () => {
    const p = vino({
      id: 'a',
      tipo: 'tinto',
      precio: 80,
      cuerpo: 4,
      dulzor: 2,
      maridajes: ['carnes rojas'],
    });
    const perf = perfil({
      tipos: ['tinto'],
      dulzor: 2,
      cuerpo: 4,
      maridajes: ['carnes rojas'],
      precioMax: 100,
    });

    const razones = recomendar([p], perf)[0].razones;

    // Encajan los cinco factores, pero la fila de la tarjeta muestra tres.
    expect(razones).toHaveLength(3);
    expect(razones.map((r) => r.clave)).toEqual(['tipo', 'dulzor', 'cuerpo']);
    expect(razones[2].texto).toBe('con cuerpo');
  });

  it('no inventa razones sobre datos que no existen', () => {
    const p = vino({ id: 'a', tipo: 'blanco', dulzor: null, cuerpo: null });
    const razones = recomendar([p], perfil({ tipos: ['tinto'] }))[0].razones;

    expect(razones).toEqual([]);
  });

  it('nombra el maridaje que coincidió', () => {
    const p = vino({ id: 'a', maridajes: ['quesos', 'pastas'] });
    const razones = recomendar([p], perfil({ maridajes: ['pastas'] }))[0].razones;

    expect(razones.find((r) => r.clave === 'maridaje')?.texto).toBe('va con pastas');
  });
});

describe('armado de la lista', () => {
  it('ordena de mayor a menor score', () => {
    const catalogo = [
      vino({ id: 'malo', tipo: 'blanco', expositor_id: 'b1' }),
      vino({ id: 'bueno', tipo: 'tinto', expositor_id: 'b2' }),
    ];

    expect(recomendar(catalogo, perfil({ tipos: ['tinto'] }))[0].producto.id).toBe('bueno');
  });

  it('deja fuera lo que no está disponible', () => {
    const catalogo = [
      vino({ id: 'a', disponible: false }),
      vino({ id: 'b', expositor_id: 'b2' }),
    ];

    expect(recomendar(catalogo, perfil()).map((s) => s.producto.id)).toEqual(['b']);
  });

  it('no deja que una bodega cope la lista', () => {
    // Cuatro bodegas con tres vinos cada una: nadie debería aportar más de dos.
    const catalogo = ['b1', 'b2', 'b3', 'b4'].flatMap((bodega) =>
      [1, 2, 3].map((n) => vino({ id: `${bodega}-${n}`, expositor_id: bodega })),
    );

    const porBodega = new Map<string, number>();
    for (const s of recomendar(catalogo, perfil())) {
      porBodega.set(
        s.producto.expositor_id,
        (porBodega.get(s.producto.expositor_id) ?? 0) + 1,
      );
    }

    expect([...porBodega.values()].every((n) => n <= 2)).toBe(true);
    expect(porBodega.size).toBe(4);
  });

  it('rompe el tope por bodega antes que devolver una lista raquítica', () => {
    // Una sola bodega con tres vinos: aplicar el tope dejaría dos.
    const catalogo = [1, 2, 3].map((n) => vino({ id: `v${n}`, expositor_id: 'unica' }));

    expect(recomendar(catalogo, perfil())).toHaveLength(3);
  });

  it('respeta el límite pedido', () => {
    const catalogo = Array.from({ length: 30 }, (_, n) =>
      vino({ id: `v${n}`, expositor_id: `b${n}` }),
    );

    expect(recomendar(catalogo, perfil(), { limite: 8 })).toHaveLength(8);
  });
});

describe('describirPerfil', () => {
  it('arma la línea de resumen con mayúscula inicial', () => {
    const linea = describirPerfil(
      perfil({
        tipos: ['tinto'],
        dulzor: 2,
        cuerpo: 4,
        maridajes: ['carnes rojas'],
        precioMax: 100,
      }),
    );

    expect(linea).toBe('Tinto, con cuerpo, seco, para carnes rojas, hasta S/100');
  });

  it('omite el "me da igual" y el presupuesto abierto', () => {
    const linea = describirPerfil(perfil({ tipos: ['otro'], dulzor: 3, cuerpo: 3 }));

    expect(linea).toBe('Equilibrado, intermedio');
  });

  it('usa el símbolo de moneda del evento', () => {
    expect(describirPerfil(perfil({ precioMax: 50 }), '$')).toContain('hasta $50');
  });
});
