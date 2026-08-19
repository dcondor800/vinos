"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ProductoCatalogo } from "@/lib/catalogo";
import { simboloMoneda } from "@/lib/moneda";
import { describirPerfil, recomendar } from "@/lib/recomendacion";
import { useExigeEdad, usePerfil, useSincronizacion } from "@/lib/usar-sesion";
import { TarjetaVino } from "../tarjeta-vino";

/**
 * Score mínimo para considerar que un vino de verdad encaja con el perfil. El
 * motor puntúa todo el catálogo, así que sin este corte "sugerencias" y
 * "catálogo completo" serían la misma lista en distinto orden.
 */
const UMBRAL = 55;
const MAXIMO = 12;

export function Resultados({
  slug,
  catalogo,
  moneda,
}: {
  slug: string;
  catalogo: ProductoCatalogo[];
  moneda: string | null;
}) {
  const sesion = useExigeEdad(slug);
  const perfil = usePerfil(slug);
  useSincronizacion(slug);

  const [verTodo, setVerTodo] = useState(false);

  const calculo = useMemo(() => {
    if (!perfil) return null;

    // Todo el trabajo pasa aquí, sobre el catálogo que ya está en memoria: sin
    // red de por medio y sin spinner.
    const todas = recomendar(catalogo, perfil.perfil, { limite: MAXIMO });
    const relevantes = todas.filter((s) => s.score >= UMBRAL);

    // Menos de 4 encajes reales: se muestra lo mejor que haya y se avisa.
    const ampliada = relevantes.length < 4 && todas.length > relevantes.length;

    return { lista: ampliada ? todas : relevantes, ampliada };
  }, [catalogo, perfil]);

  const porNombre = useMemo(
    () => [...catalogo].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    [catalogo],
  );

  if (sesion === undefined || perfil === undefined) return <div className="flex-1" aria-hidden />;
  if (!sesion?.edadConfirmada) return null;

  const sugiriendo = calculo !== null && !verTodo;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="border-b border-borde pb-5">
        <h1 className="text-2xl font-medium tracking-tight">
          {sugiriendo ? "Para ti" : "Catálogo completo"}
        </h1>

        {sugiriendo && perfil ? (
          // El resumen del perfil y su edición van juntos: es el camino de
          // vuelta al quiz, así que tiene que verse como un botón.
          <div className="mt-2 flex items-start justify-between gap-3">
            <p className="text-sm text-hueso-suave">
              {describirPerfil(perfil.perfil, simboloMoneda(moneda))}
            </p>
            <Link
              href={`/${slug}/quiz`}
              data-accion
              className="flex shrink-0 items-center rounded-full border border-borde px-4 text-sm transition-colors active:bg-borde"
            >
              Cambiar
            </Link>
          </div>
        ) : (
          <p className="mt-2 text-sm text-hueso-suave">
            {catalogo.length} {catalogo.length === 1 ? "vino" : "vinos"} en la feria.
          </p>
        )}
      </header>

      {sugiriendo && calculo?.ampliada && (
        <p className="mt-4 rounded-xl border border-borde bg-superficie-alta px-4 py-3 text-sm text-hueso-suave">
          Ampliamos la búsqueda para mostrarte más opciones.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {sugiriendo && calculo
          ? calculo.lista.map((s) => (
              <li key={s.producto.id}>
                <TarjetaVino
                  slug={slug}
                  producto={s.producto as ProductoCatalogo}
                  moneda={moneda}
                  razones={s.razones}
                />
              </li>
            ))
          : porNombre.map((p) => (
              <li key={p.id}>
                <TarjetaVino slug={slug} producto={p} moneda={moneda} />
              </li>
            ))}
      </ul>

      {catalogo.length === 0 ? (
        <p className="mt-8 text-sm text-hueso-suave">
          Todavía no hay vinos cargados para esta feria.
        </p>
      ) : (
        /* Repetido al final: tras desplazarse la cabecera ya no está a la vista,
           y hay que poder rehacer el quiz sin volver arriba. */
        <div className="mt-8 flex flex-col gap-3 border-t border-borde pt-6">
          <Link
            href={`/${slug}/quiz`}
            data-accion
            className="flex w-full items-center justify-center rounded-full border border-borde px-6 py-3.5 text-sm transition-colors active:bg-borde"
          >
            {perfil ? "Cambiar mis respuestas" : "Responder el quiz"}
          </Link>

          {perfil && (
            <button
              type="button"
              onClick={() => setVerTodo(!verTodo)}
              className="text-sm text-hueso-suave underline underline-offset-4"
            >
              {sugiriendo ? "Ver el catálogo completo" : "Ver mis sugerencias"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
