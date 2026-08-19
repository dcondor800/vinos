export default function NoEncontrado() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl">No encontramos esta página</h1>
      <p className="mt-3 text-hueso-suave">
        Puede que el enlace esté mal o que la feria ya haya terminado. Vuelve a escanear el
        QR del evento.
      </p>
    </main>
  );
}
