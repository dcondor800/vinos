"use client";

import type { TipoVino } from "@/lib/recomendacion";
import { guardarVista, type Vista } from "@/lib/vista";

const TIPOS: { valor: TipoVino; etiqueta: string }[] = [
  { valor: "tinto", etiqueta: "Tinto" },
  { valor: "blanco", etiqueta: "Blanco" },
  { valor: "rosado", etiqueta: "Rosado" },
  { valor: "espumante", etiqueta: "Espumante" },
  { valor: "dulce", etiqueta: "Dulce" },
];

/**
 * Buscador y filtros del catálogo completo. Con 106 vinos, desplazarse era la
 * única forma de encontrar algo: imposible de pie y con una copa en la mano.
 *
 * El campo va arriba del todo y la lista debajo, para que el teclado del
 * teléfono no tape lo que se está filtrando.
 *
 * Los dos filtros se muestran distinto a propósito. El tipo va en chips a la
 * vista porque es el que casi todo el mundo usa y se reconoce sin leer. La zona
 * va en un desplegable del sistema porque son ocho en esta feria y podrían ser
 * veinte en otra: en chips ocuparía media pantalla. Ninguno de los dos se
 * desplaza en horizontal, que escondía opciones sin avisar y peleaba con el
 * desplazamiento de la lista.
 */
export function Filtros({
  slug,
  vista,
  zonas,
  encontrados,
}: {
  slug: string;
  vista: Vista;
  zonas: string[];
  encontrados: number;
}) {
  const hayFiltro = vista.busqueda !== "" || vista.tipo !== null || vista.zona !== null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <input
        type="search"
        inputMode="search"
        value={vista.busqueda}
        onChange={(e) => guardarVista(slug, { busqueda: e.target.value })}
        placeholder="Buscar vino, bodega o cepa"
        aria-label="Buscar vino, bodega o cepa"
        className="w-full rounded-full border border-borde bg-superficie-alta px-5 py-3 text-base outline-none placeholder:text-hueso-suave focus:border-marca-borde"
      />

      <div role="group" aria-label="Tipo de vino" className="flex flex-wrap gap-2">
        {TIPOS.map((t) => {
          const activo = vista.tipo === t.valor;

          return (
            <button
              key={t.valor}
              type="button"
              aria-pressed={activo}
              // Volver a tocar el chip activo lo quita: no hace falta un "todos".
              onClick={() => guardarVista(slug, { tipo: activo ? null : t.valor })}
              className={`boton rounded-full border px-4 py-1.5 text-sm ${
                activo ? "border-marca-borde bg-marca-suave" : "border-borde text-hueso-suave"
              }`}
            >
              {activo && (
                <span aria-hidden className="-ml-1">
                  ✓
                </span>
              )}
              {t.etiqueta}
            </button>
          );
        })}
      </div>

      {zonas.length > 1 && (
        <div className="relative">
          <select
            value={vista.zona ?? ""}
            onChange={(e) => guardarVista(slug, { zona: e.target.value || null })}
            aria-label="Zona del salón"
            className={`w-full appearance-none rounded-full border py-3 pr-11 pl-5 text-base outline-none ${
              vista.zona
                ? "border-marca-borde bg-marca-suave text-hueso"
                : "border-borde bg-superficie-alta text-hueso-suave"
            }`}
          >
            <option value="">Todas las zonas</option>
            {zonas.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>

          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-5 flex items-center text-hueso-suave"
          >
            ▾
          </span>
        </div>
      )}

      <p className="text-sm text-hueso-suave">
        {encontrados === 0
          ? "Ningún vino coincide."
          : `${encontrados} ${encontrados === 1 ? "vino" : "vinos"}`}
        {hayFiltro && (
          <button
            type="button"
            onClick={() => guardarVista(slug, { busqueda: "", tipo: null, zona: null })}
            className="ml-3 underline underline-offset-4"
          >
            Quitar filtros
          </button>
        )}
      </p>
    </div>
  );
}
