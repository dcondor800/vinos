/**
 * La raíz no es una pantalla del producto: a la app se entra siempre por el QR
 * del evento, en /[evento]. Esto existe para que quien llegue al dominio pelado
 * no vea un error.
 */
export default function Raiz() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
      <h1 className="font-serif text-3xl">Vinos</h1>
      <p className="mt-3 text-hueso-suave">
        Escanea el QR de la feria para entrar a su catálogo.
      </p>
    </main>
  );
}
