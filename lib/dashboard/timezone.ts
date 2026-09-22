/**
 * "Hoy" depende de la zona horaria del negocio: un pedido de las 11 pm en
 * Ciudad de México ya es "mañana" en UTC. Aquí se calculan los límites de cada
 * día calendario en la zona del negocio, sin dependencias externas.
 */

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function getParts(date: Date, timeZone: string): Parts {
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const get = (type: string) => Number(formatted.find((part) => part.type === type)?.value);

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Diferencia (ms) entre la hora local de la zona y UTC en ese instante. */
function offsetAt(date: Date, timeZone: string): number {
  const p = getParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Instante UTC en que empieza el día calendario (año, mes, día) en la zona dada. */
function zonedMidnight(year: number, month: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, month - 1, day);
  const first = offsetAt(new Date(guess), timeZone);
  let candidate = guess - first;

  // Si el cambio de horario cae entre medias, se corrige con el desfase real
  const second = offsetAt(new Date(candidate), timeZone);

  if (second !== first) {
    candidate = guess - second;
  }

  return new Date(candidate);
}

/** Zona horaria válida, o la de Ciudad de México si viene algo inválido. */
export function safeTimeZone(timeZone: string | null | undefined): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timeZone ?? "" });
    return timeZone as string;
  } catch {
    return "America/Mexico_City";
  }
}

export type DayRange = {
  /** Inicio del primer día (inclusive). */
  from: Date;
  /** Inicio del día siguiente al último (exclusivo). */
  to: Date;
  /** Claves YYYY-MM-DD de cada día calendario del rango, en orden. */
  days: string[];
  /** Inicio del último día (el "hoy" del rango), inclusive. */
  lastDayStart: Date;
};

/**
 * Los últimos `count` días calendario terminando en el día de `now`, en la zona
 * horaria dada. count = 1 es solo "hoy".
 */
export function lastDays(now: Date, timeZone: string, count: number): DayRange {
  const today = getParts(now, timeZone);
  const days: string[] = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day - offset));
    days.push(d.toISOString().slice(0, 10));
  }

  const first = new Date(Date.UTC(today.year, today.month - 1, today.day - (count - 1)));
  const next = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));

  return {
    from: zonedMidnight(first.getUTCFullYear(), first.getUTCMonth() + 1, first.getUTCDate(), timeZone),
    to: zonedMidnight(next.getUTCFullYear(), next.getUTCMonth() + 1, next.getUTCDate(), timeZone),
    days,
    lastDayStart: zonedMidnight(today.year, today.month, today.day, timeZone),
  };
}
