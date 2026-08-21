"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmarEdad, rutaSiguiente } from "@/lib/sesion";
import { guardarVista } from "@/lib/vista";
import { useSesion, useSincronizacion } from "@/lib/usar-sesion";

export function Entrada({ slug, eventoId }: { slug: string; eventoId: string }) {
  const router = useRouter();
  const sesion = useSesion(slug);
  const [ocupado, setOcupado] = useState(false);

  useSincronizacion(slug);

  const dentro = sesion?.edadConfirmada === true;

  /**
   * Se navega al confirmar, que es una acción del usuario. Antes esto era un
   * efecto atado a "hay sesión", y entonces volver a esta pantalla desde
   * resultados la mostraba un instante y rebotaba de vuelta. Una pantalla a la
   * que no se puede volver rompe el botón de atrás.
   */
  async function alConfirmar(ruta: string | null) {
    setOcupado(true);
    // No espera a la red: confirmarEdad resuelve con la sesión ya en local.
    const s = await confirmarEdad(slug, eventoId);
    router.push(ruta ?? rutaSiguiente(slug, s));
  }

  // undefined es "todavía no se sabe" (servidor e hidratación). Se reserva el
  // alto de los controles para no parpadear el gate a quien ya lo pasó ni
  // saltar el layout: recargar no vuelve a pedir la edad.
  if (sesion === undefined) return <div className="h-[150px]" aria-hidden />;

  if (dentro && sesion) {
    return (
      <div className="flex flex-col gap-3">
        <Link
          href={rutaSiguiente(slug, sesion)}
          // El modo de vista se fija al salir, no se hereda: si no, este botón
          // deja en el catálogo a quien pidió sus sugerencias.
          onClick={() => guardarVista(slug, { todo: false })}
          className="boton boton-primario w-full text-base"
        >
          {sesion.perfilId ? "Volver a mis sugerencias" : "Descubrir mi vino"}
        </Link>
        <Link
          href={`/${slug}/resultados`}
          onClick={() => guardarVista(slug, { todo: true })}
          className="boton w-full px-6 py-2 text-sm text-hueso-suave underline underline-offset-4"
        >
          Ver el catálogo completo
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => alConfirmar(null)}
        disabled={ocupado}
        className="boton boton-primario w-full text-base"
      >
        Tengo 18 años o más
      </button>

      {/* Para quien no quiere el quiz. También confirma la edad: sin eso no se
          muestra catálogo, y el texto de abajo lo dice. */}
      <button
        type="button"
        onClick={() => {
          guardarVista(slug, { todo: true });
          void alConfirmar(`/${slug}/resultados`);
        }}
        disabled={ocupado}
        className="boton w-full px-6 py-2 text-sm text-hueso-suave underline underline-offset-4"
      >
        Ver el catálogo completo
      </button>

      <p className="text-center text-sm text-hueso-suave text-balance">
        Esta feria sirve alcohol. Con cualquiera de las dos opciones confirmas que eres mayor
        de 18 años.
      </p>
    </div>
  );
}
