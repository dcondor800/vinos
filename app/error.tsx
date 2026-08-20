"use client";

/**
 * Red de seguridad para todo lo que no cuelga de un evento. Sin esto, cualquier
 * fallo de Supabase muestra la página de error de Next: fondo blanco, texto en
 * inglés y sin salida.
 */
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl">Algo salió mal</h1>
      <p className="mt-3 text-hueso-suave">
        No pudimos cargar esta pantalla. Puede ser la conexión del salón.
      </p>
      <button type="button" onClick={reset} className="boton boton-primario mt-6 w-full text-base">
        Reintentar
      </button>
    </main>
  );
}
