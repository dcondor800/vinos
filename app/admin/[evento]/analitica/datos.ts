import 'server-only';

/**
 * Lectura del informe. Va con service role porque RLS oculta las interacciones
 * y los perfiles al cliente a propósito: son datos del evento, no del asistente.
 */

import { createAdminClient } from '@/lib/supabase/admin';
import type { Perfil, TipoVino } from '@/lib/recomendacion';

export interface FilaVino {
  id: string;
  nombre: string;
  bodega: string;
  stand: string;
  precio: number;
  sugerido: number;
  abierto: number;
  agregado: number;
}

export interface Informe {
  nombre: string;
  moneda: string | null;
  sesiones: number;
  perfiles: number;
  pedidos: number;
  botellas: number;
  vinos: FilaVino[];
  /** Cuántos perfiles pidieron cada tipo, contra cuántos vinos hay de ese tipo. */
  tipos: { tipo: string; pedido: number; disponible: number }[];
  /** Lo mismo con el presupuesto: cuántos lo pidieron y cuántos vinos lo cumplen. */
  presupuestos: { limite: number | null; pedido: number; disponible: number }[];
  maridajes: { maridaje: string; pedido: number; disponible: number }[];
}

export async function obtenerInforme(slug: string): Promise<Informe | null> {
  const admin = createAdminClient();

  const { data: evento } = await admin
    .from('eventos')
    .select('id, nombre, moneda')
    .eq('slug', slug)
    .maybeSingle<{ id: string; nombre: string; moneda: string | null }>();

  if (!evento) return null;

  const [productos, interacciones, perfiles, sesiones, pedidos, items] = await Promise.all([
    admin
      .from('productos')
      .select('id, nombre, precio, tipo, maridajes, expositores(nombre), stands(codigo)')
      .eq('evento_id', evento.id),
    admin.from('interacciones').select('producto_id, accion').eq('evento_id', evento.id),
    admin.from('perfiles').select('respuestas').eq('evento_id', evento.id),
    admin.from('sesiones').select('*', { count: 'exact', head: true }).eq('evento_id', evento.id),
    admin.from('pedidos').select('id').eq('evento_id', evento.id),
    admin.from('pedido_items').select('cantidad, pedido_id'),
  ]);

  const catalogo = (productos.data ?? []) as unknown as {
    id: string;
    nombre: string;
    precio: number | string;
    tipo: TipoVino;
    maridajes: string[] | null;
    expositores: { nombre: string } | null;
    stands: { codigo: string } | null;
  }[];

  const cuenta = new Map<string, { sugerido: number; abierto: number; agregado: number }>();
  for (const i of interacciones.data ?? []) {
    if (!i.producto_id) continue;
    const c = cuenta.get(i.producto_id) ?? { sugerido: 0, abierto: 0, agregado: 0 };
    if (i.accion === 'sugerido') c.sugerido++;
    else if (i.accion === 'abierto') c.abierto++;
    else if (i.accion === 'agregado') c.agregado++;
    cuenta.set(i.producto_id, c);
  }

  const vinos: FilaVino[] = catalogo
    .map((p) => ({
      id: p.id,
      nombre: p.nombre,
      bodega: p.expositores?.nombre ?? '—',
      stand: p.stands?.codigo ?? '—',
      precio: Number(p.precio),
      ...(cuenta.get(p.id) ?? { sugerido: 0, abierto: 0, agregado: 0 }),
    }))
    // Por interés real: primero lo que la gente se llevó, después lo que miró.
    .sort((a, b) => b.agregado - a.agregado || b.abierto - a.abierto || b.sugerido - a.sugerido);

  const respuestas = (perfiles.data ?? []).map((p) => p.respuestas as Perfil);

  const TIPOS: TipoVino[] = ['tinto', 'blanco', 'rosado', 'espumante', 'dulce'];
  const tipos = TIPOS.map((tipo) => ({
    tipo,
    pedido: respuestas.filter((r) => r.tipos?.includes(tipo)).length,
    disponible: catalogo.filter((p) => p.tipo === tipo).length,
  }));

  const LIMITES = [50, 100, 200, null];
  const presupuestos = LIMITES.map((limite) => ({
    limite,
    pedido: respuestas.filter((r) => (r.precioMax ?? null) === limite).length,
    disponible: limite === null ? catalogo.length : catalogo.filter((p) => Number(p.precio) <= limite).length,
  }));

  const MARIDAJES = [
    'carnes rojas',
    'aves',
    'pescados y mariscos',
    'pastas',
    'quesos',
    'postres',
    'solo, para tomar',
  ];
  const maridajes = MARIDAJES.map((maridaje) => ({
    maridaje,
    pedido: respuestas.filter((r) => r.maridajes?.includes(maridaje)).length,
    disponible: catalogo.filter((p) => (p.maridajes ?? []).includes(maridaje)).length,
  }));

  const idsPedidos = new Set((pedidos.data ?? []).map((p) => p.id));

  return {
    nombre: evento.nombre,
    moneda: evento.moneda,
    sesiones: sesiones.count ?? 0,
    perfiles: respuestas.length,
    pedidos: idsPedidos.size,
    botellas: (items.data ?? [])
      .filter((i) => idsPedidos.has(i.pedido_id))
      .reduce((n, i) => n + i.cantidad, 0),
    vinos,
    tipos,
    presupuestos,
    maridajes,
  };
}
