/**
 * Service worker de la feria.
 *
 * El WiFi de un centro de convenciones se cae en el momento pico. Esto hace que
 * la app siga funcionando: lo ya visitado se sirve desde el dispositivo, y lo
 * que no, avisa en vez de mostrar el error del navegador.
 *
 * Tres reglas que evitan el fallo clásico de un service worker, que es servir
 * una versión vieja del HTML pidiendo archivos que ya no existen:
 *
 *  1. Todos los cachés llevan la misma versión y se borran juntos al activar,
 *     así nunca se mezcla el HTML de un despliegue con los scripts de otro.
 *  2. No se llama a skipWaiting: la versión nueva espera a que se cierren las
 *     pestañas abiertas, en vez de cambiar los cachés bajo una pantalla en uso.
 *  3. Las navegaciones van primero a la red, así con señal siempre se ve lo
 *     último publicado y el caché es solo la red de seguridad.
 */

const VERSION = 'v1';
const CACHE_BASE = `base-${VERSION}`;
const CACHE_ESTATICO = `estatico-${VERSION}`;
const CACHE_PAGINAS = `paginas-${VERSION}`;
const CACHE_IMAGENES = `imagenes-${VERSION}`;

const NUESTROS = [CACHE_BASE, CACHE_ESTATICO, CACHE_PAGINAS, CACHE_IMAGENES];

const SIN_CONEXION = '/sin-conexion.html';

/** Tope del caché de fotos. Una feria puede tener cientos de vinos. */
const MAX_IMAGENES = 80;

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_BASE).then((c) => c.addAll([SIN_CONEXION, '/icono-192.png'])),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    (async () => {
      const nombres = await caches.keys();
      await Promise.all(nombres.filter((n) => !NUESTROS.includes(n)).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/** Deja el caché por debajo del tope, tirando lo más antiguo. */
async function podar(nombre, maximo) {
  const cache = await caches.open(nombre);
  const claves = await cache.keys();
  for (let i = 0; i < claves.length - maximo; i++) await cache.delete(claves[i]);
}

async function deLaRedPrimero(peticion) {
  try {
    const respuesta = await fetch(peticion);

    if (respuesta.ok) {
      const cache = await caches.open(CACHE_PAGINAS);
      cache.put(peticion, respuesta.clone());
    }
    return respuesta;
  } catch {
    // Sin red: lo que se haya visto antes, y si no, el aviso.
    const guardada = await caches.match(peticion, { ignoreSearch: true });
    return guardada ?? (await caches.match(SIN_CONEXION));
  }
}

async function delCachePrimero(peticion, nombre, maximo) {
  const cache = await caches.open(nombre);
  const guardada = await cache.match(peticion);
  if (guardada) return guardada;

  const respuesta = await fetch(peticion);
  if (respuesta.ok) {
    await cache.put(peticion, respuesta.clone());
    if (maximo) void podar(nombre, maximo);
  }
  return respuesta;
}

self.addEventListener('fetch', (evento) => {
  const { request } = evento;

  // Nada que no sea GET: las acciones de servidor son POST y cachearlas sería
  // devolver el resultado de un pedido ajeno.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const propio = url.origin === self.location.origin;

  // El chequeo de salud tiene que decir la verdad sobre este momento.
  if (url.pathname === '/api/salud') return;

  if (request.mode === 'navigate') {
    evento.respondWith(deLaRedPrimero(request));
    return;
  }

  if (!propio && !/\.supabase\.co$/.test(url.hostname)) return;

  // Los archivos de Next llevan un hash en el nombre: no cambian nunca.
  if (propio && url.pathname.startsWith('/_next/static/')) {
    evento.respondWith(delCachePrimero(request, CACHE_ESTATICO));
    return;
  }

  const esImagen =
    request.destination === 'image' ||
    url.pathname.startsWith('/_next/image') ||
    url.pathname.includes('/storage/v1/object/public/');

  if (esImagen) {
    evento.respondWith(delCachePrimero(request, CACHE_IMAGENES, MAX_IMAGENES));
    return;
  }

  if (propio) evento.respondWith(deLaRedPrimero(request));
});
