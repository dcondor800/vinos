'use client';

/**
 * Lectura del estado local desde React. `undefined` significa "todavía no se
 * sabe" (render del servidor e hidratación), y es distinto de `null`, que ya es
 * una respuesta: no hay sesión.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { instantaneaServidor, suscribir } from '@/lib/almacen';
import { instantaneaPedido, type PedidoLocal } from '@/lib/pedido';
import { instantaneaPerfil, sincronizarPerfil, type PerfilGuardado } from '@/lib/perfil';
import { instantaneaSesion, sincronizarSesion, type SesionLocal } from '@/lib/sesion';
import { instantaneaVista, VISTA_INICIAL, type Vista } from '@/lib/vista';

export function useSesion(slug: string): SesionLocal | null | undefined {
  const leer = useCallback(() => instantaneaSesion(slug), [slug]);
  return useSyncExternalStore<SesionLocal | null | undefined>(
    suscribir,
    leer,
    instantaneaServidor,
  );
}

export function usePerfil(slug: string): PerfilGuardado | null | undefined {
  const leer = useCallback(() => instantaneaPerfil(slug), [slug]);
  return useSyncExternalStore<PerfilGuardado | null | undefined>(
    suscribir,
    leer,
    instantaneaServidor,
  );
}

export function usePedido(slug: string): PedidoLocal | null | undefined {
  const leer = useCallback(() => instantaneaPedido(slug), [slug]);
  return useSyncExternalStore<PedidoLocal | null | undefined>(
    suscribir,
    leer,
    instantaneaServidor,
  );
}

export function useVista(slug: string): Vista | undefined {
  const leer = useCallback(() => instantaneaVista(slug) ?? VISTA_INICIAL, [slug]);
  return useSyncExternalStore<Vista | undefined>(suscribir, leer, instantaneaServidor);
}

/**
 * Gate de edad para las pantallas internas: sin confirmación no se muestra
 * catálogo. Devuelve undefined mientras no se sabe, para que quien lo use
 * muestre un placeholder en vez de parpadear contenido.
 */
export function useExigeEdad(slug: string): SesionLocal | null | undefined {
  const router = useRouter();
  const sesion = useSesion(slug);

  useEffect(() => {
    if (sesion !== undefined && !sesion?.edadConfirmada) router.replace(`/${slug}`);
  }, [router, slug, sesion]);

  return sesion;
}

/** Reintenta las filas pendientes al montar y cuando vuelve la red. */
export function useSincronizacion(slug: string): void {
  useEffect(() => {
    // En este orden por la FK perfiles.sesion_id → sesiones.id: si la sesión no
    // está arriba, el insert del perfil rebota.
    const reintentar = () => {
      void sincronizarSesion(slug).then(() => sincronizarPerfil(slug));
    };
    reintentar();
    window.addEventListener('online', reintentar);
    return () => window.removeEventListener('online', reintentar);
  }, [slug]);
}
