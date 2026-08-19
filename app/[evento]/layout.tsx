import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { obtenerEvento } from "@/lib/eventos";
import { variablesDeTema } from "@/lib/tema";

type Props = { params: Promise<{ evento: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { evento: slug } = await params;
  const evento = await obtenerEvento(slug);

  if (!evento) return { title: "Evento no encontrado" };

  return {
    title: evento.nombre,
    description: `Encuentra tu vino entre los que están en ${evento.nombre}.`,
  };
}

export default async function LayoutEvento({
  children,
  params,
}: LayoutProps<"/[evento]">) {
  const { evento: slug } = await params;
  const evento = await obtenerEvento(slug);

  // Slug inexistente o evento inactivo: la misma respuesta, no hay por qué
  // distinguirlos de cara al público.
  if (!evento) notFound();

  return (
    <div
      className="flex min-h-full flex-1 flex-col"
      style={variablesDeTema(evento.color_primario)}
    >
      {children}
    </div>
  );
}
