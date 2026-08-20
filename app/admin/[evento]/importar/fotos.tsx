"use client";

import { useMemo, useState } from "react";
import { BUCKET_CATALOGO } from "@/lib/imagenes";
import type { Validacion } from "@/lib/importacion";
import { createClient } from "@/lib/supabase/client";
import { firmarSubidas } from "./acciones";

const TIPOS = ["image/jpeg", "image/png", "image/webp"];
const MAXIMO = 5 * 1024 * 1024;

export type EstadoSubida =
  | { fase: "inactivo" }
  | { fase: "subiendo"; hechas: number; total: number }
  | { fase: "listo"; subidas: number; fallidas: string[] };

/**
 * Carga de fotos en lote. El emparejamiento con cada vino no se adivina: sale
 * de la columna `foto` que la propia bodega escribió en la fila del vino. Aquí
 * solo se comprueba que el archivo declarado esté entre los que se eligieron.
 *
 * Los archivos van del navegador a Supabase directamente, con un permiso de un
 * solo uso por foto que firma el servidor. No pasan por la app: son decenas de
 * megas y una acción de servidor admite un cuerpo de 1 MB.
 */
export function Fotos({
  slug,
  clave,
  validacion,
  onSubido,
}: {
  slug: string;
  clave: string;
  validacion: Validacion | null;
  onSubido: () => void;
}) {
  const [archivos, setArchivos] = useState<File[]>([]);
  const [estado, setEstado] = useState<EstadoSubida>({ fase: "inactivo" });

  const declaradas = useMemo(
    () => (validacion?.filas ?? []).map((f) => f.foto).filter((n): n is string => !!n),
    [validacion],
  );

  const cotejo = useMemo(() => {
    const elegidos = new Map(archivos.map((a) => [a.name.trim().toLowerCase(), a]));
    const pedidas = new Set(declaradas.map((n) => n.trim().toLowerCase()));

    return {
      // Declaradas en el CSV y presentes entre los archivos elegidos.
      emparejadas: declaradas.filter((n) => elegidos.has(n.trim().toLowerCase())),
      // Declaradas pero que no se eligieron: esos vinos se quedan sin foto.
      faltantes: declaradas.filter((n) => !elegidos.has(n.trim().toLowerCase())),
      // Elegidas pero que ninguna fila pidió: sobran, no se suben.
      sobrantes: archivos.filter((a) => !pedidas.has(a.name.trim().toLowerCase())),
    };
  }, [archivos, declaradas]);

  function alElegir(e: React.ChangeEvent<HTMLInputElement>) {
    const elegidos = [...(e.target.files ?? [])].filter(
      (a) => TIPOS.includes(a.type) && a.size <= MAXIMO,
    );
    setArchivos(elegidos);
    setEstado({ fase: "inactivo" });
  }

  async function subir() {
    const porNombre = new Map(archivos.map((a) => [a.name.trim().toLowerCase(), a]));
    const aSubir = cotejo.emparejadas
      .map((n) => porNombre.get(n.trim().toLowerCase()))
      .filter((a): a is File => !!a);

    setEstado({ fase: "subiendo", hechas: 0, total: aSubir.length });

    const firmas = await firmarSubidas(clave, slug, aSubir.map((a) => a.name));
    if (!firmas) {
      setEstado({ fase: "listo", subidas: 0, fallidas: ["la clave dejó de ser válida"] });
      return;
    }

    const supabase = createClient();
    const fallidas: string[] = [];
    let hechas = 0;

    for (const firma of firmas) {
      const archivo = porNombre.get(firma.nombre.trim().toLowerCase());
      if (!archivo) continue;

      const { error } = await supabase.storage
        .from(BUCKET_CATALOGO)
        .uploadToSignedUrl(firma.ruta, firma.token, archivo, { contentType: archivo.type });

      if (error) fallidas.push(firma.nombre);
      hechas++;
      setEstado({ fase: "subiendo", hechas, total: firmas.length });
    }

    setEstado({ fase: "listo", subidas: hechas - fallidas.length, fallidas });
    onSubido();
  }

  if (!validacion || validacion.filas.length === 0) return null;

  return (
    <section className="mt-8 rounded-xl border border-borde px-4 py-4">
      <h2 className="font-medium">Fotos de las botellas</h2>

      {declaradas.length === 0 ? (
        <p className="mt-1 text-sm text-hueso-suave">
          Ninguna fila del archivo declara foto en la columna{" "}
          <code className="rounded bg-superficie px-1">foto</code>. Los vinos se cargarán sin
          imagen.
        </p>
      ) : (
        <>
          <p className="mt-1 text-sm text-hueso-suave">
            El archivo declara {declaradas.length}{" "}
            {declaradas.length === 1 ? "foto" : "fotos"}. Elige las imágenes que mandó la bodega.
          </p>

          <label className="mt-3 inline-block cursor-pointer rounded-full border border-borde px-4 py-2.5 text-sm">
            Elegir imágenes
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={alElegir}
              className="hidden"
            />
          </label>

          {archivos.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1 text-sm">
              <li>
                <span className="text-hueso-suave">Emparejadas:</span> {cotejo.emparejadas.length}
              </li>
              {cotejo.faltantes.length > 0 && (
                <li className="text-error">
                  Declaradas y no elegidas ({cotejo.faltantes.length}):{" "}
                  {cotejo.faltantes.slice(0, 6).join(", ")}
                  {cotejo.faltantes.length > 6 && "…"}
                </li>
              )}
              {cotejo.sobrantes.length > 0 && (
                <li className="text-hueso-suave">
                  Elegidas que ninguna fila pide ({cotejo.sobrantes.length}):{" "}
                  {cotejo.sobrantes
                    .slice(0, 6)
                    .map((a) => a.name)
                    .join(", ")}
                  {cotejo.sobrantes.length > 6 && "…"}
                </li>
              )}
            </ul>
          )}

          {estado.fase === "subiendo" && (
            <p className="mt-3 text-sm text-hueso-suave">
              Subiendo {estado.hechas} de {estado.total}…
            </p>
          )}

          {estado.fase === "listo" && (
            <p className="mt-3 text-sm">
              {estado.subidas} {estado.subidas === 1 ? "foto subida" : "fotos subidas"}.
              {estado.fallidas.length > 0 && (
                <span className="text-error"> Fallaron: {estado.fallidas.join(", ")}</span>
              )}
            </p>
          )}

          {cotejo.emparejadas.length > 0 && estado.fase !== "subiendo" && (
            <button
              type="button"
              onClick={subir}
              className="mt-4 rounded-full bg-marca px-6 py-3 font-medium text-sobre-marca"
            >
              Subir {cotejo.emparejadas.length}{" "}
              {cotejo.emparejadas.length === 1 ? "foto" : "fotos"}
            </button>
          )}
        </>
      )}
    </section>
  );
}
