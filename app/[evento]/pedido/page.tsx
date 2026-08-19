import { notFound } from "next/navigation";
import { obtenerCatalogo } from "@/lib/catalogo";
import { obtenerEvento } from "@/lib/eventos";
import { Pedido } from "./pedido";

export default async function PaginaPedido({ params }: PageProps<"/[evento]/pedido"> ) {
  const { evento: slug } = await params;
  const evento = await obtenerEvento(slug);

  if (!evento) notFound();

  // El pedido guarda solo ids; los precios y stands salen del catálogo.
  const catalogo = await obtenerCatalogo(evento.id);

  return <Pedido slug={evento.slug} catalogo={catalogo} moneda={evento.moneda} />;
}
