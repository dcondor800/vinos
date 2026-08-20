"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { totalBotellas } from "@/lib/pedido";
import { usePedido } from "@/lib/usar-sesion";

/**
 * Chrome común de las pantallas internas. Existe para que dos cosas estén
 * siempre en el mismo sitio: cómo se vuelve y cómo se llega al pedido. Antes
 * cada pantalla resolvía el "atrás" a su manera y el acceso al pedido competía
 * con la acción principal por la zona del pulgar.
 */
export function Encabezado({
  slug,
  volverA,
  titulo,
}: {
  slug: string;
  /** Destino cuando no hay historial propio: entrar por QR o recargar. */
  volverA: string;
  titulo?: string;
}) {
  const router = useRouter();
  const pedido = usePedido(slug);
  const botellas = totalBotellas(pedido ?? null);

  /**
   * Volver al paso anterior real, no a una ruta fija: si llegaste a la ficha
   * desde el pedido, tienes que regresar al pedido. `idx` es el índice que el
   * router de Next mantiene en el historial; si es 0 la pestaña se abrió aquí
   * y no hay adónde retroceder. Se decide al tocar, no al renderizar, para no
   * depender de window durante la hidratación.
   */
  function volver() {
    const historia = window.history.state as { idx?: number } | null;
    if ((historia?.idx ?? 0) > 0) router.back();
    else router.push(volverA);
  }

  return (
    <header className="sticky top-0 z-10 -mx-6 mb-1 flex items-center gap-2 border-b border-borde bg-superficie/95 px-4 py-2 backdrop-blur">
      <button
        type="button"
        onClick={volver}
        aria-label="Volver"
        className="boton boton-icono -ml-1 text-hueso-suave"
      >
        <Flecha />
      </button>

      <span className="min-w-0 flex-1 truncate text-center text-sm text-hueso-suave">
        {titulo}
      </span>

      {/* Solo cuando hay algo dentro: un contador en cero es ruido.
          Va en color de marca y con la palabra, no solo el icono: en la esquina
          superior derecha, que es la más difícil de alcanzar con el pulgar, un
          botón discreto se pierde. La key hace que el pulso se repita en cada
          cambio de cantidad, que es lo que enseña dónde vive el pedido. */}
      {botellas > 0 ? (
        <Link
          key={botellas}
          href={`/${slug}/pedido`}
          data-pulso
          className="boton gap-1.5 bg-marca px-3.5 py-1.5 text-sm font-medium text-sobre-marca"
          aria-label={`Ver mi pedido, ${botellas} ${botellas === 1 ? "botella" : "botellas"}`}
        >
          <Botella />
          <span>Pedido</span>
          <span className="tabular-nums">{botellas}</span>
        </Link>
      ) : (
        /* Reserva el ancho del botón para que el título no se descentre al
           agregar la primera botella. */
        <span className="boton-icono" aria-hidden />
      )}
    </header>
  );
}

function Flecha() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M12.5 16 6.5 10l6-6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Botella() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M6.5 1.5h3v3l1.6 2.1a3 3 0 0 1 .6 1.8v5.1a1 1 0 0 1-1 1h-5.4a1 1 0 0 1-1-1V8.4a3 3 0 0 1 .6-1.8L6.5 4.5v-3Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}
