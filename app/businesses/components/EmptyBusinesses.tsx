export default function EmptyBusinesses() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-2xl">
            +
          </div>
        </div>

        <h2 className="text-2xl font-semibold text-white">
          Crea tu primer negocio
        </h2>

        <p className="mt-3 text-sm leading-6 text-gray-400">
          Agrega tu negocio para comenzar a configurar Kodia y administrar tus
          servicios desde un solo lugar.
        </p>

        <button
          type="button"
          className="mt-7 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
        >
          Crear negocio
        </button>
      </div>
    </div>
  );
}