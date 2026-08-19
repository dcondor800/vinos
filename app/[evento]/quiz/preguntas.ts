/**
 * Las cinco preguntas del quiz. Los valores de `maridajes` tienen que coincidir
 * exactamente con las cadenas de `productos.maridajes`, porque el motor cruza
 * por igualdad de texto.
 */

import { simboloMoneda } from '@/lib/moneda';
import type { Perfil, TipoVino } from '@/lib/recomendacion';

/** null en precioMax significa "sin responder"; 'sin-limite' es una respuesta. */
export interface Respuestas {
  tipos: TipoVino[];
  dulzor: number | null;
  cuerpo: number | null;
  maridajes: string[];
  precioMax: number | 'sin-limite' | null;
}

export const RESPUESTAS_VACIAS: Respuestas = {
  tipos: [],
  dulzor: null,
  cuerpo: null,
  maridajes: [],
  precioMax: null,
};

export type ValorOpcion = string | number;

export interface Opcion {
  valor: ValorOpcion;
  etiqueta: string;
}

export interface Pregunta {
  clave: keyof Respuestas;
  titulo: string;
  pista?: string;
  multiple: boolean;
  opciones: Opcion[];
}

/** Valor que, dentro de una pregunta múltiple, significa "sin preferencia". */
export const SIN_PREFERENCIA = 'otro';

export function construirPreguntas(moneda: string | null): Pregunta[] {
  const m = simboloMoneda(moneda);

  return [
    {
      clave: 'tipos',
      titulo: '¿Qué sueles tomar?',
      pista: 'Puedes elegir varios.',
      multiple: true,
      opciones: [
        { valor: 'tinto', etiqueta: 'Tinto' },
        { valor: 'blanco', etiqueta: 'Blanco' },
        { valor: 'rosado', etiqueta: 'Rosado' },
        { valor: 'espumante', etiqueta: 'Espumante' },
        { valor: 'dulce', etiqueta: 'Dulce o de postre' },
        { valor: SIN_PREFERENCIA, etiqueta: 'Me da igual, sorpréndeme' },
      ],
    },
    {
      clave: 'dulzor',
      titulo: '¿Dulce o seco?',
      multiple: false,
      opciones: [
        { valor: 1, etiqueta: 'Bien seco' },
        { valor: 2, etiqueta: 'Seco' },
        { valor: 3, etiqueta: 'Intermedio' },
        { valor: 4, etiqueta: 'Semidulce' },
        { valor: 5, etiqueta: 'Dulce' },
      ],
    },
    {
      clave: 'cuerpo',
      titulo: '¿Ligero o intenso?',
      multiple: false,
      opciones: [
        { valor: 1, etiqueta: 'Ligero y fácil' },
        { valor: 2, etiqueta: 'Suave' },
        { valor: 3, etiqueta: 'Equilibrado' },
        { valor: 4, etiqueta: 'Con cuerpo' },
        { valor: 5, etiqueta: 'Intenso y potente' },
      ],
    },
    {
      clave: 'maridajes',
      titulo: '¿Con qué lo vas a acompañar?',
      pista: 'Puedes elegir varios.',
      multiple: true,
      opciones: [
        { valor: 'carnes rojas', etiqueta: 'Carnes rojas' },
        { valor: 'aves', etiqueta: 'Aves' },
        { valor: 'pescados y mariscos', etiqueta: 'Pescados y mariscos' },
        { valor: 'pastas', etiqueta: 'Pastas' },
        { valor: 'quesos', etiqueta: 'Quesos' },
        { valor: 'postres', etiqueta: 'Postres' },
        { valor: 'solo, para tomar', etiqueta: 'Solo, para tomar' },
      ],
    },
    {
      clave: 'precioMax',
      titulo: '¿Cuánto quieres gastar por botella?',
      multiple: false,
      opciones: [
        { valor: 50, etiqueta: `Hasta ${m}50` },
        { valor: 100, etiqueta: `Hasta ${m}100` },
        { valor: 200, etiqueta: `Hasta ${m}200` },
        { valor: 'sin-limite', etiqueta: 'Sin límite' },
      ],
    },
  ];
}

export function aPerfil(r: Respuestas): Perfil {
  return {
    tipos: r.tipos,
    // El quiz no deja terminar sin responder las escalas; 3 es el neutro si
    // alguna vez llegara algo a medias.
    dulzor: r.dulzor ?? 3,
    cuerpo: r.cuerpo ?? 3,
    maridajes: r.maridajes,
    precioMax: typeof r.precioMax === 'number' ? r.precioMax : null,
  };
}

export function aRespuestas(perfil: Perfil): Respuestas {
  return {
    tipos: perfil.tipos,
    dulzor: perfil.dulzor,
    cuerpo: perfil.cuerpo,
    maridajes: perfil.maridajes,
    precioMax: perfil.precioMax ?? 'sin-limite',
  };
}
