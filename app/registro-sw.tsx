"use client";

import { useEffect } from "react";

/**
 * Registra el service worker. Se hace después de la carga para que no compita
 * por ancho de banda con la primera pantalla, que es la única que
 * obligatoriamente necesita red.
 *
 * En desarrollo no se registra: un service worker sirviendo archivos viejos
 * mientras se edita código vuelve loco a cualquiera.
 */
export function RegistroSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const registrar = () => {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" });
    };

    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);

  return null;
}
