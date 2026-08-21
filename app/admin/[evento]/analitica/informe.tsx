"use client";

import { useState } from "react";
import { formatearPrecio, simboloMoneda } from "@/lib/moneda";
import { cargarInforme } from "./acciones";
import type { Informe as Datos } from "./datos";

export function Informe({ slug }: { slug: string }) {
  const [clave, setClave] = useState("");
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setOcupado(true);
    setError(null);

    const informe = await cargarInforme(clave, slug);
    setOcupado(false);

    if (!informe) setError("La clave no es correcta, o la feria no existe.");
    else setDatos(informe);
  }

  if (!datos) {
    return (
      <form onSubmit={entrar} className="mt-10 flex max-w-sm flex-col gap-3">
        <label htmlFor="clave" className="text-sm text-hueso-suave">
          Clave de administración
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
        <button type="submit" disabled={ocupado} className="boton boton-primario mt-1">
          {ocupado ? "Cargando…" : "Ver el informe"}
        </button>
      </form>
    );
  }

  return <Contenido datos={datos} />;
}

function Contenido({ datos }: { datos: Datos }) {
  const conInteres = datos.vinos.filter((v) => v.abierto > 0 || v.agregado > 0);
  const ignorados = datos.vinos.filter((v) => v.sugerido > 0 && v.abierto === 0);
  const moneda = simboloMoneda(datos.moneda);

  return (
    <div className="mt-8 flex flex-col gap-10">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Dato n={datos.sesiones} etiqueta="personas" />
        <Dato n={datos.perfiles} etiqueta="respondieron el quiz" />
        <Dato n={datos.pedidos} etiqueta="pedidos" />
        <Dato n={datos.botellas} etiqueta="botellas pedidas" />
      </section>

      {datos.sesiones === 0 && (
        <p className="rounded-xl border border-borde px-4 py-3 text-sm text-hueso-suave">
          Todavía no hay visitas registradas. Los datos aparecen a medida que la gente usa la app
          durante la feria.
        </p>
      )}

      <section>
        <h2 className="text-lg font-medium">Interés por vino</h2>
        <p className="mt-1 text-sm text-hueso-suave">
          Cuántas veces se sugirió cada uno, cuántas se abrió su ficha y cuántas se agregó al
          pedido. La diferencia entre sugerido y abierto dice si la tarjeta convence.
        </p>

        <Tabla
          cabecera={["Vino", "Bodega", "Stand", "Precio", "Sugerido", "Abierto", "Agregado"]}
          filas={datos.vinos.map((v) => [
            v.nombre,
            v.bodega,
            v.stand,
            formatearPrecio(v.precio, datos.moneda),
            v.sugerido,
            v.abierto,
            v.agregado,
          ])}
        />
      </section>

      <section>
        <h2 className="text-lg font-medium">Lo que se pidió contra lo que había</h2>
        <p className="mt-1 text-sm text-hueso-suave">
          Es la lectura más útil para armar la feria del año siguiente: dónde hubo demanda que el
          catálogo no cubría.
        </p>

        <div className="mt-4 grid gap-6 sm:grid-cols-3">
          <Comparativa
            titulo="Tipo de vino"
            filas={datos.tipos.map((t) => [t.tipo, t.pedido, t.disponible])}
          />
          <Comparativa
            titulo="Presupuesto"
            filas={datos.presupuestos.map((p) => [
              p.limite === null ? "sin límite" : `hasta ${moneda}${p.limite}`,
              p.pedido,
              p.disponible,
            ])}
          />
          <Comparativa
            titulo="Maridaje"
            filas={datos.maridajes.map((m) => [m.maridaje, m.pedido, m.disponible])}
          />
        </div>
      </section>

      {ignorados.length > 0 && (
        <section>
          <h2 className="text-lg font-medium">Sugeridos que nadie abrió</h2>
          <p className="mt-1 text-sm text-hueso-suave">
            El motor los propuso pero nadie tocó su tarjeta. Suele ser foto, precio o nombre poco
            atractivo, no que el vino esté mal recomendado.
          </p>
          <Tabla
            cabecera={["Vino", "Bodega", "Precio", "Veces sugerido"]}
            filas={ignorados
              .slice(0, 15)
              .map((v) => [v.nombre, v.bodega, formatearPrecio(v.precio, datos.moneda), v.sugerido])}
          />
        </section>
      )}

      <p className="text-sm text-hueso-suave">
        {conInteres.length} de {datos.vinos.length} vinos recibieron alguna interacción.
      </p>
    </div>
  );
}

function Dato({ n, etiqueta }: { n: number; etiqueta: string }) {
  return (
    <div className="rounded-xl border border-borde px-4 py-3">
      <p className="text-2xl font-medium tabular-nums">{n}</p>
      <p className="text-sm text-hueso-suave">{etiqueta}</p>
    </div>
  );
}

function Comparativa({ titulo, filas }: { titulo: string; filas: (string | number)[][] }) {
  const maximo = Math.max(1, ...filas.map((f) => Number(f[1])));

  return (
    <div>
      <h3 className="text-sm text-hueso-suave">{titulo}</h3>
      <ul className="mt-2 flex flex-col gap-2">
        {filas.map((f) => (
          <li key={String(f[0])}>
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate first-letter:uppercase">{f[0]}</span>
              <span className="shrink-0 tabular-nums">
                {f[1]} <span className="text-hueso-suave">/ {f[2]} vinos</span>
              </span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-borde">
              <div
                className="h-full rounded-full bg-marca"
                style={{ width: `${(Number(f[1]) / maximo) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Tabla({ cabecera, filas }: { cabecera: string[]; filas: (string | number)[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-borde">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="text-xs text-hueso-suave">
          <tr className="border-b border-borde">
            {cabecera.map((c) => (
              <th key={c} className="px-3 py-2 font-normal">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-b border-borde last:border-0">
              {f.map((celda, j) => (
                <td key={j} className={`px-3 py-2 ${j > 2 ? "tabular-nums" : ""}`}>
                  {celda}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
