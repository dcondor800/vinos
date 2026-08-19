/** El evento define su moneda; el MVP solo necesita el símbolo y el formato. */

const SIMBOLOS: Record<string, string> = {
  PEN: 'S/',
  USD: '$',
  EUR: '€',
  CLP: '$',
  ARS: '$',
  MXN: '$',
};

export function simboloMoneda(codigo: string | null | undefined): string {
  if (!codigo) return 'S/';
  return SIMBOLOS[codigo] ?? `${codigo} `;
}

/** "S/89" y "S/58.50": los céntimos solo aparecen cuando existen. */
export function formatearPrecio(valor: number, codigo: string | null | undefined): string {
  const decimales = Number.isInteger(valor) ? 0 : 2;
  return `${simboloMoneda(codigo)}${valor.toLocaleString('es-PE', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: 2,
  })}`;
}
