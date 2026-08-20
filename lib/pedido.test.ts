import { describe, expect, it } from 'vitest';
import {
  cantidadDe,
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
