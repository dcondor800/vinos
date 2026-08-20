import Link from "next/link";
import { listarEventos } from "@/lib/eventos";

/**
 * Bienvenida. En el evento se entra por el QR, que apunta directo a /[evento];
 * esta pantalla es para quien llega al dominio pelado. Con una sola feria
 * activa lleva a ella de una vez, y si hay varias las lista, porque la app es
 * multi-tenant y no puede adivinar cuál es.
 */
export default async function Raiz() {
  const eventos = await listarEventos();
  const unico = eventos.length === 1 ? eventos[0] : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-20 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <header>
        <h1 className="font-serif text-5xl leading-none">Vinos</h1>
        <p className="mt-5 text-lg leading-relaxed text-pretty">
          Dinos qué te gusta y te decimos cuáles probar, de entre los vinos que están hoy en
          la feria. Con el stand donde encontrarlos.
        </p>
      </header>

      <div className="mt-auto pt-12">
        {unico ? (
          <>
            <Link
              href={`/${unico.slug}`}
              className="boton boton-primario w-full text-base"
            >
              Empezar
            </Link>
            <p className="mt-4 text-center text-sm text-hueso-suave">{unico.nombre}</p>
          </>
        ) : eventos.length > 1 ? (
          <>
            <p className="mb-3 text-sm text-hueso-suave">Elige tu feria</p>
            <ul className="flex flex-col gap-2.5">
              {eventos.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/${e.slug}`}
                    className="boton w-full justify-between rounded-2xl border border-borde bg-superficie-alta px-5 py-4 active:bg-borde"
                  >
                    <span className="font-serif text-lg">{e.nombre}</span>
                    <span aria-hidden className="text-hueso-suave">
                      →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-hueso-suave">
            No hay ninguna feria activa en este momento.
          </p>
        )}
      </div>
    </main>
  );
}
