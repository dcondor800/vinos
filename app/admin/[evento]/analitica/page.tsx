import type { Metadata } from "next";
import Link from "next/link";
import { Informe } from "./informe";

export const metadata: Metadata = {
  title: "Informe de la feria",
  robots: { index: false, follow: false },
};

/**
 * Pantalla del organizador, no del asistente. Se mira desde una laptop después
 * del evento, así que es ancha y con tablas.
 */
export default async function PaginaAnalitica({
  params,
}: PageProps<"/admin/[evento]/analitica">) {
  const { evento: slug } = await params;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <p className="text-xs tracking-wide text-hueso-suave uppercase">Administración</p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight">Informe de la feria</h1>
      <p className="mt-2 text-sm text-hueso-suave">
        Feria <span className="text-hueso">{slug}</span>. Qué buscó la gente contra qué había en
        el catálogo.{" "}
        <Link href={`/admin/${slug}/importar`} className="underline underline-offset-4">
          Importar catálogo
        </Link>
      </p>

      <Informe slug={slug} />
    </main>
  );
}
