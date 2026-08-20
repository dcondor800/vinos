import Link from "next/link";

/**
 * La ve quien escanea un QR viejo o teclea mal el slug, y llega sin historial:
 * el botón atrás tampoco existe. Necesita al menos una salida.
 */
export default function NoEncontrado() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl">No encontramos esta página</h1>
      <p className="mt-3 text-hueso-suave text-pretty">
        Puede que el enlace esté mal o que la feria ya haya terminado.
      </p>
      <Link href="/" className="boton boton-primario mt-8 w-full text-base">
        Ver las ferias activas
      </Link>
    </main>
  );
}
