import { notFound } from "next/navigation";
import { obtenerCatalogo } from "@/lib/catalogo";
import { obtenerEvento } from "@/lib/eventos";
import { Resultados } from "./resultados";

export default async function PaginaResultados({ params }: PageProps<"/[evento]/resultados">) {
  const { evento: slug } = await params;
  const evento = await obtenerEvento(slug);

  if (!evento) notFound();

  // El catálogo entero viaja una vez y el puntaje se calcula en el cliente.
  const catalogo = await obtenerCatalogo(evento.id);

  return <Resultados slug={evento.slug} catalogo={catalogo} moneda={evento.moneda} />;
}
