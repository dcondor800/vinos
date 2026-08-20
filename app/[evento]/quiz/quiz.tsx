"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { guardarPerfil } from "@/lib/perfil";
import { useExigeEdad, usePerfil, useSincronizacion } from "@/lib/usar-sesion";
import type { TipoVino } from "@/lib/recomendacion";
import {
  aPerfil,
  aRespuestas,
  construirPreguntas,
  RESPUESTAS_VACIAS,
  SIN_PREFERENCIA,
  type Opcion,
  type Respuestas,
} from "./preguntas";

/**
 * Espera a saber si hay sesión y perfil antes de montar los pasos, para que el
 * estado inicial del cuestionario salga ya prellenado de localStorage sin un
 * efecto de sincronización.
 */
export function Quiz({ slug, moneda }: { slug: string; moneda: string | null }) {
  const sesion = useExigeEdad(slug);
  const perfil = usePerfil(slug);
  useSincronizacion(slug);

  if (sesion === undefined || perfil === undefined) return <Espera />;
  // useExigeEdad ya está redirigiendo a la entrada.
  if (!sesion?.edadConfirmada) return null;

  return (
    <Pasos
      key={perfil?.id ?? "nuevo"}
      slug={slug}
      moneda={moneda}
      inicial={perfil ? aRespuestas(perfil.perfil) : RESPUESTAS_VACIAS}
      // Quien ya tiene perfil viene de sus resultados y ahí tiene que volver.
      // Mandarlo a la entrada no sirve: esa pantalla lo rebota hacia adelante.
      salida={perfil ? `/${slug}/resultados` : `/${slug}`}
      etiquetaSalida={perfil ? "Volver" : "Salir"}
    />
  );
}

function Espera() {
  return <div className="flex-1" aria-hidden />;
}

function Pasos({
  slug,
  moneda,
  inicial,
  salida,
  etiquetaSalida,
}: {
  slug: string;
  moneda: string | null;
  inicial: Respuestas;
  salida: string;
  etiquetaSalida: string;
}) {
  const router = useRouter();
  const preguntas = useMemo(() => construirPreguntas(moneda), [moneda]);

  const [indice, setIndice] = useState(0);
  const [respuestas, setRespuestas] = useState<Respuestas>(inicial);
  // La pregunta entra desde el lado hacia el que se movió el cuestionario.
  const [direccion, setDireccion] = useState<"adelante" | "atras">("adelante");
  // Evita que un doble toque salte dos pasos mientras corre la pausa visual.
  const avanzando = useRef(false);

  const pregunta = preguntas[indice];
  const total = preguntas.length;
  const esUltima = indice === total - 1;
  const valorActual = respuestas[pregunta.clave];

  function avanzar(r: Respuestas) {
    if (!esUltima) {
      setDireccion("adelante");
      setIndice(indice + 1);
      avanzando.current = false;
      return;
    }
    // El perfil queda en localStorage antes de navegar; la fila en `perfiles`
    // se sube por detrás.
    guardarPerfil(slug, aPerfil(r));
    router.replace(`/${slug}/resultados`);
  }

  function elegirUnica(valor: Opcion["valor"]) {
    if (avanzando.current) return;
    avanzando.current = true;

    const siguientes = { ...respuestas, [pregunta.clave]: valor } as Respuestas;
    setRespuestas(siguientes);
    // Pausa corta: la selección se ve antes de que cambie la pantalla.
    window.setTimeout(() => avanzar(siguientes), 160);
  }

  function alternar(valor: Opcion["valor"]) {
    const actual = (valorActual as string[]) ?? [];
    const v = String(valor);

    let siguiente: string[];
    if (v === SIN_PREFERENCIA) {
      // "Me da igual" es excluyente: no se combina con tipos concretos.
      siguiente = actual.includes(SIN_PREFERENCIA) ? [] : [SIN_PREFERENCIA];
    } else {
      const limpio = actual.filter((x) => x !== SIN_PREFERENCIA && x !== v);
      siguiente = actual.includes(v) ? limpio : [...limpio, v];
    }

    setRespuestas({ ...respuestas, [pregunta.clave]: siguiente as TipoVino[] });
  }

  function retroceder() {
    avanzando.current = false;
    setDireccion("atras");
    setIndice(indice - 1);
  }

  const seleccionada = (o: Opcion) =>
    Array.isArray(valorActual)
      ? (valorActual as string[]).includes(String(o.valor))
      : valorActual === o.valor;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      {/* El atrás del quiz retrocede de pregunta mientras haya preguntas
          detrás; en la primera sale del cuestionario. Por eso no usa el
          Encabezado compartido: aquí "volver" significa otra cosa. */}
      <header className="sticky top-0 z-10 -mx-6 bg-superficie/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-2">
          {indice === 0 ? (
            <Link
              href={salida}
              aria-label={etiquetaSalida}
              className="boton boton-icono -ml-1 text-hueso-suave"
            >
              <Flecha />
            </Link>
          ) : (
            <button
              type="button"
              onClick={retroceder}
              aria-label="Pregunta anterior"
              className="boton boton-icono -ml-1 text-hueso-suave"
            >
              <Flecha />
            </button>
          )}

          <span className="flex-1 text-center text-sm text-hueso-suave tabular-nums">
            {indice + 1} de {total}
          </span>

          <span className="boton-icono" aria-hidden />
        </div>

        <div className="mt-1 h-1 overflow-hidden rounded-full bg-borde">
          {/* scaleX en vez de width: la anchura dispara layout en cada paso. */}
          <div
            className="h-full origin-left rounded-full bg-marca transition-transform duration-300 ease-out"
            style={{ transform: `scaleX(${(indice + 1) / total})` }}
          />
        </div>
      </header>

      <div key={indice} data-paso={direccion} className="flex flex-1 flex-col">
        <h1 className="mt-8 text-3xl leading-tight font-medium tracking-tight text-balance">
          {pregunta.titulo}
        </h1>
        {pregunta.pista && <p className="mt-2 text-sm text-hueso-suave">{pregunta.pista}</p>}

        <div className="mt-7 flex flex-col gap-2.5">
        {pregunta.opciones.map((o) => (
          <button
            key={String(o.valor)}
            type="button"
            aria-pressed={pregunta.multiple ? seleccionada(o) : undefined}
            onClick={() => (pregunta.multiple ? alternar(o.valor) : elegirUnica(o.valor))}
            className={`boton justify-between rounded-2xl border px-5 py-4 text-left text-base ${
              seleccionada(o)
                ? "border-marca-borde bg-marca-suave"
                : "border-borde bg-superficie-alta active:bg-borde"
            }`}
          >
            {o.etiqueta}
            {pregunta.multiple && (
              <span
                aria-hidden
                className={`ml-3 grid size-5 shrink-0 place-items-center rounded-full border text-[11px] ${
                  seleccionada(o) ? "border-marca bg-marca text-sobre-marca" : "border-borde"
                }`}
              >
                {seleccionada(o) ? "✓" : ""}
              </span>
            )}
          </button>
        ))}
      </div>

        {/* Las de selección múltiple no avanzan solas: hace falta confirmar. */}
        {pregunta.multiple && (
          <div className="sticky bottom-0 -mx-6 mt-auto bg-superficie px-6 pt-6 pb-2">
            <button
              type="button"
              onClick={() => avanzar(respuestas)}
              className="boton boton-primario w-full text-base"
            >
              {esUltima ? "Ver mis vinos" : "Continuar"}
            </button>
          </div>
        )}
      </div>
    </main>
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
