"use client";

import { useMemo } from "react";
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

  if (sesion === undefined || perfil === undefined) return <div className="flex-1" aria-hidden />;
  if (!sesion?.edadConfirmada) return null;

  const porNombre = [...catalogo].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="border-b border-borde pb-5">
        <h1 className="text-2xl font-medium tracking-tight">
          {calculo ? "Para ti" : "Catálogo completo"}
        </h1>

        {perfil ? (
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 text-sm text-hueso-suave">
            <span>{describirPerfil(perfil.perfil, simboloMoneda(moneda))}</span>
            <Link href={`/${slug}/quiz`} className="underline underline-offset-4">
              Cambiar
            </Link>
          </p>
        ) : (
          <p className="mt-1.5 text-sm text-hueso-suave">
            {catalogo.length} vinos en la feria.{" "}
            <Link href={`/${slug}/quiz`} className="underline underline-offset-4">
              Responde 5 preguntas
            </Link>{" "}
            y te decimos cuáles probar.
          </p>
        )}
      </header>

      {calculo?.ampliada && (
        <p className="mt-4 rounded-xl border border-borde bg-superficie-alta px-4 py-3 text-sm text-hueso-suave">
          Ampliamos la búsqueda para mostrarte más opciones.
        </p>
      )}

      <ul className="mt-4 flex flex-col gap-3">
        {calculo
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

      {catalogo.length === 0 && (
        <p className="mt-8 text-sm text-hueso-suave">
          Todavía no hay vinos cargados para esta feria.
        </p>
      )}
    </main>
  );
}
