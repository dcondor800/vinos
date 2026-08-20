import Image from "next/image";
import { notFound } from "next/navigation";
import { obtenerProducto } from "@/lib/catalogo";
import { obtenerEvento } from "@/lib/eventos";
import { imagenPermitida } from "@/lib/imagenes";
import { formatearPrecio } from "@/lib/moneda";
import { Encabezado } from "../../encabezado";
import { SoloConEdad } from "../../solo-con-edad";
import { AgregarAlPedido } from "./agregar";

/** Barras de 1 a 5. Nada de gráficos radiales: esto se lee de un vistazo. */
function Sensorial({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-16 shrink-0 text-sm text-hueso-suave">{etiqueta}</span>
      <div className="flex flex-1 gap-1" role="img" aria-label={`${etiqueta}: ${valor} de 5`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full ${n <= valor ? "bg-marca" : "bg-borde"}`}
          />
        ))}
      </div>
    </div>
  );
}

function Chips({ titulo, valores }: { titulo: string; valores: string[] }) {
  if (valores.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="text-sm text-hueso-suave">{titulo}</h2>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {valores.map((v) => (
          <li
            key={v}
            className="rounded-full border border-borde px-3 py-1.5 text-sm first-letter:uppercase"
          >
            {v}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function PaginaVino({ params }: PageProps<"/[evento]/vino/[id]">) {
  const { evento: slug, id } = await params;
  const evento = await obtenerEvento(slug);

  if (!evento) notFound();

  const vino = await obtenerProducto(evento.id, id);

  if (!vino) notFound();

  const origen = [vino.region, vino.pais].filter(Boolean).join(", ");
  const meta = [vino.varietal, vino.anada ? String(vino.anada) : null, origen].filter(Boolean);

  // Los atributos sensoriales llegan vacíos en la mayoría de las filas reales;
  // los que falten simplemente no se dibujan.
  const sensorial = (
    [
      ["Cuerpo", vino.cuerpo],
      ["Dulzor", vino.dulzor],
      ["Acidez", vino.acidez],
      ["Taninos", vino.taninos],
    ] as [string, number | null][]
  ).filter((par): par is [string, number] => par[1] != null);

  return (
    <SoloConEdad slug={slug}>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-6">
        {/* volverA es solo el respaldo de quien abre la ficha en pestaña nueva:
            normalmente se retrocede al paso real, que puede ser el pedido. */}
        <Encabezado slug={slug} volverA={`/${slug}/resultados`} titulo={vino.nombre} />

        {/* Vertical, no apaisado: las botellas lo son. En el recuadro anterior,
            de 368 × 192, una foto 3:4 se encogía hasta 144 px de ancho y
            quedaba nadando en el hueco. Se limita al 45% de la altura de
            pantalla para que el nombre y el precio sigan viéndose sin bajar. */}
        <div className="relative mt-4 h-[min(45vh,20rem)] overflow-hidden rounded-2xl bg-superficie-alta">
          {imagenPermitida(vino.imagen_url) ? (
            <Image
              src={vino.imagen_url}
              alt={vino.nombre}
              fill
              sizes="(max-width: 448px) 100vw, 400px"
              className="object-contain p-4"
              priority
            />
          ) : (
            <span
              aria-hidden
              className="grid size-full place-items-center font-serif text-6xl text-borde"
            >
              {vino.nombre.charAt(0)}
            </span>
          )}
        </div>

        <header className="mt-5">
          <h1 className="font-serif text-3xl leading-tight text-balance">{vino.nombre}</h1>
          <p className="mt-1 font-serif text-lg text-hueso-suave">{vino.bodega}</p>
          {meta.length > 0 && (
            <p className="mt-2 text-sm text-hueso-suave first-letter:uppercase">
              {meta.join(" · ")}
              {vino.grado_alcohol ? ` · ${vino.grado_alcohol}%` : ""}
            </p>
          )}
          <p className="mt-3 text-2xl font-medium">{formatearPrecio(vino.precio, evento.moneda)}</p>
        </header>

        {/* Lo que la persona de verdad necesita: dónde está la botella. */}
        <section className="mt-6 rounded-2xl border border-marca-borde bg-marca-suave px-5 py-4">
          <p className="text-xs tracking-wide text-hueso-suave uppercase">Dónde encontrarlo</p>
          <p className="mt-1 text-xl font-medium">
            Stand {vino.stand}
            {vino.zona && <span className="text-hueso-suave"> · Zona {vino.zona}</span>}
          </p>
        </section>

        {vino.descripcion && <p className="mt-6 leading-relaxed text-pretty">{vino.descripcion}</p>}

        {sensorial.length > 0 && (
          <section className="mt-7">
            <h2 className="text-sm text-hueso-suave">Perfil</h2>
            <div className="mt-3 flex flex-col gap-2.5">
              {sensorial.map(([etiqueta, valor]) => (
                <Sensorial key={etiqueta} etiqueta={etiqueta} valor={valor} />
              ))}
            </div>
          </section>
        )}

        <Chips titulo="Notas de cata" valores={vino.notas} />
        <Chips titulo="Marida con" valores={vino.maridajes} />

        <div className="mt-auto" />
        <AgregarAlPedido slug={slug} productoId={vino.id} standId={vino.stand_id} />
      </main>
    </SoloConEdad>
  );
}
