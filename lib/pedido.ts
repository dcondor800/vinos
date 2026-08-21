/**
 * Pedido en curso, en el dispositivo. Es una lista de recojo, no un carrito de
 * compra: la app no cobra nada, el pago ocurre en cada stand.
 *
 * Solo guarda id de producto y cantidad. El precio y el stand se resuelven
 * contra el catálogo al mostrarlo, para que un cambio de precio en la feria no
 * quede congelado en el localStorage de la gente.
 */

import { escribir, instantanea, leer } from '@/lib/almacen';
import { leerSesion, sincronizarSesion, uuid } from '@/lib/sesion';
import { createClient } from '@/lib/supabase/client';

export interface LineaPedido {
  productoId: string;
  /**
   * Se guarda con la línea, no se resuelve del catálogo, para que el contador
   * del encabezado sepa qué falta por recoger sin tener que cargar el catálogo.
   * Null en pedidos guardados antes de que existiera el recojo por stand.
   */
  standId: string | null;
  cantidad: number;
}

export interface PedidoLocal {
  items: LineaPedido[];
  actualizadoEn: string;
  /** Se llenan al confirmar. Con código, el pedido queda cerrado a edición. */
  id: string | null;
  codigo: string | null;
  sincronizado: boolean;
  /** Stands ya pagados y recogidos. La feria se paga en varias paradas. */
  recogidos: string[];
}

/** Sin O, 0, I ni 1: se dictan en voz alta en un salón ruidoso. */
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generarCodigo(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
}

/** Tope por vino. Es una feria: nadie recoge 40 botellas de un stand. */
export const MAX_POR_VINO = 12;

const clavePedido = (slug: string) => `vinos:pedido:${slug}`;

const VACIO: PedidoLocal = {
  items: [],
  actualizadoEn: '',
  id: null,
  codigo: null,
  sincronizado: false,
  recogidos: [],
};

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
      standId: typeof i.standId === 'string' ? i.standId : null,
      cantidad: Math.min(MAX_POR_VINO, Math.max(1, Math.round(i.cantidad))),
    }));

  return {
    items,
    actualizadoEn: typeof p.actualizadoEn === 'string' ? p.actualizadoEn : '',
    id: typeof p.id === 'string' ? p.id : null,
    codigo: typeof p.codigo === 'string' ? p.codigo : null,
    sincronizado: p.sincronizado === true,
    recogidos: Array.isArray(p.recogidos)
      ? p.recogidos.filter((s): s is string => typeof s === 'string')
      : [],
  };
}

export function leerPedido(slug: string): PedidoLocal {
  return leer(clavePedido(slug), validar) ?? VACIO;
}

export function instantaneaPedido(slug: string): PedidoLocal | null {
  return instantanea(clavePedido(slug), validar);
}

function guardar(slug: string, cambios: Partial<PedidoLocal>): PedidoLocal {
  const pedido: PedidoLocal = {
    ...leerPedido(slug),
    ...cambios,
    actualizadoEn: new Date().toISOString(),
  };
  escribir(clavePedido(slug), pedido);
  return pedido;
}

export function cantidadDe(pedido: PedidoLocal | null, productoId: string): number {
  return pedido?.items.find((i) => i.productoId === productoId)?.cantidad ?? 0;
}

export function standRecogido(pedido: PedidoLocal | null, standId: string): boolean {
  return pedido?.recogidos.includes(standId) ?? false;
}

/**
 * Solo lo que queda por recoger. Es lo que muestra el encabezado: una vez
 * pagado y recogido un stand, esas botellas ya no son un pendiente y seguir
 * contándolas haría que el pedido nunca se vacíe.
 */
export function totalBotellas(pedido: PedidoLocal | null): number {
  if (!pedido) return 0;
  const recogidos = new Set(pedido.recogidos);

  return pedido.items
    .filter((i) => !i.standId || !recogidos.has(i.standId))
    .reduce((n, i) => n + i.cantidad, 0);
}

/** True cuando queda al menos una línea y ninguna está pendiente. */
export function todoRecogido(pedido: PedidoLocal | null): boolean {
  return (pedido?.items.length ?? 0) > 0 && totalBotellas(pedido) === 0;
}

/** Cantidad 0 o menos quita la línea. */
export function fijarCantidad(
  slug: string,
  productoId: string,
  cantidad: number,
  standId?: string,
): PedidoLocal {
  const actuales = leerPedido(slug).items;
  const limpia = Math.min(MAX_POR_VINO, Math.max(0, Math.round(cantidad)));

  if (limpia === 0) {
    return guardar(slug, { items: actuales.filter((i) => i.productoId !== productoId) });
  }

  const existe = actuales.some((i) => i.productoId === productoId);

  return guardar(slug, {
    items: existe
      ? actuales.map((i) =>
          i.productoId === productoId
            ? { ...i, cantidad: limpia, standId: standId ?? i.standId }
            : i,
        )
      : [...actuales, { productoId, standId: standId ?? null, cantidad: limpia }],
  });
}

export function agregarAlPedido(slug: string, productoId: string, standId?: string): PedidoLocal {
  return fijarCantidad(slug, productoId, cantidadDe(leerPedido(slug), productoId) + 1, standId);
}

