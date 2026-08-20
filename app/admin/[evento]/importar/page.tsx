import type { Metadata } from "next";
import { COLUMNAS_REQUERIDAS, MARIDAJES } from "@/lib/importacion";
import { Importador } from "./importador";

export const metadata: Metadata = {
  title: "Importar catálogo",
  robots: { index: false, follow: false },
};

/**
 * Pantalla de operación, no del asistente: se usa desde una laptop, días antes
 * de la feria. Por eso es ancha y con tabla, no pensada para el pulgar.
 */
export default async function PaginaImportar({ params }: PageProps<"/admin/[evento]/importar">) {
  const { evento: slug } = await params;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <p className="text-xs tracking-wide text-hueso-suave uppercase">Administración</p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight">Importar catálogo</h1>
      <p className="mt-2 text-sm text-hueso-suave">
        Feria <span className="text-hueso">{slug}</span>. Un vino se identifica por bodega y
        nombre: volver a subir el mismo archivo corrige las filas en vez de duplicarlas.
      </p>

      <details className="mt-6 rounded-xl border border-borde px-4 py-3 text-sm">
        <summary className="cursor-pointer text-hueso-suave">Qué columnas debe traer el CSV</summary>
        <div className="mt-3 flex flex-col gap-2">
          <p>
            <span className="text-hueso-suave">Obligatorias:</span>{" "}
            {COLUMNAS_REQUERIDAS.join(", ")}
          </p>
          <p>
            <span className="text-hueso-suave">Opcionales:</span> zona, varietal, pais, region,
            anada, grado_alcohol, cuerpo, dulzor, acidez, taninos, notas, maridajes, descripcion,
            foto, disponible, destacado
          </p>
          <p className="text-hueso-suave">
            Las escalas van del 1 al 5 y pueden ir vacías. Las listas se separan con |. Los
            maridajes solo aceptan: {MARIDAJES.join(", ")}. En{" "}
            <span className="text-hueso">foto</span> va el nombre del archivo, no una dirección
            web: las imágenes se suben aparte y el importador las empareja con lo que declara cada
            fila.
          </p>
        </div>
      </details>

      <Importador slug={slug} evento={slug} />
    </main>
  );
}
