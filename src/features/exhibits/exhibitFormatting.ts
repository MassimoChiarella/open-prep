import type { ExhibitCellValue, ExhibitColumn } from "@/features/exhibits/exhibitTypes";
import type { UnitType } from "@/lib/domain";

const compactAxisCurrency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
  notation: "compact",
  style: "currency"
});

const practicalCurrency = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
  notation: "compact",
  style: "currency"
});

const integerNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const oneDecimalNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const twoDecimalNumber = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

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

export function formatExhibitCellValue(value: ExhibitCellValue, column: ExhibitColumn): string {
  if (typeof value === "string") {
    return value;
  }

  if (column.valueType === "currency") {
    return formatCurrency(value);
  }

  if (column.valueType === "percentage") {
    return formatPercentage(value);
  }

  if (column.valueType === "year") {
    return String(value);
  }

  return formatNumber(value);
}

export function formatExhibitAxisValue(value: number, column: ExhibitColumn): string {
  return column.valueType === "currency" ? compactAxisCurrency.format(value) : formatExhibitCellValue(value, column);
}

export function formatExhibitAnswerValue(value: number, unit: UnitType = "none"): string {
  if (unit === "currency") {
    return formatCurrency(value);
  }

  if (unit === "percentage") {
    return formatPercentage(value);
  }

  const label = exhibitUnitLabels[unit].toLowerCase();

  return `${formatCompactNumber(value)}${label.length === 0 ? "" : ` ${label}`}`;
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

function formatCurrency(value: number): string {
  return practicalCurrency.format(value);
}

function formatNumber(value: number): string {
  return (Number.isInteger(value) ? integerNumber : twoDecimalNumber).format(value);
}

function formatPercentage(value: number): string {
  return `${formatCompactNumber(value * 100)}%`;
}

function formatCompactNumber(value: number): string {
  return (Number.isInteger(value) ? integerNumber : oneDecimalNumber).format(value);
}
