/**
 * Tema por evento. El color de marca del cliente entra como variable CSS y se
 * usa solo en acciones y acentos; el fondo oscuro de la app no cambia nunca.
 *
 * El único cálculo real es el color del texto que va encima de la marca: un
 * cliente puede traer un granate oscuro o un amarillo claro, y con un color de
 * texto fijo uno de los dos casos queda ilegible.
 */

import type { CSSProperties } from 'react';

const MARCA_POR_DEFECTO = '#B03A48';

/** Superficie oscura de la app, de CLAUDE.md. */
export const SUPERFICIE = '#17131A';
export const HUESO = '#EDE7E0';

function aRgb(hex: string): [number, number, number] | null {
  const limpio = hex.trim().replace(/^#/, '');
  const completo =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;

  if (!/^[0-9a-fA-F]{6}$/.test(completo)) return null;

  return [
    parseInt(completo.slice(0, 2), 16),
    parseInt(completo.slice(2, 4), 16),
    parseInt(completo.slice(4, 6), 16),
  ];
}

/** Luminancia relativa según WCAG. */
function luminancia([r, g, b]: [number, number, number]): number {
  const canal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/**
 * Variables CSS del evento, para poner en el `style` del contenedor de la ruta.
 * Un color inválido cae al granate por defecto en vez de romper la pantalla.
 */
/** Contraste WCAG entre dos colores. */
function contraste(a: [number, number, number], b: [number, number, number]): number {
  const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alto + 0.05) / (bajo + 0.05);
}

/**
 * Mínimo de WCAG para elementos no textuales: bordes, barras, rellenos de
 * botón. Por debajo de esto la marca se funde con la superficie.
 */
const CONTRASTE_MINIMO = 3;

/**
 * Aclara la marca hasta que se despegue del fondo. Un cliente puede traer un
 * azul marino o un verde botella, que sobre #17131A desaparecen: los botones,
 * la barra de progreso y los bordes de selección se vuelven invisibles y la app
 * parece rota sin que nadie sepa por qué. Se conserva el tono; solo sube la
 * luminosidad lo justo.
 */
function despegarDelFondo(rgb: [number, number, number]): [number, number, number] {
  const fondo = aRgb(SUPERFICIE)!;
  let actual = rgb;

  // 24 pasos de 4%: suficiente para sacar del fondo hasta un negro puro.
  for (let i = 0; i < 24 && contraste(actual, fondo) < CONTRASTE_MINIMO; i++) {
    actual = actual.map((c) => Math.min(255, Math.round(c + (255 - c) * 0.04))) as typeof actual;
  }

  return actual;
}

export function variablesDeTema(colorPrimario: string | null): CSSProperties {
  const original = aRgb(colorPrimario ?? '') ?? aRgb(MARCA_POR_DEFECTO)!;
  const rgb = despegarDelFondo(original);
  const marca = `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

  const canales = rgb.join(' ');

  return {
    '--marca': marca,
    '--marca-rgb': canales,
    // Relleno y borde de lo seleccionado: la marca, pero sin gritar.
    '--marca-suave': `rgb(${canales} / 0.16)`,
    '--marca-borde': `rgb(${canales} / 0.55)`,
    // Texto sobre la marca: hueso salvo que la marca sea clara.
    '--sobre-marca': luminancia(rgb) > 0.45 ? SUPERFICIE : HUESO,
  } as CSSProperties;
}
