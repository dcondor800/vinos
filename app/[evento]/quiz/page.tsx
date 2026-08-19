import { notFound } from "next/navigation";
import { obtenerEvento } from "@/lib/eventos";
import { Quiz } from "./quiz";

export default async function PaginaQuiz({ params }: PageProps<"/[evento]/quiz">) {
  const { evento: slug } = await params;
  const evento = await obtenerEvento(slug);

  if (!evento) notFound();

  return <Quiz slug={evento.slug} moneda={evento.moneda} />;
}
