/**
 * Validación del CSV de catálogo. Todo aquí es puro: entra texto, sale una
 * lista de filas listas para escribir más los errores por fila. La escritura
 * vive en la acción de servidor, que es la única que tiene la service role.
 */

import { normalizarEncabezado, parsearCsv } from '@/lib/csv';
import { imagenPermitida } from '@/lib/imagenes';
import type { TipoVino } from '@/lib/recomendacion';

export const COLUMNAS_REQUERIDAS = ['bodega', 'stand', 'nombre', 'tipo', 'precio'] as const;

export const COLUMNAS_OPCIONALES = [
  'zona',
  'varietal',
  'pais',
  'region',
  'anada',
  'grado_alcohol',
  'cuerpo',
  'dulzor',
  'acidez',
  'taninos',
  'notas',
  'maridajes',
  'descripcion',
  'imagen_url',
  'disponible',
  'destacado',
] as const;

export const COLUMNAS: readonly string[] = [...COLUMNAS_REQUERIDAS, ...COLUMNAS_OPCIONALES];

/**
 * Vocabulario cerrado. El motor cruza maridajes por igualdad de texto, así que
 * "Carne roja" en vez de "carnes rojas" produce un vino que se carga bien, se
 * ve bien y nunca se recomienda. Por eso se valida en vez de aceptar cualquier
 * cosa.
 */
export const MARIDAJES = [
  'carnes rojas',
  'aves',
  'pescados y mariscos',
  'pastas',
  'quesos',
  'postres',
  'solo, para tomar',
] as const;

/** Variantes que llegan de las bodegas y significan lo mismo. */
const SINONIMOS_MARIDAJE: Record<string, string> = {
  carne_roja: 'carnes rojas',
  carnes: 'carnes rojas',
  carnes_rojas: 'carnes rojas',
  ave: 'aves',
  pollo: 'aves',
  pescado: 'pescados y mariscos',
  pescados: 'pescados y mariscos',
  mariscos: 'pescados y mariscos',
  pescados_y_mariscos: 'pescados y mariscos',
  pasta: 'pastas',
  queso: 'quesos',
  quesos: 'quesos',
  postre: 'postres',
  solo: 'solo, para tomar',
  aperitivo: 'solo, para tomar',
  solo_para_tomar: 'solo, para tomar',
  para_tomar: 'solo, para tomar',
  solo_para_beber: 'solo, para tomar',
};

function equivalenteMaridaje(bruto: string): string | null {
  const normal = normalizarEncabezado(bruto);
  const directo = MARIDAJES.find((m) => normalizarEncabezado(m) === normal);
  return directo ?? SINONIMOS_MARIDAJE[normal] ?? null;
}

/**
 * Separa la celda de maridajes. No basta con partir por comas: el propio
 * vocabulario incluye "solo, para tomar", que lleva una coma dentro. Así que se
 * prueba primero la celda entera, después por | y ;, y solo si un trozo no
 * significa nada se intenta partirlo por comas.
 */
export function separarMaridajes(celda: string): { valores: string[]; desconocidos: string[] } {
  const valores: string[] = [];
  const desconocidos: string[] = [];

  const agregar = (v: string) => {
    if (!valores.includes(v)) valores.push(v);
  };

  if (celda.trim() === '') return { valores, desconocidos };

  const entera = equivalenteMaridaje(celda);
  if (entera) return { valores: [entera], desconocidos };

  for (const trozo of celda.split(/[|;]/).map((s) => s.trim()).filter(Boolean)) {
    const directo = equivalenteMaridaje(trozo);
    if (directo) {
      agregar(directo);
      continue;
    }

    // Puede ser una lista separada por comas, que es como la escribe mucha gente.
    if (trozo.includes(',')) {
      for (const parte of trozo.split(',').map((s) => s.trim()).filter(Boolean)) {
        const equivalente = equivalenteMaridaje(parte);
        if (equivalente) agregar(equivalente);
        else desconocidos.push(parte);
      }
      continue;
    }

    desconocidos.push(trozo);
  }

  return { valores, desconocidos };
}

const TIPOS: Record<string, TipoVino> = {
  tinto: 'tinto',
  blanco: 'blanco',
  rosado: 'rosado',
  rose: 'rosado',
  espumante: 'espumante',
  espumoso: 'espumante',
  champagne: 'espumante',
  dulce: 'dulce',
  postre: 'dulce',
  otro: 'otro',
};

