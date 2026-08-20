"use client";

import Link from "next/link";

/**
 * El fallo más probable de toda la app: el catálogo se lee de Supabase en cada
 * visita y la señal de un centro de convenciones cae en el momento pico. Antes
 * eso terminaba en la página de error de Next, sin estilo y sin salida.
 *
 * No se muestra el error técnico: a alguien de pie con una copa no le sirve, y
 * lo único accionable es reintentar.
 */
export default function ErrorEvento({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl text-balance">No pudimos cargar el catálogo</h1>
      <p className="mt-3 text-hueso-suave text-pretty">
        Suele ser la conexión del salón. Vuelve a intentarlo; si sigue fallando, acércate a un
        stand y pregunta por el vino que te interesa.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        <button type="button" onClick={reset} className="boton boton-primario w-full text-base">
          Reintentar
        </button>
        <Link href="/" className="boton boton-secundario w-full text-sm">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
