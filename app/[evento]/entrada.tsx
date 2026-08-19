"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { confirmarEdad, rutaSiguiente } from "@/lib/sesion";
import { useSesion, useSincronizacion } from "@/lib/usar-sesion";

export function Entrada({ slug, eventoId }: { slug: string; eventoId: string }) {
  const router = useRouter();
  const sesion = useSesion(slug);
  const [ocupado, setOcupado] = useState(false);

  // Adónde ir tras confirmar. Null = a donde toque según el perfil.
  const destino = useRef<string | null>(null);

  useSincronizacion(slug);

  const dentro = sesion?.edadConfirmada === true;

  // Quien ya pasó el gate no vuelve a ver esta pantalla: va al quiz, o a sus
  // resultados si ya lo respondió.
  useEffect(() => {
    if (sesion && dentro) router.replace(destino.current ?? rutaSiguiente(slug, sesion));
  }, [router, slug, sesion, dentro]);

  async function alConfirmar(ruta: string | null) {
    destino.current = ruta;
    setOcupado(true);
    // No espera a la red: confirmarEdad resuelve con la sesión ya en local.
    await confirmarEdad(slug, eventoId);
  }

  // undefined es "todavía no se sabe" (servidor e hidratación). Se reserva el
  // alto de los controles para no parpadear el gate a quien ya lo pasó ni
  // saltar el layout: recargar no vuelve a pedir la edad.
  if (sesion === undefined || dentro) return <div className="h-[150px]" aria-hidden />;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => alConfirmar(null)}
        disabled={ocupado}
        className="w-full rounded-full bg-marca px-6 py-4 text-base font-medium text-sobre-marca transition-opacity active:opacity-80 disabled:opacity-60"
      >
        Tengo 18 años o más
      </button>

      {/* Para quien no quiere el quiz. También confirma la edad: sin eso no se
          muestra catálogo, y el texto de abajo lo dice. */}
      <button
        type="button"
        onClick={() => alConfirmar(`/${slug}/resultados`)}
        disabled={ocupado}
        className="w-full px-6 py-2 text-sm text-hueso-suave underline underline-offset-4 disabled:opacity-60"
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
