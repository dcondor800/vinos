'use server';

/**
 * Escritura del catálogo. Es lo único de la app que usa la service role, así
 * que la clave se comprueba en cada llamada: una acción de servidor es un
 * endpoint público con otra sintaxis.
 */

import { randomUUID, timingSafeEqual } from 'node:crypto';
import { validarCsv, type FilaProducto, type Validacion } from '@/lib/importacion';
import { createAdminClient } from '@/lib/supabase/admin';
import { claveImportador } from '@/lib/supabase/env';

export interface ResumenImportacion {
  bodegasNuevas: number;
  standsNuevos: number;
  productosCreados: number;
  productosActualizados: number;
}

export type Respuesta =
  | { ok: true; resumen: ResumenImportacion }
  | {
      ok: false;
      motivo: 'clave' | 'evento' | 'validacion' | 'escritura';
      detalle?: string;
      validacion?: Validacion;
    };

function claveCorrecta(recibida: string): boolean {
  const esperada = Buffer.from(claveImportador());
  const dada = Buffer.from(recibida);
  // Longitudes distintas ya delatan el fallo, pero timingSafeEqual las exige iguales.
  return dada.length === esperada.length && timingSafeEqual(dada, esperada);
}

export async function verificarClave(clave: string): Promise<boolean> {
  return claveCorrecta(clave);
}

/** Solo valida. No escribe nada: es lo que alimenta la previsualización. */
export async function revisarCsv(clave: string, texto: string): Promise<Validacion | null> {
  if (!claveCorrecta(clave)) return null;
  return validarCsv(texto);
}

const norm = (s: string) => s.trim().toLowerCase();

type Admin = ReturnType<typeof createAdminClient>;

export async function importarCatalogo(
  claveDada: string,
  slug: string,
  texto: string,
): Promise<Respuesta> {
  if (!claveCorrecta(claveDada)) return { ok: false, motivo: 'clave' };

  const validacion = validarCsv(texto);
  if (validacion.faltantes.length > 0 || validacion.problemas.length > 0) {
    return { ok: false, motivo: 'validacion', validacion };
  }
  if (validacion.filas.length === 0) {
    return { ok: false, motivo: 'validacion', detalle: 'El archivo no tiene filas.' };
  }

  const admin = createAdminClient();

  // El evento se lee con service role: el importador tiene que funcionar aunque
  // la feria todavía no esté activa.
  const { data: evento } = await admin
    .from('eventos')
    .select('id')
    .eq('slug', slug)
    .maybeSingle<{ id: string }>();

  if (!evento) return { ok: false, motivo: 'evento' };

  try {
    const { bodegasNuevas, mapaBodega } = await asegurarBodegas(admin, evento.id, validacion.filas);
    const { standsNuevos, mapaStand } = await asegurarStands(
      admin,
      evento.id,
      validacion.filas,
      mapaBodega,
    );
    const resumen = await escribirProductos(
      admin,
      evento.id,
      validacion.filas,
      mapaBodega,
      mapaStand,
    );

    return { ok: true, resumen: { bodegasNuevas, standsNuevos, ...resumen } };
  } catch (e) {
    return {
      ok: false,
      motivo: 'escritura',
      detalle: e instanceof Error ? e.message : 'desconocido',
    };
  }
}

async function asegurarBodegas(admin: Admin, eventoId: string, filas: FilaProducto[]) {
  const { data, error } = await admin
    .from('expositores')
    .select('id, nombre')
    .eq('evento_id', eventoId);
  if (error) throw new Error(`expositores: ${error.message}`);

  const mapaBodega = new Map((data ?? []).map((e) => [norm(e.nombre), e.id]));

  const nuevas = [...new Map(filas.map((f) => [norm(f.bodega), f])).values()].filter(
    (f) => !mapaBodega.has(norm(f.bodega)),
  );

  if (nuevas.length > 0) {
    const registros = nuevas.map((f) => ({
      id: randomUUID(),
      evento_id: eventoId,
      nombre: f.bodega,
      pais: f.pais,
    }));

    const { error: errorInsert } = await admin.from('expositores').insert(registros);
    if (errorInsert) throw new Error(`expositores: ${errorInsert.message}`);

    for (const r of registros) mapaBodega.set(norm(r.nombre), r.id);
  }

  return { bodegasNuevas: nuevas.length, mapaBodega };
}

async function asegurarStands(
  admin: Admin,
  eventoId: string,
  filas: FilaProducto[],
  mapaBodega: Map<string, string>,
) {
  const { data, error } = await admin.from('stands').select('id, codigo').eq('evento_id', eventoId);
  if (error) throw new Error(`stands: ${error.message}`);

  const mapaStand = new Map((data ?? []).map((s) => [norm(s.codigo), s.id]));

  const nuevos = [...new Map(filas.map((f) => [norm(f.stand), f])).values()].filter(
    (f) => !mapaStand.has(norm(f.stand)),
  );

  if (nuevos.length > 0) {
    const registros = nuevos.map((f) => ({
      id: randomUUID(),
      evento_id: eventoId,
      expositor_id: mapaBodega.get(norm(f.bodega))!,
      codigo: f.stand,
      zona: f.zona,
    }));

    const { error: errorInsert } = await admin.from('stands').insert(registros);
    if (errorInsert) throw new Error(`stands: ${errorInsert.message}`);

    for (const r of registros) mapaStand.set(norm(r.codigo), r.id);
  }

  return { standsNuevos: nuevos.length, mapaStand };
}

async function escribirProductos(
  admin: Admin,
  eventoId: string,
  filas: FilaProducto[],
  mapaBodega: Map<string, string>,
  mapaStand: Map<string, string>,
) {
  const { data, error } = await admin
    .from('productos')
    .select('id, nombre, expositor_id')
    .eq('evento_id', eventoId);
  if (error) throw new Error(`productos: ${error.message}`);

  // Un vino se identifica por bodega + nombre. Volver a subir el mismo archivo
  // corrige las filas en vez de duplicarlas.
  const existentes = new Map(
    (data ?? []).map((p) => [`${p.expositor_id}|${norm(p.nombre)}`, p.id]),
  );

  let productosCreados = 0;
  let productosActualizados = 0;

  const registros = filas.map((f) => {
    const expositorId = mapaBodega.get(norm(f.bodega))!;
    const previo = existentes.get(`${expositorId}|${norm(f.nombre)}`);

    if (previo) productosActualizados++;
    else productosCreados++;

    return {
      id: previo ?? randomUUID(),
      evento_id: eventoId,
      expositor_id: expositorId,
      stand_id: mapaStand.get(norm(f.stand))!,
      nombre: f.nombre,
      tipo: f.tipo,
      varietal: f.varietal,
      pais: f.pais,
      region: f.region,
      anada: f.anada,
      grado_alcohol: f.grado_alcohol,
      precio: f.precio,
      cuerpo: f.cuerpo,
      dulzor: f.dulzor,
      acidez: f.acidez,
      taninos: f.taninos,
      notas: f.notas,
      maridajes: f.maridajes,
      descripcion: f.descripcion,
      imagen_url: f.imagen_url,
      disponible: f.disponible,
      destacado: f.destacado,
    };
  });

  // upsert por clave primaria: los que ya tenían id se actualizan, el resto entra.
  const { error: errorUpsert } = await admin.from('productos').upsert(registros);
  if (errorUpsert) throw new Error(`productos: ${errorUpsert.message}`);

  return { productosCreados, productosActualizados };
}
