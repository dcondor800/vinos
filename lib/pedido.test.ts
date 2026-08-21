import { describe, expect, it } from 'vitest';
import {
  cantidadDe,
  reconciliar,
  standRecogido,
  todoRecogido,
  totalBotellas,
  type PedidoLocal,
} from '@/lib/pedido';

/** Solo se prueban las funciones puras: las demás escriben en localStorage. */
function pedido(over: Partial<PedidoLocal> = {}): PedidoLocal {
  return {
    items: [],
    actualizadoEn: '',
    id: null,
    codigo: null,
    sincronizado: false,
    recogidos: [],
    ...over,
  };
}

const linea = (productoId: string, standId: string | null, cantidad: number) => ({
  productoId,
  standId,
  cantidad,
});

describe('totalBotellas', () => {
  it('suma todas las botellas mientras no se haya recogido nada', () => {
    const p = pedido({ items: [linea('a', 's1', 2), linea('b', 's2', 3)] });

    expect(totalBotellas(p)).toBe(5);
  });

  it('descuenta los stands ya recogidos', () => {
    // Es el motivo del cambio: si lo recogido siguiera contando, el indicador
    // del pedido nunca volvería a cero y quedaría lleno para siempre.
    const p = pedido({
      items: [linea('a', 's1', 2), linea('b', 's2', 3)],
      recogidos: ['s1'],
    });

    expect(totalBotellas(p)).toBe(3);
  });

  it('llega a cero cuando se recogieron todos los stands', () => {
    const p = pedido({
      items: [linea('a', 's1', 2), linea('b', 's2', 3)],
      recogidos: ['s1', 's2'],
    });

    expect(totalBotellas(p)).toBe(0);
    expect(todoRecogido(p)).toBe(true);
  });

  it('cuenta las líneas sin stand, que vienen de pedidos guardados antes', () => {
    const p = pedido({ items: [linea('a', null, 2)], recogidos: ['s1'] });

    expect(totalBotellas(p)).toBe(2);
  });

  it('un pedido vacío no está "todo recogido"', () => {
    expect(todoRecogido(pedido())).toBe(false);
    expect(totalBotellas(null)).toBe(0);
  });
});

describe('reconciliar con el catálogo', () => {
  const mapa = new Map([
    ['a', 's1'],
    ['b', 's2'],
  ]);

  it('no cambia nada cuando todo sigue en el catálogo', () => {
    const p = pedido({ items: [linea('a', 's1', 2), linea('b', 's2', 1)] });

    expect(reconciliar(p, mapa)).toBeNull();
  });

  it('descarta el vino que ya no está en el catálogo', () => {
    // Es el caso que dejaba botellas fantasma: invisibles en la lista, porque
    // se agrupa por catálogo, pero contadas en el indicador del encabezado.
    const p = pedido({ items: [linea('a', 's1', 2), linea('fantasma', 's9', 3)] });
    const r = reconciliar(p, mapa)!;

    expect(r.items.map((i) => i.productoId)).toEqual(['a']);
    expect(totalBotellas(r)).toBe(2);
  });

  it('completa el stand de las líneas guardadas sin él', () => {
    const p = pedido({ items: [linea('a', null, 1)] });

    expect(reconciliar(p, mapa)!.items[0].standId).toBe('s1');
  });

  it('corrige el stand cuando el vino cambió de sitio en la feria', () => {
    const p = pedido({ items: [linea('a', 'viejo', 1)] });

    expect(reconciliar(p, mapa)!.items[0].standId).toBe('s1');
  });

  it('olvida los stands marcados como recogidos que ya no tienen líneas', () => {
    const p = pedido({ items: [linea('a', 's1', 1)], recogidos: ['s1', 's9'] });

    expect(reconciliar(p, mapa)!.recogidos).toEqual(['s1']);
  });

  it('suelta el código cuando no queda ninguna línea', () => {
    // Un código de recojo apuntando a una lista vacía no le sirve a nadie.
    const p = pedido({
      items: [linea('fantasma', 's9', 2)],
      id: 'uuid',
      codigo: 'K7M2QX',
      recogidos: ['s9'],
    });
    const r = reconciliar(p, mapa)!;

    expect(r.items).toEqual([]);
    expect(r.codigo).toBeNull();
    expect(r.id).toBeNull();
    expect(totalBotellas(r)).toBe(0);
  });
});

describe('consultas por producto y stand', () => {
  it('devuelve la cantidad de un vino y cero si no está', () => {
    const p = pedido({ items: [linea('a', 's1', 4)] });

    expect(cantidadDe(p, 'a')).toBe(4);
    expect(cantidadDe(p, 'b')).toBe(0);
    expect(cantidadDe(null, 'a')).toBe(0);
  });

  it('sabe qué stands están recogidos', () => {
    const p = pedido({ recogidos: ['s1'] });

    expect(standRecogido(p, 's1')).toBe(true);
    expect(standRecogido(p, 's2')).toBe(false);
  });
});