export interface FilaProducto {
  bodega: string;
  stand: string;
  zona: string | null;
  nombre: string;
  tipo: TipoVino;
  varietal: string | null;
  pais: string | null;
  region: string | null;
  anada: number | null;
  grado_alcohol: number | null;
  precio: number;
  cuerpo: number | null;
  dulzor: number | null;
  acidez: number | null;
  taninos: number | null;
  notas: string[];
  maridajes: string[];
  descripcion: string | null;
  imagen_url: string | null;
  disponible: boolean;
  destacado: boolean;
}

export interface ProblemaFila {
  /** Número de fila tal como se ve en Excel: la 1 es el encabezado. */
  fila: number;
  columna: string;
  mensaje: string;
}

export interface Validacion {
  filas: FilaProducto[];
  problemas: ProblemaFila[];
  /** Columnas del archivo que no se reconocen. Se ignoran, no son error. */
  ignoradas: string[];
  faltantes: string[];
}

const vacio = (v: string | undefined) => !v || v.trim() === '';

/** Excel en español escribe los decimales con coma. */
function aNumero(v: string): number | null {
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function aBooleano(v: string, porDefecto: boolean): boolean {
  const s = normalizarEncabezado(v);
  if (['si', 'sí', 'true', '1', 'x', 'verdadero'].includes(s)) return true;
  if (['no', 'false', '0', 'falso'].includes(s)) return false;
  return porDefecto;
}

function aLista(v: string): string[] {
  return v
    .split(/[|;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function validarCsv(texto: string): Validacion {
  const tabla = parsearCsv(texto);

  if (tabla.length === 0) {
    return { filas: [], problemas: [], ignoradas: [], faltantes: [...COLUMNAS_REQUERIDAS] };
  }

  const encabezado = tabla[0].map(normalizarEncabezado);
  const indice = new Map(encabezado.map((c, i) => [c, i]));

  const faltantes = COLUMNAS_REQUERIDAS.filter((c) => !indice.has(c));
  const ignoradas = encabezado.filter((c) => c !== '' && !COLUMNAS.includes(c));

  if (faltantes.length > 0) {
    return { filas: [], problemas: [], ignoradas, faltantes };
  }

  const filas: FilaProducto[] = [];
  const problemas: ProblemaFila[] = [];
  const vistos = new Set<string>();

  for (let i = 1; i < tabla.length; i++) {
    const numero = i + 1;
    const celda = (col: string) => tabla[i][indice.get(col) ?? -1] ?? '';
    const problema = (columna: string, mensaje: string) =>
      problemas.push({ fila: numero, columna, mensaje });

    // --- obligatorios
    for (const col of COLUMNAS_REQUERIDAS) {
      if (vacio(celda(col))) problema(col, 'no puede estar vacío');
    }

    const tipo = TIPOS[normalizarEncabezado(celda('tipo'))];
    if (!vacio(celda('tipo')) && !tipo) {
      problema('tipo', `"${celda('tipo')}" no es un tipo válido`);
    }

    const precio = aNumero(celda('precio'));
    if (!vacio(celda('precio')) && (precio === null || precio < 0)) {
      problema('precio', `"${celda('precio')}" no es un precio válido`);
    }

    // --- duplicados dentro del propio archivo
    const clave = `${normalizarEncabezado(celda('bodega'))}|${normalizarEncabezado(celda('nombre'))}`;
    if (vistos.has(clave)) {
      problema('nombre', 'repetido en este archivo para la misma bodega');
    }
    vistos.add(clave);

    // --- numéricos opcionales
    const anadaTexto = celda('anada');
    let anada: number | null = null;
    if (!vacio(anadaTexto)) {
      const n = aNumero(anadaTexto);
      if (n === null || !Number.isInteger(n) || n < 1900 || n > 2100) {
        problema('anada', `"${anadaTexto}" no parece un año`);
      } else {
        anada = n;
      }
    }

    const gradoTexto = celda('grado_alcohol');
    let grado: number | null = null;
    if (!vacio(gradoTexto)) {
      const n = aNumero(gradoTexto);
      if (n === null || n < 0 || n > 60) {
        problema('grado_alcohol', `"${gradoTexto}" no es un grado válido`);
      } else {
        grado = n;
      }
    }

    // --- escalas sensoriales: vacías es lo normal, no un error
    const escalas: Record<string, number | null> = {};
    for (const col of ['cuerpo', 'dulzor', 'acidez', 'taninos']) {
      const texto = celda(col);
      if (vacio(texto)) {
        escalas[col] = null;
        continue;
      }
      const n = aNumero(texto);
      if (n === null || !Number.isInteger(n) || n < 1 || n > 5) {
        problema(col, `"${texto}" tiene que ser un entero del 1 al 5`);
        escalas[col] = null;
      } else {
        escalas[col] = n;
      }
    }

    // --- foto: un host ajeno rompe next/image y con él toda la pantalla
    if (!vacio(celda('imagen_url')) && !imagenPermitida(celda('imagen_url'))) {
      problema(
        'imagen_url',
        'la foto debe estar subida al almacenamiento de la feria, no enlazada desde otro sitio',
      );
    }

    // --- maridajes contra el vocabulario cerrado
    const { valores: maridajes, desconocidos } = separarMaridajes(celda('maridajes'));
    for (const bruto of desconocidos) {
      problema('maridajes', `"${bruto}" no está en la lista de maridajes`);
    }

    if (problemas.some((p) => p.fila === numero)) continue;

    filas.push({
      bodega: celda('bodega'),
      stand: celda('stand'),
      zona: vacio(celda('zona')) ? null : celda('zona'),
      nombre: celda('nombre'),
      tipo: tipo!,
      varietal: vacio(celda('varietal')) ? null : celda('varietal'),
      pais: vacio(celda('pais')) ? null : celda('pais'),
      region: vacio(celda('region')) ? null : celda('region'),
      anada,
      grado_alcohol: grado,
      precio: precio!,
      cuerpo: escalas.cuerpo,
      dulzor: escalas.dulzor,
      acidez: escalas.acidez,
      taninos: escalas.taninos,
      notas: aLista(celda('notas')),
      maridajes,
      descripcion: vacio(celda('descripcion')) ? null : celda('descripcion'),
      imagen_url: vacio(celda('imagen_url')) ? null : celda('imagen_url'),
      disponible: aBooleano(celda('disponible'), true),
      destacado: aBooleano(celda('destacado'), false),
    });
  }

  // Un stand pertenece a una sola bodega. Si el archivo asigna el mismo código
  // a dos, los vinos de la segunda terminarían apuntando al stand de la
  // primera: datos mal cargados sin ningún error a la vista.
  const duenoDelStand = new Map<string, string>();
  for (const f of filas) {
    const previo = duenoDelStand.get(f.stand);
    if (previo && previo !== f.bodega) {
      problemas.push({
        fila: 0,
        columna: 'stand',
        mensaje: `el stand ${f.stand} aparece con dos bodegas: "${previo}" y "${f.bodega}"`,
      });
      break;
    }
    duenoDelStand.set(f.stand, f.bodega);
  }

  return {
    filas: problemas.length > 0 ? [] : filas,
    problemas,
    ignoradas,
    faltantes: [],
  };
}

/** Plantilla que se le manda a las bodegas. */
export function plantillaCsv(): string {
  const ejemplo = [
    'Bodega Valle Norte',
    'A-04',
    'Chile',
    'Reserva Cabernet Sauvignon',
    'tinto',
    'Cabernet Sauvignon',
    'Chile',
    'Valle del Maipo',
    '2021',
    '14',
    '89.00',
    '4',
    '2',
    '3',
    '4',
    'cassis|pimiento|vainilla',
    'carnes rojas|quesos',
    'Tinto estructurado con paso por barrica.',
    '',
    'si',
    'no',
  ];

  const orden = [
    'bodega',
    'stand',
    'zona',
    'nombre',
    'tipo',
    'varietal',
    'pais',
    'region',
    'anada',
    'grado_alcohol',
    'precio',
    'cuerpo',
    'dulzor',
    'acidez',
    'taninos',
    'notas',
    'maridajes',
    'descripcion',
    'imagen_url',
    'disponible',
    'destacado',
  ];

  return `${orden.join(';')}\n${ejemplo.join(';')}\n`;
}
