"use client";

import Link from "next/link";
import { totalBotellas } from "@/lib/pedido";
import { usePedido } from "@/lib/usar-sesion";

/**
 * Acceso al pedido desde el catálogo. Solo aparece cuando hay algo dentro: sin
 * botellas sería una barra que ocupa la zona del pulgar sin hacer nada.
 */
export function BarraPedido({ slug }: { slug: string }) {
  const pedido = usePedido(slug);
  const botellas = totalBotellas(pedido ?? null);

  if (botellas === 0) return null;

  return (
    <div className="sticky bottom-0 -mx-6 mt-8 border-t border-borde bg-superficie px-6 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <Link
        href={`/${slug}/pedido`}
        data-accion
        className="flex w-full items-center justify-between rounded-full bg-marca px-6 py-3.5 text-base font-medium text-sobre-marca transition-opacity active:opacity-80"
      >
        <span>Ver mi pedido</span>
        <span className="tabular-nums">
          {botellas} {botellas === 1 ? "botella" : "botellas"}
        </span>
      </Link>
    </div>
  );
}
