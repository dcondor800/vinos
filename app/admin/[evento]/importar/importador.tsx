"use client";

import { useState } from "react";
import Link from "next/link";
import { plantillaCsv, type Validacion } from "@/lib/importacion";
import { importarCatalogo, revisarCsv, verificarClave, type ResumenImportacion } from "./acciones";
import { Fotos } from "./fotos";

const CLAVE_SESION = "vinos:clave-importador";

export function Importador({ slug, evento }: { slug: string; evento: string }) {
  const [clave, setClave] = useState("");
  const [autorizado, setAutorizado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (await verificarClave(clave)) {
      sessionStorage.setItem(CLAVE_SESION, clave);
      setAutorizado(true);
    } else {
      setError("La clave no es correcta.");
    }
  }

  if (!autorizado) {
    return (
      <form onSubmit={entrar} className="mt-10 flex flex-col gap-3">
        <label htmlFor="clave" className="text-sm text-hueso-suave">
          Clave del importador
        </label>
        <input
          id="clave"
          type="password"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          autoComplete="off"
          className="rounded-xl border border-borde bg-superficie-alta px-4 py-3 outline-none focus:border-marca-borde"
        />
        {error && <p className="text-sm text-error">{error}</p>}
        <button
          type="submit"
          className="mt-1 rounded-full bg-marca px-6 py-3.5 font-medium text-sobre-marca"
        >
          Entrar
        </button>
      </form>
    );
  }

  return <Carga slug={slug} evento={evento} clave={clave} />;
}

