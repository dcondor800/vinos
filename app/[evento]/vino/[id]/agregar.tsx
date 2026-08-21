"use client";

import { useEffect } from "react";
import { registrar } from "@/lib/analitica";
import { agregarAlPedido, cantidadDe, fijarCantidad, MAX_POR_VINO } from "@/lib/pedido";
import { usePedido } from "@/lib/usar-sesion";

/**
 * Acción principal de la ficha, fija abajo. Escribe en el pedido local; la
 * pantalla de pedido y el código de recojo son la pantalla 5.
 */
export function AgregarAlPedido({
  slug,
  productoId,
  standId,
}: {
  slug: string;
  productoId: string;
  /** Va con la línea para saber qué falta por recoger sin cargar el catálogo. */
  standId: string;
}) {
  const pedido = usePedido(slug);
  const cantidad = cantidadDe(pedido ?? null, productoId);

  // Abrir una ficha es la señal de interés más limpia que hay: alguien vio el
  // vino en la lista y decidió mirarlo de cerca.
  useEffect(() => {
    registrar(slug, "abierto", productoId);
  }, [slug, productoId]);

  return (
    <div className="sticky bottom-0 -mx-6 mt-10 border-t border-borde bg-superficie px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* Mientras no se sabe (servidor e hidratación) se muestra el botón de
          agregar: es el estado de la primera visita, el más probante. */}
      {cantidad === 0 ? (
        <button
          type="button"
          onClick={() => {
            agregarAlPedido(slug, productoId, standId);
            registrar(slug, "agregado", productoId);
          }}
          className="boton boton-primario w-full text-base"
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
              onClick={() => {
                fijarCantidad(slug, productoId, cantidad - 1, standId);
                registrar(slug, cantidad === 1 ? "removido" : "agregado", productoId);
              }}
              aria-label="Quitar una botella"
              className="boton boton-icono bg-superficie text-xl"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => {
                fijarCantidad(slug, productoId, cantidad + 1, standId);
                registrar(slug, "agregado", productoId);
              }}
              disabled={cantidad >= MAX_POR_VINO}
              aria-label="Agregar una botella"
              className="boton boton-icono bg-marca text-xl text-sobre-marca"
            >
              +
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
