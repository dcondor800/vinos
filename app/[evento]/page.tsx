import Image from "next/image";
import { notFound } from "next/navigation";
import { obtenerEvento } from "@/lib/eventos";
import { Entrada } from "./entrada";

/** "18 al 21 de agosto" cuando cae en el mismo mes. */
function rangoFechas(inicio: string, fin: string): string {
  // Mediodía: parsear "YYYY-MM-DD" como UTC corre el día hacia atrás en Lima.
  const a = new Date(`${inicio}T12:00:00`);
  const b = new Date(`${fin}T12:00:00`);

  const dia = new Intl.DateTimeFormat("es-PE", { day: "numeric" });
  const completo = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long" });

  if (inicio === fin) return completo.format(a);

  return a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()
    ? `${dia.format(a)} al ${completo.format(b)}`
    : `${completo.format(a)} al ${completo.format(b)}`;
}

export default async function PaginaEntrada({ params }: PageProps<"/[evento]">) {
  const { evento: slug } = await params;
  const evento = await obtenerEvento(slug);

  if (!evento) notFound();

  const contexto = [evento.sede, rangoFechas(evento.fecha_inicio, evento.fecha_fin)]
    .filter(Boolean)
    .join(" · ");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pt-16 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
      <header>
        {evento.logo_url && (
          <Image
            src={evento.logo_url}
            alt={evento.nombre}
            width={160}
            height={64}
            className="mb-8 h-16 w-auto object-contain object-left"
            priority
          />
        )}
        <h1 className="font-serif text-4xl leading-tight text-balance">{evento.nombre}</h1>
        {contexto && <p className="mt-3 text-sm text-hueso-suave">{contexto}</p>}
      </header>

      <p className="mt-8 text-lg leading-relaxed text-pretty">
        Cuéntanos qué te gusta y te decimos cuáles probar, de entre los vinos que están hoy
        aquí. Te decimos también en qué stand encontrarlos.
      </p>

      {/* La acción vive abajo: se alcanza con el pulgar, de pie y con una copa en la otra mano. */}
      <div className="mt-auto pt-12">
        <Entrada slug={evento.slug} eventoId={evento.id} />
      </div>
    </main>
  );
}