function Carga({ slug, evento, clave }: { slug: string; evento: string; clave: string }) {
  const [texto, setTexto] = useState("");
  const [validacion, setValidacion] = useState<Validacion | null>(null);
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [fotosSubidas, setFotosSubidas] = useState(0);

  const listo = validacion !== null && validacion.problemas.length === 0 && validacion.faltantes.length === 0 && validacion.filas.length > 0;

  async function alArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    const contenido = await archivo.text();
    setTexto(contenido);
    await revisar(contenido);
  }

  async function revisar(contenido = texto) {
    setResumen(null);
    setError(null);
    setOcupado(true);
    const r = await revisarCsv(clave, contenido);
    setValidacion(r);
    setOcupado(false);
  }

  async function confirmar() {
    setOcupado(true);
    setError(null);

    const r = await importarCatalogo(clave, slug, texto);
    setOcupado(false);

    if (r.ok) {
      setResumen(r.resumen);
      setValidacion(null);
      setTexto("");
      return;
    }

    if (r.motivo === "validacion" && r.validacion) setValidacion(r.validacion);
    setError(
      {
        clave: "La clave dejó de ser válida.",
        evento: `No existe la feria "${slug}".`,
        validacion: r.detalle ?? "El archivo tiene errores.",
        escritura: `No se pudo escribir: ${r.detalle}`,
      }[r.motivo],
    );
  }

  function descargarPlantilla() {
    // Con BOM para que Excel abra los acentos bien al doble clic.
    const blob = new Blob([`﻿${plantillaCsv()}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `plantilla-catalogo-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <label className="cursor-pointer rounded-full border border-borde px-4 py-2.5 text-sm">
          Elegir archivo CSV
          <input type="file" accept=".csv,text/csv" onChange={alArchivo} className="hidden" />
        </label>
        <button
          type="button"
          onClick={descargarPlantilla}
          className="text-sm text-hueso-suave underline underline-offset-4"
        >
          Descargar plantilla
        </button>
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="…o pega aquí el contenido del CSV"
        rows={8}
        className="mt-4 w-full rounded-xl border border-borde bg-superficie-alta px-4 py-3 font-mono text-xs outline-none focus:border-marca-borde"
      />

      <button
        type="button"
        onClick={() => revisar()}
        disabled={ocupado || texto.trim() === ""}
        className="mt-3 rounded-full border border-borde px-5 py-2.5 text-sm disabled:opacity-40"
      >
        Revisar
      </button>

      {resumen && (
        <div className="mt-6 rounded-xl border border-marca-borde bg-marca-suave px-4 py-3">
          <p className="font-medium">Catálogo cargado</p>
          <ul className="mt-1 text-sm text-hueso-suave">
            <li>{resumen.productosCreados} vinos nuevos</li>
            <li>{resumen.productosActualizados} vinos actualizados</li>
            <li>{resumen.fotosAsignadas} fotos asignadas</li>
            {resumen.fotosDeclaradasSinSubir.length > 0 && (
              <li className="text-error">
                {resumen.fotosDeclaradasSinSubir.length} fotos declaradas que no estaban subidas:{" "}
                {resumen.fotosDeclaradasSinSubir.slice(0, 5).join(", ")}
              </li>
            )}
            <li>
              {resumen.bodegasNuevas} bodegas y {resumen.standsNuevos} stands creados
            </li>
          </ul>
          <Link
            href={`/${slug}/resultados`}
            className="mt-2 inline-block text-sm underline underline-offset-4"
          >
            Ver el catálogo en la app
          </Link>
        </div>
      )}

      {error && (
        <p className="mt-6 rounded-xl border border-borde px-4 py-3 text-sm text-error">{error}</p>
      )}

      {validacion && <Previsualizacion validacion={validacion} />}

      {/* Las fotos se suben antes de escribir el catálogo: al confirmar, el
          importador resuelve cada imagen_url contra lo que ya está subido. */}
      <Fotos
        slug={slug}
        clave={clave}
        validacion={listo ? validacion : null}
        onSubido={() => setFotosSubidas((n) => n + 1)}
      />

      {listo && (
        <button
          type="button"
          onClick={confirmar}
          disabled={ocupado}
          className="mt-6 w-full rounded-full bg-marca px-6 py-4 font-medium text-sobre-marca disabled:opacity-50"
        >
          {ocupado
            ? "Cargando…"
            : `Cargar ${validacion.filas.length} vinos en ${evento}`}
          {fotosSubidas > 0 && !ocupado ? " (con sus fotos)" : ""}
        </button>
      )}
    </div>
  );
}

function Previsualizacion({ validacion }: { validacion: Validacion }) {
  const { filas, problemas, faltantes, ignoradas } = validacion;

  if (faltantes.length > 0) {
    return (
      <p className="mt-6 rounded-xl border border-borde px-4 py-3 text-sm">
        Al archivo le faltan columnas obligatorias:{" "}
        <span className="text-error">{faltantes.join(", ")}</span>
      </p>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-sm text-hueso-suave">
        {problemas.length === 0
          ? `${filas.length} filas listas para cargar.`
          : `${problemas.length} ${problemas.length === 1 ? "problema" : "problemas"}. No se carga nada hasta corregirlos.`}
      </p>

      {ignoradas.length > 0 && (
        <p className="mt-1 text-xs text-hueso-suave">
          Columnas ignoradas: {ignoradas.join(", ")}
        </p>
      )}

      {problemas.length > 0 && (
        <ul className="mt-3 flex flex-col gap-1.5 text-sm">
          {problemas.map((p, i) => (
            <li key={i} className="rounded-lg border border-borde px-3 py-2">
              <span className="text-hueso-suave">
                {p.fila > 0 ? `Fila ${p.fila} · ` : ""}
                {p.columna}
              </span>{" "}
              — {p.mensaje}
            </li>
          ))}
        </ul>
      )}

      {problemas.length === 0 && filas.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-borde">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-xs text-hueso-suave">
              <tr className="border-b border-borde">
                <th className="px-3 py-2 font-normal">Vino</th>
                <th className="px-3 py-2 font-normal">Bodega</th>
                <th className="px-3 py-2 font-normal">Stand</th>
                <th className="px-3 py-2 font-normal">Tipo</th>
                <th className="px-3 py-2 font-normal">Precio</th>
                <th className="px-3 py-2 font-normal">Perfil</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i} className="border-b border-borde last:border-0">
                  <td className="px-3 py-2">{f.nombre}</td>
                  <td className="px-3 py-2 text-hueso-suave">{f.bodega}</td>
                  <td className="px-3 py-2 text-hueso-suave">{f.stand}</td>
                  <td className="px-3 py-2 text-hueso-suave">{f.tipo}</td>
                  <td className="px-3 py-2 tabular-nums">{f.precio}</td>
                  <td className="px-3 py-2 text-hueso-suave">
                    {f.cuerpo == null && f.dulzor == null ? (
                      <span className="text-error">falta</span>
                    ) : (
                      `${f.cuerpo ?? "–"}/${f.dulzor ?? "–"}`
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
