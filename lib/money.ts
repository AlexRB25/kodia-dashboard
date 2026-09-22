/**
 * Dinero: siempre en unidades menores enteras (centavos) y con su moneda.
 * Nunca se suma ni se guarda un decimal: 0.1 + 0.2 != 0.3.
 */

/** Decimales de una moneda: USD/MXN = 2, JPY = 0, KWD = 3. */
export function currencyExponent(currency: string): number {
  try {
    return (
      new Intl.NumberFormat("en-US", { style: "currency", currency }).resolvedOptions()
        .maximumFractionDigits ?? 2
    );
  } catch {
    return 2;
  }
}

/**
 * Convierte un monto decimal de la API de un canal ("35.48", 35.48) a unidades
 * menores enteras (3548). Trabaja con el texto, sin decimales flotantes, y
 * redondea hacia arriba a partir de la mitad. Devuelve null si no es un monto
 * válido (negativo, vacío, con formato raro o demasiado grande).
 */
export function parseAmountToMinor(value: unknown, currency: string): number | null {
  const text =
    typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";

  if (!/^\d+(\.\d+)?$/.test(text)) {
    return null;
  }

  const exponent = currencyExponent(currency);
  const [whole, fraction = ""] = text.split(".");
  const padded = (fraction + "0".repeat(exponent)).slice(0, exponent);

  let minor = BigInt(whole + padded);

  if (fraction.length > exponent && fraction[exponent] >= "5") {
    minor += BigInt(1);
  }

  return minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}

/** Texto para mostrar: 123456 + "MXN" -> "$1,234.56". */
export function formatMoney(minorUnits: number, currency: string): string {
  const exponent = currencyExponent(currency);

  try {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency }).format(
      minorUnits / 10 ** exponent,
    );
  } catch {
    return `${(minorUnits / 10 ** exponent).toFixed(exponent)} ${currency}`;
  }
}
