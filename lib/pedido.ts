/**
 * Pedido en curso, en el dispositivo. Es una lista de recojo, no un carrito de
 * compra: la app no cobra nada, el pago ocurre en cada stand.
 *
 * Solo guarda id de producto y cantidad. El precio y el stand se resuelven
 * contra el catálogo al mostrarlo, para que un cambio de precio en la feria no
 * quede congelado en el localStorage de la gente.
 */

import { escribir, instantanea, leer } from '@/lib/almacen';

export interface LineaPedido {
  productoId: string;
  cantidad: number;
}

export interface PedidoLocal {
  items: LineaPedido[];
  actualizadoEn: string;
}

/** Tope por vino. Es una feria: nadie recoge 40 botellas de un stand. */
export const MAX_POR_VINO = 12;

const clavePedido = (slug: string) => `vinos:pedido:${slug}`;

const VACIO: PedidoLocal = { items: [], actualizadoEn: '' };

function validar(dato: unknown): PedidoLocal | null {
  const p = dato as Partial<PedidoLocal> | null;
  if (!p || !Array.isArray(p.items)) return null;

  const items = p.items
    .filter(
      (i): i is LineaPedido =>
        !!i && typeof i.productoId === 'string' && typeof i.cantidad === 'number',
    )
    .map((i) => ({
      productoId: i.productoId,
      cantidad: Math.min(MAX_POR_VINO, Math.max(1, Math.round(i.cantidad))),
    }));

  return {
    items,
    actualizadoEn: typeof p.actualizadoEn === 'string' ? p.actualizadoEn : '',
  };
}

export function leerPedido(slug: string): PedidoLocal {
  return leer(clavePedido(slug), validar) ?? VACIO;
}

export function instantaneaPedido(slug: string): PedidoLocal | null {
  return instantanea(clavePedido(slug), validar);
}

function guardar(slug: string, items: LineaPedido[]): PedidoLocal {
  const pedido: PedidoLocal = { items, actualizadoEn: new Date().toISOString() };
  escribir(clavePedido(slug), pedido);
  return pedido;
}

export function cantidadDe(pedido: PedidoLocal | null, productoId: string): number {
  return pedido?.items.find((i) => i.productoId === productoId)?.cantidad ?? 0;
}

export function totalBotellas(pedido: PedidoLocal | null): number {
  return pedido?.items.reduce((n, i) => n + i.cantidad, 0) ?? 0;
}

/** Cantidad 0 o menos quita la línea. */
export function fijarCantidad(slug: string, productoId: string, cantidad: number): PedidoLocal {
  const actuales = leerPedido(slug).items;
  const limpia = Math.min(MAX_POR_VINO, Math.max(0, Math.round(cantidad)));

  if (limpia === 0) {
    return guardar(
      slug,
      actuales.filter((i) => i.productoId !== productoId),
    );
  }

  const existe = actuales.some((i) => i.productoId === productoId);

  return guardar(
    slug,
    existe
      ? actuales.map((i) => (i.productoId === productoId ? { ...i, cantidad: limpia } : i))
      : [...actuales, { productoId, cantidad: limpia }],
  );
}

export function agregarAlPedido(slug: string, productoId: string): PedidoLocal {
  return fijarCantidad(slug, productoId, cantidadDe(leerPedido(slug), productoId) + 1);
}
