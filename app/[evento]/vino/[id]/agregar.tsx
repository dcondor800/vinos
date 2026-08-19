"use client";

import { agregarAlPedido, cantidadDe, fijarCantidad, MAX_POR_VINO } from "@/lib/pedido";
import { usePedido } from "@/lib/usar-sesion";

/**
 * Acción principal de la ficha, fija abajo. Escribe en el pedido local; la
 * pantalla de pedido y el código de recojo son la pantalla 5.
 */
export function AgregarAlPedido({ slug, productoId }: { slug: string; productoId: string }) {
  const pedido = usePedido(slug);
  const cantidad = cantidadDe(pedido ?? null, productoId);

  return (
    <div className="sticky bottom-0 -mx-6 mt-10 border-t border-borde bg-superficie px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Mientras no se sabe (servidor e hidratación) se muestra el botón de
          agregar: es el estado de la primera visita, el más probante. */}
      {cantidad === 0 ? (
        <button
          type="button"
          onClick={() => agregarAlPedido(slug, productoId)}
          className="w-full rounded-full bg-marca px-6 py-4 text-base font-medium text-sobre-marca transition-opacity active:opacity-80"
        >
          Agregar al pedido
        </button>
      ) : (
        <div className="flex items-center justify-between gap-4 rounded-full border border-marca-borde bg-marca-suave py-2 pr-2 pl-5">
          <span className="text-sm">
            {cantidad} {cantidad === 1 ? "botella" : "botellas"} en tu pedido
          </span>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => fijarCantidad(slug, productoId, cantidad - 1)}
              aria-label="Quitar una botella"
              className="grid size-11 place-items-center rounded-full bg-superficie text-xl active:opacity-70"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => fijarCantidad(slug, productoId, cantidad + 1)}
              disabled={cantidad >= MAX_POR_VINO}
              aria-label="Agregar una botella"
              className="grid size-11 place-items-center rounded-full bg-marca text-xl text-sobre-marca active:opacity-70 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
