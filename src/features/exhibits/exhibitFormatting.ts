import type { ExhibitCellValue, ExhibitColumn } from "@/features/exhibits/exhibitTypes";
import type { UnitType } from "@/lib/domain";

function createFormats(locale: string) {
  return {
    compactCurrency: new Intl.NumberFormat(locale, { currency: "USD", currencyDisplay: "narrowSymbol", maximumFractionDigits: 1, minimumFractionDigits: 0, notation: "compact", style: "currency" }),
    currency: new Intl.NumberFormat(locale, { currency: "USD", currencyDisplay: "narrowSymbol", maximumSignificantDigits: 21, minimumFractionDigits: 0, style: "currency" }),
    integer: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    decimal: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }),
    number: new Intl.NumberFormat(locale, { maximumSignificantDigits: 21 }),
    percentage: new Intl.NumberFormat(locale, { maximumSignificantDigits: 21, style: "percent" })
  };
}

// Reuse formatters across table cells without retaining an unbounded locale cache.
let cached: { locale: string; formats: ReturnType<typeof createFormats> } | undefined;
function formats(locale: string) {
  if (cached?.locale !== locale) cached = { locale, formats: createFormats(locale) };
  return cached.formats;
}

function formatted(format: Intl.NumberFormat, value: number): string {
  return format.formatToParts(value)
    .map((part) => part.type === "currency" ? "$" : part.value.replace(/[\u061c\u200e\u200f]/gu, ""))
    .join("");
}

export const exhibitUnitLabels: Record<UnitType, string> = {
  b: "B",
  currency: "$",
  customers: "Customers",
  days: "Days",
  k: "K",
  m: "M",
  months: "Months",
  none: "",
  percentage: "%",
  percentage_points: "pp",
  stores: "Stores",
  units: "Units",
  users: "Users",
  years: "Years"
};

export function formatExhibitCellValue(value: ExhibitCellValue, column: ExhibitColumn, locale = "en-US"): string {
  if (typeof value === "string") {
    return value;
  }

  if (column.valueType === "currency") {
    return formatted(formats(locale).currency, value);
  }

  if (column.valueType === "percentage") {
    return formatted(formats(locale).percentage, value);
  }

  if (column.valueType === "year") {
    return String(value);
  }

  return formatNumber(value, locale);
}

export function formatExhibitAxisValue(value: number, column: ExhibitColumn, locale = "en-US"): string {
  if (column.valueType === "currency") return formatted(formats(locale).compactCurrency, value);
  if (column.valueType === "percentage") return `${formatted(formats(locale).decimal, value * 100)}%`;
  return column.valueType === "year" ? String(value) : formatted(formats(locale).decimal, value);
}

export function formatExhibitAnswerValue(value: number, unit: UnitType = "none", locale = "en-US"): string {
  if (unit === "currency") {
    return formatted(formats(locale).currency, value);
  }

  if (unit === "percentage") {
    return formatted(formats(locale).percentage, value);
  }

  const label = exhibitUnitLabels[unit].toLowerCase();

  return `${formatNumber(value, locale)}${label.length === 0 ? "" : ` ${label}`}`;
}

export function unitLabelForExhibitColumn(column: ExhibitColumn): string | undefined {
  if (column.unit === undefined || column.unit === "none") {
    return undefined;
  }

  const unitLabel = exhibitUnitLabels[column.unit];

  if (unitLabel.length === 0 || unitLabel.toLowerCase() === column.label.toLowerCase()) {
    return undefined;
  }

  return unitLabel;
}

function formatNumber(value: number, locale: string): string {
  const selected = formats(locale);
  return formatted(Number.isInteger(value) ? selected.integer : selected.number, value);
}
