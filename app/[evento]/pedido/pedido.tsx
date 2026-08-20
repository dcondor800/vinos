"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { ProductoCatalogo } from "@/lib/catalogo";
import { formatearPrecio } from "@/lib/moneda";
import {
  confirmarPedido,
  fijarCantidad,
  marcarRecogido,
  MAX_POR_VINO,
  reabrirPedido,
  sincronizarPedido,
  standRecogido,
  todoRecogido,
  vaciarPedido,
  type LineaConfirmada,
} from "@/lib/pedido";
import { useExigeEdad, usePedido, useSincronizacion } from "@/lib/usar-sesion";
import { Encabezado } from "../encabezado";
import { Esqueleto } from "../esqueleto";

interface LineaVista {
  producto: ProductoCatalogo;
  cantidad: number;
  subtotal: number;
}

interface GrupoStand {
  standId: string;
  stand: string;
  bodega: string;
  zona: string | null;
  lineas: LineaVista[];
  subtotal: number;
}

export function Pedido({
  slug,
  catalogo,
  moneda,
}: {
  slug: string;
  catalogo: ProductoCatalogo[];
  moneda: string | null;
}) {
  const sesion = useExigeEdad(slug);
  const pedido = usePedido(slug);
  useSincronizacion(slug);

  const { grupos, total } = useMemo(() => {
    const porId = new Map(catalogo.map((p) => [p.id, p]));
    const mapa = new Map<string, GrupoStand>();
    let total = 0;

    for (const item of pedido?.items ?? []) {
      const producto = porId.get(item.productoId);
      // El vino salió del catálogo (se agotó o lo dieron de baja): se ignora.
      if (!producto) continue;

      const subtotal = producto.precio * item.cantidad;
      total += subtotal;

      // Agrupado por stand porque así se recorre la feria: se camina a un
      // sitio, se paga lo de ese sitio, se sigue al siguiente.
      const grupo = mapa.get(producto.stand_id) ?? {
        standId: producto.stand_id,
        stand: producto.stand,
        bodega: producto.bodega,
        zona: producto.zona,
        lineas: [],
        subtotal: 0,
      };

      grupo.lineas.push({ producto, cantidad: item.cantidad, subtotal });
      grupo.subtotal += subtotal;
      mapa.set(producto.stand_id, grupo);
    }

    return {
      grupos: [...mapa.values()].sort((a, b) => a.stand.localeCompare(b.stand, "es")),
      total,
    };
  }, [catalogo, pedido]);

  if (sesion === undefined || pedido === undefined) return <Esqueleto filas={2} />;
  if (!sesion?.edadConfirmada) return null;

  const cerrado = pedido?.codigo != null;
  const vacio = grupos.length === 0;
  const completo = todoRecogido(pedido ?? null);
  const pendientes = grupos.filter((g) => !standRecogido(pedido ?? null, g.standId)).length;

  function alConfirmar() {
    const lineas: LineaConfirmada[] = grupos.flatMap((g) =>
      g.lineas.map((l) => ({
        productoId: l.producto.id,
        standId: g.standId,
        cantidad: l.cantidad,
        // El precio se congela aquí: es el que la persona vio al pedir.
        precioUnit: l.producto.precio,
      })),
    );
    confirmarPedido(slug, lineas);
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
      <Encabezado slug={slug} volverA={`/${slug}/resultados`} titulo="Mi pedido" />

      <h1 className="mt-5 text-2xl font-medium tracking-tight">Mi pedido</h1>

      {vacio ? (
        <div className="mt-8">
          <p className="text-hueso-suave">Todavía no has agregado ninguna botella.</p>
          <Link
            href={`/${slug}/resultados`}
            className="boton boton-primario mt-5 w-full text-base"
          >
            Ver mis sugerencias
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-sm text-hueso-suave">
            {!cerrado
              ? grupos.length === 1
                ? "Todo está en un solo stand."
                : `Tus botellas están en ${grupos.length} stands. Se paga en cada uno.`
              : completo
                ? "Ya pasaste por todos los stands."
                : `Te ${pendientes === 1 ? "queda" : "quedan"} ${pendientes} de ${grupos.length} ${grupos.length === 1 ? "stand" : "stands"}. Muéstrale a cada uno su sección de la lista.`}
          </p>

          <div className="mt-6 flex flex-col gap-5">
            {grupos.map((g) => {
              const recogido = standRecogido(pedido, g.standId);

              return (
              <section
                key={g.standId}
                /* Lo recogido se apaga en vez de desaparecer: sigue siendo parte
                   del pedido y de la cuenta, pero ya no es una parada pendiente. */
                className={`rounded-2xl border transition-opacity ${
                  recogido ? "border-borde/60 opacity-45" : "border-borde"
                }`}
              >
                <header className="flex items-baseline justify-between gap-3 border-b border-borde px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-lg font-medium">Stand {g.stand}</p>
                    <p className="truncate font-serif text-sm text-hueso-suave">{g.bodega}</p>
                  </div>
                  {g.zona && (
                    <span className="shrink-0 text-xs text-hueso-suave">Zona {g.zona}</span>
                  )}
                </header>

                <ul className="divide-y divide-borde">
                  {g.lineas.map((l) => (
                    <li key={l.producto.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/${slug}/vino/${l.producto.id}`}
                          className="block font-serif leading-snug"
                        >
                          {l.producto.nombre}
                        </Link>
                        <p className="mt-0.5 text-xs text-hueso-suave">
                          {formatearPrecio(l.producto.precio, moneda)} c/u
                        </p>
                      </div>

                      {cerrado ? (
                        <span className="text-sm tabular-nums">×{l.cantidad}</span>
                      ) : (
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => fijarCantidad(slug, l.producto.id, l.cantidad - 1, g.standId)}
                            aria-label={`Quitar una botella de ${l.producto.nombre}`}
                            className="grid size-11 place-items-center rounded-full border border-borde text-lg active:bg-borde"
                          >
                            −
                          </button>
                          <span className="w-5 text-center text-sm tabular-nums">
                            {l.cantidad}
                          </span>
                          <button
                            type="button"
                            onClick={() => fijarCantidad(slug, l.producto.id, l.cantidad + 1, g.standId)}
                            disabled={l.cantidad >= MAX_POR_VINO}
                            aria-label={`Agregar una botella de ${l.producto.nombre}`}
                            className="grid size-11 place-items-center rounded-full border border-borde text-lg active:bg-borde disabled:opacity-40"
                          >
                            +
                          </button>
                        </div>
                      )}

                      <span className="w-16 shrink-0 text-right text-sm tabular-nums">
                        {formatearPrecio(l.subtotal, moneda)}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center justify-between gap-3 border-t border-borde px-4 py-2.5">
                  {/* Marcar el stand solo tiene sentido una vez confirmado:
                      antes todavía se está armando la lista. */}
                  {cerrado ? (
                    <button
                      type="button"
                      onClick={() => marcarRecogido(slug, g.standId, !recogido)}
                      aria-pressed={recogido}
                      className="boton -my-1 -ml-2 gap-2 px-2 text-sm text-hueso-suave"
                    >
                      <span
                        aria-hidden
                        className={`grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                          recogido
                            ? "border-marca bg-marca text-sobre-marca"
                            : "border-hueso-suave"
                        }`}
                      >
                        {recogido ? "✓" : ""}
                      </span>
                      {recogido ? "Recogido" : "Ya lo recogí"}
                    </button>
                  ) : (
                    <span />
                  )}

                  <p className="text-sm text-hueso-suave">
                    Subtotal{" "}
                    <span className="ml-1 text-hueso">{formatearPrecio(g.subtotal, moneda)}</span>
                  </p>
                </div>
              </section>
              );
            })}
          </div>

          <div className="mt-6 flex items-baseline justify-between">
            <span className="text-lg">Total</span>
            <span className="text-2xl font-medium tabular-nums">
              {formatearPrecio(total, moneda)}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-hueso-suave">
            Precios referenciales. El pago se realiza en cada stand.
          </p>

          {/* Al final de todo: es lo último que se necesita, después de haber
              recorrido la lista. */}
          {cerrado && (
            <>
              {completo && (
                <div className="mt-6 rounded-xl border border-marca-borde bg-marca-suave px-4 py-4 text-center">
                  <p className="text-sm">Recogiste todo lo de tu lista.</p>
                  <button
                    type="button"
                    onClick={() => vaciarPedido(slug)}
                    className="boton boton-primario mt-3 w-full text-base"
                  >
                    Terminar pedido
                  </button>
                </div>
              )}

              <Referencia
                slug={slug}
                codigo={pedido.codigo!}
                sincronizado={pedido.sincronizado}
                grupos={grupos}
              />
            </>
          )}

          {/* Una vez confirmado no queda nada que tocar: la pantalla pasa a ser
              la lista con la que se camina, y la barra fija estorbaría. */}
          {!cerrado && (
            <div className="sticky bottom-0 -mx-6 mt-8 border-t border-borde bg-superficie px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={alConfirmar}
                className="boton boton-primario w-full text-base"
              >
                Confirmar mi pedido
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

/**
 * El código no es lo que resuelve la compra: en el stand lo que funciona es
 * enseñar la sección de esa bodega, con sus vinos y cantidades. Mientras no
 * exista el panel de bodega, el personal no tiene dónde buscarlo, así que darle
 * protagonismo prometería una interacción que no existe. Queda como referencia
 * para reclamos y para cruzar la venta después.
 */
function Referencia({
  slug,
  codigo,
  sincronizado,
  grupos,
}: {
  slug: string;
  codigo: string;
  sincronizado: boolean;
  grupos: GrupoStand[];
}) {
  function reintentar() {
    void sincronizarPedido(
      slug,
      grupos.flatMap((g) =>
        g.lineas.map((l) => ({
          productoId: l.producto.id,
          standId: g.standId,
          cantidad: l.cantidad,
          precioUnit: l.producto.precio,
        })),
      ),
    );
  }

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-borde px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <p className="text-sm text-hueso-suave">
        Referencia{" "}
        <span className="font-medium tracking-wider text-hueso tabular-nums">{codigo}</span>
      </p>

      <button
        type="button"
        onClick={() => reabrirPedido(slug)}
        className="text-sm text-hueso-suave underline underline-offset-4"
      >
        Modificar el pedido
      </button>

      {/* El pedido vale igual sin red: lo que falta es la copia en el servidor. */}
      {!sincronizado && (
        <button
          type="button"
          onClick={reintentar}
          className="basis-full text-left text-xs text-hueso-suave underline underline-offset-4"
        >
          Sin conexión — tu lista sigue aquí. Reintentar el guardado.
        </button>
      )}
    </div>
  );
}
