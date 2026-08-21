"use client";

import { useEffect } from "react";

/**
 * Guarda el catálogo entero en el dispositivo mientras hay señal.
 *
 * El service worker cachea lo que se visita, así que la lista queda disponible
 * por el solo hecho de haber pasado por ella. Las fichas no: quedarse sin red
 * justo al tocar un vino deja esa pantalla inexistente, que es el momento
 * exacto en que se usa la app frente al stand.
 *
 * Se traen todas y no solo las visibles porque el catálogo no cambia durante la
 * feria: bajarlo una vez al entrar deja la app completa en el teléfono. Son
 * unos 7 KB por ficha comprimida, así que treinta vinos son menos de un cuarto
 * de mega.
 */

/**
 * Por encima de esto deja de ser gratis: una feria de cientos de etiquetas
 * serían varios megas justo cuando la red está peor. Ahí solo se guarda lo que
 * la persona tiene en pantalla.
 */
const MAXIMO_CATALOGO_COMPLETO = 150;

export function Precalentar({ rutas, visibles }: { rutas: string[]; visibles: string[] }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator) || navigator.onLine === false) return;

    // En conexiones lentas o con ahorro de datos, no. La lista ya funciona.
    const red = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (red?.saveData || red?.effectiveType === "2g" || red?.effectiveType === "slow-2g") return;

    const objetivo = rutas.length <= MAXIMO_CATALOGO_COMPLETO ? rutas : visibles;
    let cancelado = false;

    const traer = async () => {
      for (const ruta of objetivo) {
        if (cancelado || navigator.onLine === false) return;
        // Una a una y sin bloquear: esto va por detrás de lo que la persona
        // esté haciendo, nunca por delante.
        await fetch(ruta, { credentials: "same-origin" }).catch(() => {});
      }
    };

    const ocioso = window.requestIdleCallback ?? ((f: () => void) => window.setTimeout(f, 1500));
    const id = ocioso(() => void traer());

    return () => {
      cancelado = true;
      window.cancelIdleCallback?.(id as number);
    };
  }, [rutas, visibles]);

  return null;
}
