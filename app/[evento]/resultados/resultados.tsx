"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import type { ProductoCatalogo } from "@/lib/catalogo";
import { simboloMoneda } from "@/lib/moneda";
import { describirPerfil } from "@/lib/recomendacion";
import { seleccionarSugerencias } from "@/lib/sugerencias";
import {
  useExigeEdad,
  usePerfil,
  useReconciliarPedido,
  useSincronizacion,
  useVista,
} from "@/lib/usar-sesion";
import { registrarSugerencias } from "@/lib/analitica";
import { filtrar, guardarVista } from "@/lib/vista";
import { Encabezado } from "../encabezado";
import { Esqueleto } from "../esqueleto";
import { Precalentar } from "../precalentar";
import { TarjetaVino } from "../tarjeta-vino";
import { Filtros } from "./filtros";

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
  const vista = useVista(slug);
  useSincronizacion(slug);
  useReconciliarPedido(catalogo, slug);

  // Todo el trabajo pasa aquí, sobre el catálogo que ya está en memoria: sin
  // red de por medio y sin spinner.
  const calculo = useMemo(
    () => (perfil ? seleccionarSugerencias(catalogo, perfil.perfil) : null),
    [catalogo, perfil],
  );

  const filtrado = useMemo(
    () =>
      vista
        ? filtrar(catalogo, vista).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
        : [],
    [catalogo, vista],
  );

  /**
   * Las fichas a guardar, en orden de probabilidad de que se abran: primero lo
   * que la persona tiene en pantalla, después el resto del catálogo. Con un
   * catálogo chico entra entero; con uno grande, el presupuesto corta y lo que
   * se guarda es lo que más se va a usar.
   *
   * No usa `sugiriendo`, que se calcula más abajo: los hooks tienen que correr
   * siempre, también en los renders que salen temprano.
   */
  const rutasAGuardar = useMemo(() => {
    const enPantalla =
      calculo && !vista?.todo
        ? calculo.lista.map((s) => s.producto.id)
        : filtrado.slice(0, 12).map((p) => p.id);

    const orden = [...new Set([...enPantalla, ...catalogo.map((p) => p.id)])];
    return orden.map((id) => `/${slug}/vino/${id}`);
  }, [calculo, catalogo, filtrado, slug, vista]);

  /**
   * Lo que el motor propuso, para poder compararlo después con lo que la gente
   * eligió. Se registra al mostrarlo, no al calcularlo, porque una sugerencia
   * que nadie llegó a ver no dice nada.
   */
  useEffect(() => {
    if (!perfil || !calculo || vista?.todo) return;

    registrarSugerencias(
      slug,
      perfil.creadoEn,
      calculo.lista.map((s) => ({ productoId: s.producto.id, score: s.score })),
    );
  }, [calculo, perfil, slug, vista]);

  const zonas = useMemo(
    () => [...new Set(catalogo.map((p) => p.zona).filter((z): z is string => !!z))].sort(),
    [catalogo],
  );

  if (sesion === undefined || perfil === undefined || vista === undefined) return <Esqueleto />;
  if (!sesion?.edadConfirmada) return null;

  // Sin perfil no hay sugerencias que mostrar: solo existe el catálogo.
  const sugiriendo = calculo !== null && !vista.todo;
  const vacio = catalogo.length === 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))]">
      <Encabezado slug={slug} volverA={`/${slug}`} />
      <Precalentar rutas={rutasAGuardar} />

      <header className="pt-5">
        <h1 className="text-2xl font-medium tracking-tight">
          {sugiriendo ? "Mis sugerencias" : "Todo el catálogo"}
        </h1>

        {sugiriendo && perfil && (
          <p className="mt-2 text-sm text-hueso-suave">
            {describirPerfil(perfil.perfil, simboloMoneda(moneda))}
          </p>
        )}
      </header>

      {vacio ? (
        /* El estado vacío también necesita una salida: le va a pasar al cliente
           montando la feria antes de importar el catálogo. */
        <div className="mt-10">
          <p className="text-hueso-suave text-pretty">
            Todavía no hay vinos cargados para esta feria. Vuelve a intentarlo en un rato.
          </p>
          <Link href="/" className="boton boton-secundario mt-6 w-full text-sm">
            Ver otras ferias
          </Link>
        </div>
      ) : (
        <>
          {sugiriendo ? (
            <>
              {calculo?.ampliada && (
                <p className="mt-4 rounded-xl border border-borde bg-superficie-alta px-4 py-3 text-sm text-hueso-suave">
                  Ampliamos la búsqueda para mostrarte más opciones.
                </p>
              )}

              <ul className="mt-4 flex flex-col gap-3">
                {calculo!.lista.map((s) => (
                  <li key={s.producto.id}>
                    <TarjetaVino
                      slug={slug}
                      producto={s.producto as ProductoCatalogo}
                      moneda={moneda}
                      razones={s.razones}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <Filtros slug={slug} vista={vista} zonas={zonas} encontrados={filtrado.length} />

              {filtrado.length === 0 ? (
                <p className="mt-8 text-sm text-hueso-suave text-pretty">
                  Prueba con otro nombre, o quita algún filtro para ver más vinos.
                </p>
              ) : (
                <ul className="mt-4 flex flex-col gap-3">
                  {filtrado.map((p) => (
                    <li key={p.id}>
                      <TarjetaVino slug={slug} producto={p} moneda={moneda} />
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          <div className="mt-8 flex flex-col gap-3 border-t border-borde pt-6">
            {/* Con borde y no en rojo: en esta pantalla el color de marca es del
                pedido, que es lo que hay que poder encontrar rápido. */}
            <Link href={`/${slug}/quiz`} className="boton boton-secundario w-full text-sm">
              {perfil ? "Cambiar mis respuestas" : "Responder el quiz"}
            </Link>

            {perfil && (
              <button
                type="button"
                onClick={() => guardarVista(slug, { todo: !vista.todo })}
                className="boton text-sm text-hueso-suave underline underline-offset-4"
              >
                {sugiriendo ? "Ver todo el catálogo" : "Ver mis sugerencias"}
              </button>
            )}
          </div>
        </>
      )}
    </main>
  );
}
