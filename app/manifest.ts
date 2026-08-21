import type { MetadataRoute } from "next";

/**
 * Hace la app instalable: al agregarla a la pantalla de inicio se abre sin la
 * barra del navegador.
 *
 * Los colores no son los del evento sino los de la superficie de la app. El
 * manifest es único para todas las ferias, y el color de marca depende de cuál
 * se esté visitando.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vinos · guía de la feria",
    short_name: "Vinos",
    description:
      "Encuentra el vino que te va a gustar entre los que están en la feria, y en qué stand recogerlo.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#17131a",
    theme_color: "#17131a",
    lang: "es",
    icons: [
      { src: "/icono-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icono-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
