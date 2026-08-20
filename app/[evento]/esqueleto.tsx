/**
 * Marca de agua del contenido mientras se resuelve. Antes estas pantallas
 * devolvían un hueco vacío, que en un teléfono lento se ve igual que una app
 * rota. Tiene la forma de lo que viene, así que además evita el salto de layout
 * cuando llega el contenido de verdad.
 */
export function Esqueleto({ filas = 4 }: { filas?: number }) {
  return (
    <div className="mx-auto w-full max-w-md flex-1 px-6 pt-6" aria-hidden>
      <div className="h-7 w-40 animate-pulse rounded-lg bg-superficie-alta" />
      <div className="mt-3 h-4 w-56 animate-pulse rounded-lg bg-superficie-alta" />

      <div className="mt-8 flex flex-col gap-3">
        {Array.from({ length: filas }, (_, i) => (
          <div key={i} className="flex gap-4 rounded-2xl border border-borde p-3">
            <div className="size-24 shrink-0 animate-pulse rounded-xl bg-superficie-alta" />
            <div className="flex-1 pt-1">
              <div className="h-5 w-3/4 animate-pulse rounded bg-superficie-alta" />
              <div className="mt-2 h-4 w-1/2 animate-pulse rounded bg-superficie-alta" />
              <div className="mt-4 h-4 w-1/3 animate-pulse rounded bg-superficie-alta" />
            </div>
          </div>
        ))}
      </div>

      <span className="sr-only">Cargando</span>
    </div>
  );
}
