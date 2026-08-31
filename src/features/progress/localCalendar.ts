const formatters = new Map<string, Intl.DateTimeFormat>();

export function localDateKey(value: string, timeZone?: string): string | undefined {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  try {
    const formatter = getFormatter(timeZone);
    const parts = new Map(formatter.formatToParts(date).map((part) => [part.type, part.value]));
    const year = parts.get("year");
    const month = parts.get("month");
    const day = parts.get("day");

    return year === undefined || month === undefined || day === undefined
      ? undefined
      : `${year}-${month}-${day}`;
  } catch {
    return undefined;
  }
}

export function shiftLocalDateKey(value: string, days: number): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (match === null) {
    return undefined;
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  date.setUTCDate(date.getUTCDate() + days);

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0")
  ].join("-");
}

function getFormatter(timeZone: string | undefined): Intl.DateTimeFormat {
  const key = timeZone === undefined ? "default" : `zone:${timeZone}`;
  const cached = formatters.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    ...(timeZone === undefined ? {} : { timeZone }),
    year: "numeric"
  });
  formatters.set(key, formatter);
  return formatter;
}
