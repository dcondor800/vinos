# Contexto del proyecto

App web para ferias de vinos. El asistente entra al evento, escanea un QR, describe sus gustos, recibe sugerencias de vinos que están físicamente en el evento, arma un pedido y lo recoge en el stand donde paga presencialmente.

**La app no cobra ni procesa pagos.** El pago ocurre en el stand, en efectivo o con el POS de la bodega. La "orden" es una lista de recojo con un código. Nunca implementes pasarelas de pago ni flujos de checkout.

## Stack

- Next.js 16.3.1 (App Router) + React 19 + TypeScript
- Supabase (Postgres + RLS) — cliente `@supabase/ssr`
- Tailwind CSS
- PWA con service worker (catálogo cacheado)
- Sin librería de estado global. Server Components para lectura, `useState` local y URL params para lo demás.

## Reglas duras

**Multi-tenant desde el día uno.** Toda tabla de dominio lleva `evento_id`. Toda ruta pública vive bajo `/[evento]` usando el `slug` del evento. Nunca escribas una query sin filtrar por evento.

**Sin registro de usuarios.** El asistente es una sesión anónima identificada por un UUID en `localStorage`. No hay login, ni contraseñas, ni email obligatorio. Cualquier propuesta de "crear cuenta" es un error de diseño.

**Offline primero.** El WiFi del evento va a fallar en el momento pico. El catálogo completo se descarga y cachea al primer acceso. Las pantallas de catálogo, recomendaciones y ficha deben funcionar sin red. Solo la creación del pedido requiere conexión, y si falla se guarda local y se reintenta.

**El motor de recomendación no usa IA en el MVP.** Es scoring determinista sobre atributos (`lib/recomendacion.ts`). Es rápido, gratis, testeable y no alucina vinos que no están en el evento. La capa de IA llega en fase 2 y solo para dos cosas: interpretar texto libre y redactar la explicación. Nunca le mandes el catálogo completo a un modelo para que elija.

**Gate de edad.** Al entrar se confirma que el usuario es mayor de 18. Se guarda en la sesión. Sin esa confirmación no se muestra catálogo.

## Estructura de rutas

```
/[evento]                    landing + gate de edad
/[evento]/quiz               cuestionario de gustos (5 pasos)
/[evento]/resultados         lista de sugerencias ordenadas por score
/[evento]/vino/[id]          ficha del vino
/[evento]/pedido             pedido agrupado por stand + código de recojo
```

## Dirección visual

El contexto de uso manda: la persona está de pie en un salón de convenciones con luz fuerte, sosteniendo el teléfono con una mano y una copa con la otra.

- **Superficie oscura**, no blanca. Reduce el reflejo bajo luz de feria y hace que las fotos de botellas resalten. Fondo cercano a `#17131A` con texto hueso `#EDE7E0`.
- **El color de marca viene del evento** (`eventos.color_primario`), inyectado como variable CSS. Se usa solo en acciones y acentos, nunca como fondo. La app es el escenario, la marca del cliente es lo que se ve.
- **Tipografía en dos roles:** una serif con carácter para nombres de vino y bodega, que evoca la etiqueta; una sans neutra para toda la interfaz. No uses la misma familia para ambos.
- **Todo alcanzable con el pulgar.** Acciones principales en la mitad inferior de la pantalla. Áreas táctiles de 44px mínimo.
- **Elemento distintivo:** la fila de razones. Cada vino sugerido muestra 2 o 3 chips cortos que explican por qué encaja ("cuerpo ligero", "va con carnes", "dentro de tu presupuesto"). Eso es lo que convierte un buscador con filtros en una recomendación. No lo sacrifiques por espacio.
- Sentence case en toda la interfaz. Los botones dicen exactamente qué hacen: "Agregar al pedido", no "Continuar".

## Convenciones de código

- Nombres de dominio en español (`producto`, `pedido`, `expositor`), código y tipos en inglés donde sea estándar de Next/React.
- Tipos derivados del esquema con `supabase gen types typescript`.
- Sin `any`. Sin `console.log` en el código final.
- Componentes de servidor por defecto; `"use client"` solo donde haya interacción real.
- Next 16: `params`, `searchParams` y `cookies()` son promesas, van con `await`. Casi todo el código de App Router que circula por ahí es de Next 13/14 y los trata como valores directos. Ante la duda, consulta `node_modules/next/dist/docs/` como pide `AGENTS.md`.
