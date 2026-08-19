"use client";

import { useExigeEdad, useSincronizacion } from "@/lib/usar-sesion";

/**
 * Envuelve contenido de catálogo renderizado en el servidor. Sin confirmación
 * de edad no se muestra nada y se redirige a la entrada del evento.
 */
export function SoloConEdad({ slug, children }: { slug: string; children: React.ReactNode }) {
  const sesion = useExigeEdad(slug);
  useSincronizacion(slug);

  // undefined es "todavía no se sabe": servidor e hidratación.
  if (sesion === undefined) return <div className="flex-1" aria-hidden />;
  if (!sesion?.edadConfirmada) return null;

  return <>{children}</>;
}