/**
 * Pone el pedido al día con el catálogo actual.
 *
 * El pedido guarda solo ids de vino, así que si el catálogo cambia —se agota
 * una etiqueta, se recarga la feria entera— quedan líneas apuntando a vinos que
 * ya no existen. La pantalla del pedido las ignora al agrupar, pero el contador
 * del encabezado las seguía sumando: quedaban botellas fantasma imposibles de
 * quitar, porque no se ven en ninguna parte.
 *
 * De paso completa el stand de las líneas guardadas antes de que se almacenara,
 * y descarta stands marcados como recogidos que ya no tienen ninguna línea.
 *
 * Devuelve null cuando no hay nada que cambiar, para no escribir de más.
 */
export function reconciliar(
  pedido: PedidoLocal,
  standPorProducto: Map<string, string>,
): PedidoLocal | null {
  let cambio = false;
  const items: LineaPedido[] = [];

  for (const linea of pedido.items) {
    const standId = standPorProducto.get(linea.productoId);

    if (!standId) {
      cambio = true; // el vino ya no está en el catálogo
      continue;
    }

    if (linea.standId !== standId) {
      cambio = true;
      items.push({ ...linea, standId });
    } else {
      items.push(linea);
    }
  }

  const presentes = new Set(items.map((i) => i.standId));
  const recogidos = pedido.recogidos.filter((s) => presentes.has(s));
  if (recogidos.length !== pedido.recogidos.length) cambio = true;

  if (!cambio) return null;

  // Sin líneas no queda pedido: se suelta también el código, o quedaría una
  // referencia a una lista vacía.
  if (items.length === 0) {
    return { ...pedido, items: [], recogidos: [], id: null, codigo: null, sincronizado: false };
  }

  return { ...pedido, items, recogidos };
}

/** Aplica la reconciliación sobre lo guardado. */
export function reconciliarPedido(slug: string, standPorProducto: Map<string, string>): void {
  const puesto = reconciliar(leerPedido(slug), standPorProducto);
  if (puesto) escribir(clavePedido(slug), puesto);
}

/** Marca un stand como pagado y recogido. Es local: no hay política de update. */
export function marcarRecogido(slug: string, standId: string, recogido: boolean): PedidoLocal {
  const actuales = leerPedido(slug).recogidos.filter((s) => s !== standId);
  return guardar(slug, { recogidos: recogido ? [...actuales, standId] : actuales });
}

/** Datos que el pedido necesita del catálogo en el momento de confirmar. */
export interface LineaConfirmada {
  productoId: string;
  standId: string;
  cantidad: number;
  precioUnit: number;
}

/**
 * Genera el código y deja el pedido cerrado a edición. El código sale del
 * cliente para que funcione sin red: si la feria se queda sin WiFi, la persona
 * igual tiene su número y camina al stand. La fila sube después.
 */
export function confirmarPedido(slug: string, lineas: LineaConfirmada[]): PedidoLocal {
  const pedido = guardar(slug, {
    id: uuid(),
    codigo: generarCodigo(),
    sincronizado: false,
  });

  void sincronizarPedido(slug, lineas);

  return pedido;
}

/**
 * Reabre el pedido para editarlo. Suelta el código: al volver a confirmar se
 * emite uno nuevo. La fila anterior queda huérfana en Supabase con estado
 * 'abierto'; sin política de delete no hay forma de limpiarla desde el cliente,
 * y para la telemetría del evento tampoco estorba.
 */
export function reabrirPedido(slug: string): PedidoLocal {
  return guardar(slug, { id: null, codigo: null, sincronizado: false });
}

/**
 * Cierra el pedido en el dispositivo. La fila en Supabase se queda como está:
 * sin política de update el cliente no puede marcarla 'completado', y quien
 * cierre ese ciclo será el panel de bodega en la fase 2.
 */
export function vaciarPedido(slug: string): PedidoLocal {
  return guardar(slug, {
    items: [],
    id: null,
    codigo: null,
    sincronizado: false,
    recogidos: [],
  });
}

/**
 * Sube el pedido y sus líneas. Hay FK a `sesiones`, así que la sesión va
 * primero. Sin política de select, las líneas se insertan de una sola vez: si
 * el insert de items falla, la cabecera queda sin líneas y el reintento la
 * completa.
 */
export async function sincronizarPedido(
  slug: string,
  lineas: LineaConfirmada[],
  intentos = 3,
): Promise<boolean> {
  const pedido = leerPedido(slug);
  if (!pedido.id || !pedido.codigo || pedido.sincronizado) return true;

  await sincronizarSesion(slug);
  const sesion = leerSesion(slug);
  if (!sesion?.sincronizada) return false;

  try {
    const supabase = createClient();

    const { error: errorPedido } = await supabase.from('pedidos').insert({
      id: pedido.id,
      evento_id: sesion.eventoId,
      sesion_id: sesion.id,
      codigo: pedido.codigo,
    });

    // 23505: el código ya existía en este evento. Se emite otro y se reintenta.
    if (errorPedido?.code === '23505') {
      if (intentos <= 1) return false;
      guardar(slug, { codigo: generarCodigo() });
      return sincronizarPedido(slug, lineas, intentos - 1);
    }
    if (errorPedido) return false;

    const { error: errorItems } = await supabase.from('pedido_items').insert(
      lineas.map((l) => ({
        pedido_id: pedido.id,
        producto_id: l.productoId,
        stand_id: l.standId,
        cantidad: l.cantidad,
        precio_unit: l.precioUnit,
      })),
    );
    if (errorItems) return false;

    guardar(slug, { sincronizado: true });
    return true;
  } catch {
    return false;
  }
}
