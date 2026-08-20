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
      <div className="relative">
        <input
          type="search"
          inputMode="search"
          value={vista.busqueda}
          onChange={(e) => guardarVista(slug, { busqueda: e.target.value })}
          placeholder="Buscar vino, bodega o cepa"
          aria-label="Buscar vino, bodega o cepa"
          className="w-full rounded-full border border-borde bg-superficie-alta px-5 py-3 text-base outline-none placeholder:text-hueso-suave focus:border-marca-borde"
        />
      </div>

      <Fila
        etiqueta="Tipo"
        opciones={TIPOS}
        activo={vista.tipo}
        alElegir={(v) => guardarVista(slug, { tipo: v as TipoVino | null })}
      />

      {zonas.length > 1 && (
        <Fila
          etiqueta="Zona"
          opciones={zonas.map((z) => ({ valor: z, etiqueta: z }))}
          activo={vista.zona}
          alElegir={(v) => guardarVista(slug, { zona: v })}
        />
      )}

      <p className="text-sm text-hueso-suave">
        {encontrados === 0
          ? "Ningún vino coincide."
          : `${encontrados} ${encontrados === 1 ? "vino" : "vinos"}`}
        {hayFiltro && (
          <button
            type="button"
            onClick={() =>
              guardarVista(slug, { busqueda: "", tipo: null, zona: null })
            }
            className="ml-3 underline underline-offset-4"
          >
            Quitar filtros
          </button>
        )}
      </p>
    </div>
  );
}

function Fila({
  etiqueta,
  opciones,
  activo,
  alElegir,
}: {
  etiqueta: string;
  opciones: { valor: string; etiqueta: string }[];
  activo: string | null;
  alElegir: (valor: string | null) => void;
}) {
  return (
    /* Se desplaza en horizontal en vez de partirse en varias líneas: la lista
       de vinos tiene que seguir viéndose sin bajar. */
    <div
      role="group"
      aria-label={etiqueta}
      className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1"
    >
      {opciones.map((o) => {
        const seleccionado = activo === o.valor;

        return (
          <button
            key={o.valor}
            type="button"
            aria-pressed={seleccionado}
            /* Volver a tocar el chip activo lo quita: no hace falta un botón
               "todos" aparte. */
            onClick={() => alElegir(seleccionado ? null : o.valor)}
            className={`boton shrink-0 rounded-full border px-4 py-1.5 text-sm ${
              seleccionado
                ? "border-marca-borde bg-marca-suave"
                : "border-borde text-hueso-suave"
            }`}
          >
            {seleccionado && (
              <span aria-hidden className="-ml-1">
                ✓
              </span>
            )}
            {o.etiqueta}
          </button>
        );
      })}
    </div>
  );
}
