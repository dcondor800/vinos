import Image from "next/image";
import Link from "next/link";
import type { ProductoCatalogo } from "@/lib/catalogo";
import { formatearPrecio } from "@/lib/moneda";
import type { Razon } from "@/lib/recomendacion";

/**
 * Tarjeta de vino de la lista. La fila de razones es lo que separa esto de un
 * buscador con filtros: dice por qué este vino y no otro. No se quita por
 * espacio.
 */
export function TarjetaVino({
  slug,
  producto,
  moneda,
  razones = [],
}: {
  slug: string;
  producto: ProductoCatalogo;
  moneda: string | null;
  razones?: Razon[];
}) {
  const origen = [producto.tipo, producto.varietal].filter(Boolean).join(" · ");

  return (
    <Link
      href={`/${slug}/vino/${producto.id}`}
      data-accion
      className="flex gap-4 rounded-2xl border border-borde bg-superficie-alta p-3 transition-colors active:bg-borde"
    >
      <div className="relative size-24 shrink-0 overflow-hidden rounded-xl bg-superficie">
        {producto.imagen_url ? (
          <Image
            src={producto.imagen_url}
            alt=""
            fill
            sizes="96px"
            className="object-contain p-1"
          />
        ) : (
          <span
            aria-hidden
            className="grid size-full place-items-center font-serif text-2xl text-hueso-suave"
          >
            {producto.nombre.charAt(0)}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="font-serif text-lg leading-snug text-balance">{producto.nombre}</h2>
        <p className="mt-0.5 truncate font-serif text-sm text-hueso-suave">{producto.bodega}</p>
        {origen && <p className="mt-1 truncate text-xs text-hueso-suave capitalize">{origen}</p>}

        <p className="mt-2 text-sm">
          <span className="font-medium">{formatearPrecio(producto.precio, moneda)}</span>
          <span className="text-hueso-suave"> · Stand {producto.stand}</span>
        </p>

        {razones.length > 0 && (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {razones.map((r) => (
              <li
                key={r.clave}
                className="rounded-full bg-marca-suave px-2.5 py-1 text-xs text-hueso capitalize"
              >
                {r.texto}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Link>
  );
}
