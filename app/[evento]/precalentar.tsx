"use client";

import { useEffect } from "react";

/**
 * Guarda en el dispositivo las fichas de los vinos que están en pantalla.
 *
 * El service worker cachea lo que se visita, así que la lista queda disponible
 * sin señal por el solo hecho de haber pasado por ella. Las fichas no: si se
 * cae el WiFi justo cuando alguien toca un vino, esa pantalla no existe todavía
 * en su teléfono. Pedirlas por adelantado cierra ese hueco, que es el momento
 * exacto en que se usa la app frente al stand.
 *
 * Se limita a lo que se está viendo. Precargar un catálogo de cientos de vinos
 * sería descargar mucho para leer poco, justo cuando la red está peor.
 */
export function Precalentar({ rutas }: { rutas: string[] }) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator) || navigator.onLine === false) return;

    // En conexiones lentas o con ahorro de datos, no. La lista ya funciona.
    const red = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (red?.saveData || red?.effectiveType === "2g" || red?.effectiveType === "slow-2g") return;

    let cancelado = false;

    const traer = async () => {
      for (const ruta of rutas) {
        if (cancelado) return;
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
  }, [rutas]);

  return null;
}
