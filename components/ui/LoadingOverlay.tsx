import Image from "next/image";

/**
 * Capa a pantalla completa que bloquea los clics mientras algo se está
 * procesando. Aparece con un pequeño retraso para no parpadear en cargas muy
 * rápidas; mientras tanto ya bloquea la interacción.
 */
export default function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-7 bg-[#031c26]/75 backdrop-blur-[2px]"
      style={{ animation: "kodia-fade-in 200ms ease-out 150ms both" }}
    >
      <Image
        src="/kodia-logo.png"
        alt="K-odia"
        width={180}
        height={55}
        loading="eager"
        className="h-auto w-[150px]"
      />

      <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-[#13d6b5]/20 border-t-[#13d6b5]" />

      <span className="sr-only">Cargando…</span>
    </div>
  );
}
