import { describe, expect, it } from 'vitest';
import { HUESO, SUPERFICIE, variablesDeTema } from '@/lib/tema';

function aRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function luminancia(hex: string): number {
  const [r, g, b] = aRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string): number {
  const [alto, bajo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alto + 0.05) / (bajo + 0.05);
}

const marcaDe = (color: string | null) =>
  (variablesDeTema(color) as Record<string, string>)['--marca'];

const sobreMarcaDe = (color: string | null) =>
  (variablesDeTema(color) as Record<string, string>)['--sobre-marca'];

describe('variablesDeTema', () => {
  it('respeta un color de marca que ya se despega del fondo', () => {
    expect(marcaDe('#B03A48')).toBe('#b03a48');
  });

  it('aclara una marca oscura hasta que se vea sobre la superficie', () => {
    // Un azul marino o un verde botella desaparecen sobre #17131A: los botones
    // y la barra de progreso se vuelven invisibles.
    for (const oscuro of ['#101820', '#0B1D16', '#000000', '#1A1A1A']) {
      expect(contraste(marcaDe(oscuro), SUPERFICIE)).toBeGreaterThanOrEqual(3);
    }
  });

  it('deja legible el texto sobre la marca, sea clara u oscura', () => {
    for (const color of ['#B03A48', '#F2E205', '#FFFFFF', '#101820', '#7B2D8E']) {
      expect(contraste(sobreMarcaDe(color), marcaDe(color))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('pone texto oscuro sobre marcas claras y hueso sobre las oscuras', () => {
    expect(sobreMarcaDe('#F2E205')).toBe(SUPERFICIE);
    expect(sobreMarcaDe('#B03A48')).toBe(HUESO);
  });

  it('cae al granate por defecto cuando el color es inválido', () => {
    expect(marcaDe('no-es-un-color')).toBe('#b03a48');
    expect(marcaDe(null)).toBe('#b03a48');
  });

  it('acepta la forma corta de tres dígitos', () => {
    expect(marcaDe('#c33')).toBe('#cc3333');
  });
});
