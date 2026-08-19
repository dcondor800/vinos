/**
 * Parser de CSV sin dependencias. Los archivos vienen de Excel en español, así
 * que hay que aguantar lo que Excel produce: punto y coma como separador, BOM
 * al inicio, saltos CRLF y campos entrecomillados con comas adentro.
 */

export type Delimitador = ',' | ';' | '\t';

/** Gana el separador que más aparece fuera de comillas en la primera línea. */
export function detectarDelimitador(texto: string): Delimitador {
  const primera = texto.split(/\r?\n/, 1)[0] ?? '';

  let dentro = false;
  const cuenta: Record<Delimitador, number> = { ',': 0, ';': 0, '\t': 0 };

  for (const c of primera) {
    if (c === '"') dentro = !dentro;
    else if (!dentro && (c === ',' || c === ';' || c === '\t')) cuenta[c]++;
  }

  // Excel en español usa ';'. Ante el empate en cero, la coma es lo estándar.
  if (cuenta[';'] > cuenta[','] && cuenta[';'] >= cuenta['\t']) return ';';
  if (cuenta['\t'] > cuenta[','] && cuenta['\t'] > cuenta[';']) return '\t';
  return ',';
}

/**
 * Devuelve las filas no vacías. Dentro de comillas, "" es una comilla literal
 * y los saltos de línea forman parte del campo.
 */
export function parsearCsv(texto: string, delimitador?: Delimitador): string[][] {
  const limpio = texto.replace(/^﻿/, '');
  const sep = delimitador ?? detectarDelimitador(limpio);

  const filas: string[][] = [];
  let fila: string[] = [];
  let campo = '';
  let dentro = false;

  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];

    if (dentro) {
      if (c === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          dentro = false;
        }
      } else {
        campo += c;
      }
      continue;
    }

    if (c === '"') {
      dentro = true;
    } else if (c === sep) {
      fila.push(campo);
      campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(campo);
      campo = '';
      if (fila.some((v) => v.trim() !== '')) filas.push(fila);
      fila = [];
    } else {
      campo += c;
    }
  }

  fila.push(campo);
  if (fila.some((v) => v.trim() !== '')) filas.push(fila);

  return filas.map((f) => f.map((v) => v.trim()));
}

/** "Añada" y "AÑADA " son la misma columna que "anada". */
export function normalizarEncabezado(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s-]+/g, '_');
}
