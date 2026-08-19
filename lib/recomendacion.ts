/**
 * Motor de recomendación. Determinista, sin IA, corre en el cliente sobre el
 * catálogo cacheado. Score de 0 a 100.
 *
 * Pesos: el tipo de vino y el dulzor son los que más pesan porque son los que
 * la gente percibe cuando algo "no le gusta". El cuerpo importa pero se perdona
 * más. La acidez y los taninos casi nadie los sabe evaluar en un quiz, así que
 * no se preguntan: se usan solo para desempatar.
 */

export type TipoVino = 'tinto' | 'blanco' | 'rosado' | 'espumante' | 'dulce' | 'otro';

export interface Producto {
  id: string;
  nombre: string;
  expositor_id: string;
  tipo: TipoVino;
  precio: number;
  cuerpo: number | null;
  dulzor: number | null;
  acidez: number | null;
  taninos: number | null;
  maridajes: string[];
  disponible: boolean;
}

export interface Perfil {
  /** Vacío o con 'otro' significa "me da igual". */
  tipos: TipoVino[];
  dulzor: number;   // 1 a 5
  cuerpo: number;   // 1 a 5
  maridajes: string[];
  precioMax: number | null;
}

export interface Razon {
  clave: 'tipo' | 'dulzor' | 'cuerpo' | 'maridaje' | 'precio';
  texto: string;
}

export interface Sugerencia {
  producto: Producto;
  score: number;
  razones: Razon[];
}

const PESO = { tipo: 30, dulzor: 25, cuerpo: 20, maridaje: 15, precio: 10 };

/** 1 cuando coinciden, 0 cuando están en extremos opuestos de la escala 1-5. */
function cercania(objetivo: number, valor: number | null): number {
  if (valor == null) return 0.5; // dato faltante: ni premia ni castiga
  return 1 - Math.abs(objetivo - valor) / 4;
}

const ETIQUETA_CUERPO = ['muy ligero', 'ligero', 'equilibrado', 'con cuerpo', 'intenso'];
const ETIQUETA_DULZOR = ['bien seco', 'seco', 'intermedio', 'semidulce', 'dulce'];

function evaluar(p: Producto, perfil: Perfil): Sugerencia {
  const razones: Razon[] = [];
  let score = 0;

  // --- tipo
  const sinPreferencia = perfil.tipos.length === 0 || perfil.tipos.includes('otro');
  if (sinPreferencia) {
    score += PESO.tipo * 0.6;
  } else if (perfil.tipos.includes(p.tipo)) {
    score += PESO.tipo;
    razones.push({ clave: 'tipo', texto: p.tipo });
  }

  // --- dulzor
  const cDulzor = cercania(perfil.dulzor, p.dulzor);
  score += PESO.dulzor * cDulzor;
  if (cDulzor >= 0.75 && p.dulzor != null) {
    razones.push({ clave: 'dulzor', texto: ETIQUETA_DULZOR[p.dulzor - 1] });
  }

  // --- cuerpo
  const cCuerpo = cercania(perfil.cuerpo, p.cuerpo);
  score += PESO.cuerpo * cCuerpo;
  if (cCuerpo >= 0.75 && p.cuerpo != null) {
    razones.push({ clave: 'cuerpo', texto: ETIQUETA_CUERPO[p.cuerpo - 1] });
  }

  // --- maridaje
  const coincidencias = perfil.maridajes.filter((m) => p.maridajes.includes(m));
  if (perfil.maridajes.length === 0) {
    score += PESO.maridaje * 0.5;
  } else if (coincidencias.length > 0) {
    score += PESO.maridaje;
    razones.push({ clave: 'maridaje', texto: `va con ${coincidencias[0]}` });
  }

  // --- precio: premia estar dentro, castiga proporcionalmente al exceso
  if (perfil.precioMax == null) {
    score += PESO.precio * 0.7;
  } else if (p.precio <= perfil.precioMax) {
    score += PESO.precio;
    razones.push({ clave: 'precio', texto: 'dentro de tu presupuesto' });
  } else {
    const exceso = (p.precio - perfil.precioMax) / perfil.precioMax;
    score += PESO.precio * Math.max(0, 1 - exceso * 2);
  }

  // --- desempate fino con acidez y taninos, sin generar razones
  if (p.acidez != null) score += p.acidez * 0.1;
  if (p.taninos != null && p.tipo === 'tinto') score += (p.taninos / 5) * 0.4;

  return { producto: p, score: Math.round(score * 10) / 10, razones: razones.slice(0, 3) };
}

/**
 * Devuelve las mejores sugerencias, con un tope de vinos por bodega para que la
 * lista no quede dominada por el expositor que cargó más productos.
 */
export function recomendar(
  catalogo: Producto[],
  perfil: Perfil,
  opciones: { limite?: number; maxPorBodega?: number } = {}
): Sugerencia[] {
  const { limite = 10, maxPorBodega = 2 } = opciones;

  const ordenadas = catalogo
    .filter((p) => p.disponible)
    .map((p) => evaluar(p, perfil))
    .sort((a, b) => b.score - a.score);

  const porBodega = new Map<string, number>();
  const resultado: Sugerencia[] = [];

  for (const s of ordenadas) {
    if (resultado.length >= limite) break;
    const usados = porBodega.get(s.producto.expositor_id) ?? 0;
    if (usados >= maxPorBodega) continue;
    porBodega.set(s.producto.expositor_id, usados + 1);
    resultado.push(s);
  }

  // Si el filtro por bodega dejó la lista muy corta, se completa sin ese tope.
  if (resultado.length < Math.min(4, ordenadas.length)) {
    const ids = new Set(resultado.map((s) => s.producto.id));
    for (const s of ordenadas) {
      if (resultado.length >= limite) break;
      if (!ids.has(s.producto.id)) resultado.push(s);
    }
  }

  return resultado;
}

/** Resumen del perfil en una línea, para la cabecera de resultados. */
export function describirPerfil(perfil: Perfil, moneda = 'S/'): string {
  const partes: string[] = [];
  if (perfil.tipos.length && !perfil.tipos.includes('otro')) {
    partes.push(perfil.tipos.join(', '));
  }
  partes.push(ETIQUETA_CUERPO[perfil.cuerpo - 1]);
  partes.push(ETIQUETA_DULZOR[perfil.dulzor - 1]);
  if (perfil.maridajes.length) partes.push(`para ${perfil.maridajes[0]}`);
  if (perfil.precioMax) partes.push(`hasta ${moneda}${perfil.precioMax}`);
  const linea = partes.join(', ');
  return linea.charAt(0).toUpperCase() + linea.slice(1);
}
