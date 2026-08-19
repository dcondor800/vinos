# Especificación del MVP

## Alcance

**Dentro del MVP:** gate de edad, quiz de gustos, motor de recomendación, ficha del vino, pedido agrupado por stand, código de recojo, carga de catálogo por CSV.

**Fuera del MVP (fase 2):** mapa del evento, panel de bodega, búsqueda por texto libre con IA, analítica, agenda de catas, notificaciones.

Si una funcionalidad no está en la lista de arriba, no la implementes todavía aunque parezca obvia.

---

## Pantalla 1 — Entrada `/[evento]`

Logo y nombre del evento, una frase de qué hace la app, y el gate de edad.

- Botón único: "Tengo 18 años o más". Al confirmarlo se crea la sesión anónima y se guarda `edad_confirmada`.
- Enlace secundario discreto: "Ver el catálogo completo" para quien no quiere hacer el quiz.
- Si la sesión ya existe y confirmó edad, redirige directo a `/quiz` o a `/resultados` si ya tiene perfil.

**Criterio de aceptación:** recargar la página no vuelve a pedir la confirmación de edad.

---

## Pantalla 2 — Quiz `/[evento]/quiz`

Cinco pasos, una pregunta por pantalla, con barra de progreso. Cada respuesta avanza sola sin botón de "siguiente", salvo en las de selección múltiple.

1. **¿Qué sueles tomar?** (múltiple) → `tipos`
   Tinto · Blanco · Rosado · Espumante · Dulce o de postre · Me da igual, sorpréndeme

2. **¿Dulce o seco?** (única) → `dulzor` 1–5
   Bien seco (1) · Seco (2) · Intermedio (3) · Semidulce (4) · Dulce (5)

3. **¿Ligero o intenso?** (única) → `cuerpo` 1–5
   Ligero y fácil (1) · Suave (2) · Equilibrado (3) · Con cuerpo (4) · Intenso y potente (5)

4. **¿Con qué lo vas a acompañar?** (múltiple) → `maridajes`
   Carnes rojas · Aves · Pescados y mariscos · Pastas · Quesos · Postres · Solo, para tomar

5. **¿Cuánto quieres gastar por botella?** (única) → `precioMax`
   Hasta S/50 · Hasta S/100 · Hasta S/200 · Sin límite

Al terminar se guarda el perfil en `perfiles` y redirige a resultados.

**Criterio de aceptación:** el quiz completo se responde en menos de 30 segundos. Si tarda más, hay demasiadas preguntas o demasiadas opciones.

---

## Pantalla 3 — Resultados `/[evento]/resultados`

Lista de 8 a 12 vinos ordenados por score descendente, calculado con `lib/recomendacion.ts`.

Cada tarjeta muestra: foto, nombre, bodega, tipo y varietal, precio, código de stand, y la fila de chips de razones.

- Arriba, un resumen editable del perfil en una línea: "Tintos, con cuerpo, para carnes, hasta S/100" con un enlace "Cambiar".
- Diversidad obligatoria: máximo 2 vinos de la misma bodega en la lista.
- Solo se muestran productos con `disponible = true`.
- Si hay menos de 4 resultados, se relajan los filtros de precio y tipo y se avisa: "Ampliamos la búsqueda para mostrarte más opciones".

**Criterio de aceptación:** los resultados se calculan en el cliente sobre el catálogo cacheado y aparecen sin spinner perceptible.

---

## Pantalla 4 — Ficha `/[evento]/vino/[id]`

Foto, nombre, bodega, origen (país y valle), añada, varietal, precio.

- Descripción en prosa corta.
- Perfil sensorial: cuerpo, dulzor, acidez y taninos como barras de 1 a 5. Nada de gráficos radiales.
- Notas de cata y maridajes como chips.
- Ubicación: "Stand B-14 · Zona Chile" en un bloque destacado. Es la información que la persona realmente necesita.
- Acción principal fija abajo: "Agregar al pedido".

---

## Pantalla 5 — Pedido `/[evento]/pedido`

Los items agrupados por stand, porque así es como la persona va a caminar el evento.

Por cada stand: código, nombre de la bodega, sus vinos con cantidad ajustable, y el subtotal de ese stand.

- Total general, con la aclaración visible: "Precios referenciales. El pago se realiza en cada stand."
- Botón "Generar código de recojo" que crea el pedido y devuelve un código de 6 caracteres alfanuméricos en mayúsculas, sin caracteres ambiguos (sin O, 0, I, 1).
- El código se muestra grande, junto con un QR que codifica la URL del pedido para que el staff del stand lo escanee.
- El pedido queda accesible en `localStorage` para poder volver a él.

**Criterio de aceptación:** si se pierde la conexión al generar el pedido, el código se genera igual del lado del cliente y el pedido se sincroniza cuando vuelve la red.

---

## Carga de catálogo

Ruta protegida `/admin/[evento]/importar` con clave simple por variable de entorno. No necesita autenticación real en el MVP.

Sube un CSV con las columnas del esquema de `productos`. Valida, muestra una previsualización con los errores por fila, y confirma la carga.

Los campos sensoriales (`cuerpo`, `dulzor`, `acidez`, `taninos`, `notas`, `maridajes`) van a llegar vacíos en el 80% de las filas porque las bodegas no los tienen. Deja preparado un botón "Completar atributos faltantes" que en fase 2 los inferirá desde la descripción comercial. En el MVP, esos campos se completan a mano.

---

## Orden de construcción sugerido

1. Esquema en Supabase + seed de prueba
2. `lib/recomendacion.ts` con sus tests
3. Layout base, tema por evento, sesión anónima y gate de edad
4. Quiz
5. Resultados y ficha
6. Pedido y código
7. Importador CSV
8. Service worker y cacheo del catálogo

El punto 8 va al final pero no es opcional. Es lo que hace que la app funcione el día del evento.
