/**
 * localStorage expuesto como store externo, para leerlo desde React con
 * `useSyncExternalStore` sin efectos ni estado duplicado.
 *
 * Todo el estado del asistente vive aquí: la sesión anónima, el perfil del quiz
 * y el catálogo cacheado. No hay servidor que consultar para saber quién es.
 */

const oyentes = new Set<() => void>();

/** El evento 'storage' solo avisa de otras pestañas; los cambios propios se avisan aquí. */
function notificar() {
  for (const oyente of oyentes) oyente();
}

export function suscribir(alCambiar: () => void): () => void {
  oyentes.add(alCambiar);
  window.addEventListener('storage', alCambiar);
  return () => {
    oyentes.delete(alCambiar);
    window.removeEventListener('storage', alCambiar);
  };
}

/** En el servidor no hay localStorage: undefined significa "todavía no se sabe". */
export function instantaneaServidor(): undefined {
  return undefined;
}

export function leerCrudo(clave: string): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(clave);
}

export function escribir(clave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    // Cuota llena o modo privado de Safari. La app sigue: lo que se pierde es
    // la persistencia, no la sesión en curso.
  }
  notificar();
}

export function borrar(clave: string): void {
  window.localStorage.removeItem(clave);
  notificar();
}

export function leer<T>(clave: string, validar: (dato: unknown) => T | null): T | null {
  const crudo = leerCrudo(clave);
  if (!crudo) return null;

  try {
    return validar(JSON.parse(crudo));
  } catch {
    // Dato corrupto: se descarta en vez de dejar la app muerta.
    window.localStorage.removeItem(clave);
    return null;
  }
}

const cache = new Map<string, { crudo: string | null; valor: unknown }>();

/**
 * `useSyncExternalStore` compara por identidad, así que la instantánea tiene que
 * devolver la misma referencia mientras el JSON guardado no cambie.
 */
export function instantanea<T>(clave: string, validar: (dato: unknown) => T | null): T | null {
  const crudo = leerCrudo(clave);
  const previo = cache.get(clave);

  if (previo && previo.crudo === crudo) return previo.valor as T | null;

  const valor = leer(clave, validar);
  cache.set(clave, { crudo, valor });
  return valor;
}
