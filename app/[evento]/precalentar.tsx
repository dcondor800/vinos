"use client";

import { useEffect } from "react";

/**
 * Guarda fichas en el dispositivo mientras hay señal, para que sigan abriendo
 * cuando se caiga.
 *
 * El service worker cachea lo que se visita, así que la lista queda disponible
 * por el solo hecho de haber pasado por ella. Las fichas no: quedarse sin red
 * justo al tocar un vino deja esa pantalla inexistente, que es el momento
 * exacto en que se usa la app frente al stand.
 *
 * No hay un número máximo de vinos, sino un presupuesto de descarga. Un tope
 * por cantidad obliga a adivinar el tamaño del catálogo —que cambia con cada
 * feria— y falla por los dos lados: se queda corto en una pequeña y descarga de
 * más en una grande. Con presupuesto, una feria de treinta etiquetas entra
 * entera y una de cuatrocientas guarda las que caben, empezando por las que la
 * persona tiene más probabilidad de abrir.
 */

/**
 * Unos 3 MB. En una feria con la red saturada esto tarda minutos en segundo
 * plano, y pasarse compite con la navegación de todo el mundo.
 */
const PRESUPUESTO = 3 * 1024 * 1024;

/** El servidor comprime; lo que se mide es el texto sin comprimir. */
const COMPRESION = 4;

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
      let gastado = 0;

      for (const ruta of rutas) {
        if (cancelado || navigator.onLine === false) return;
        if (gastado >= PRESUPUESTO) return;

        try {
          // Una a una y sin bloquear: esto va por detrás de lo que la persona
          // esté haciendo, nunca por delante.
          const respuesta = await fetch(ruta, { credentials: "same-origin" });
          const declarado = Number(respuesta.headers.get("content-length"));
          const texto = await respuesta.text();

          gastado += declarado || texto.length / COMPRESION;
        } catch {
          // Se cortó la red: lo guardado hasta aquí sigue sirviendo.
          return;
        }
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
