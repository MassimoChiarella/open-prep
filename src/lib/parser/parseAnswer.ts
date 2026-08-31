import type { UnitType } from "@/lib/domain";

export type ScaleHint = "k" | "m" | "b";

export interface ParseAnswerOptions {
  locale?: string;
}

export interface ParsedAnswer {
  raw: string;
  value: number | null;
  unitHint?: UnitType;
  scaleHint?: ScaleHint;
  isPercentageInput: boolean;
  parseError?: string;
}

interface NumberFormatPolicy {
  decimal: string;
  group: string;
  legacyDecimalComma: boolean;
}

const scaleMultipliers: Record<ScaleHint, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000
};

const scaleWords: Record<string, ScaleHint> = {
  thousand: "k",
  thousands: "k",
  million: "m",
  millions: "m",
  billion: "b",
  billions: "b"
};

const currencyToken = /[$€£¥₹]|\b(?:usd|eur|gbp|jpy|inr|dollars?|euros?|pounds?|yen|rupees?)\b/iu;
const currencyPrefix = /^(?:[$€£¥₹]|(?:usd|eur|gbp|jpy|inr|dollars?|euros?|pounds?|yen|rupees?))\s*/iu;
const currencySuffix = /\s*(?:[$€£¥₹]|(?:usd|eur|gbp|jpy|inr|dollars?|euros?|pounds?|yen|rupees?))$/iu;
const percentageToken = /%|\bpercent(?:age)?\b|\bporcentaje\b|\bpor\s+ciento\b|\bpour\s+cent\b|\bprozent\b|\bpercentagem\b|\bpor\s+cento\b|百分(?:比|之)|パーセント|بالمئة|في\s+المئة|प्रतिशत/iu;
const percentagePrefix = /^(?:百分之)\s*/u;
const percentageSuffix = /\s*(?:%|percent(?:age)?|porcentaje|por\s+ciento|pour\s+cent|prozent|percentagem|por\s+cento|百分比|パーセント|بالمئة|في\s+المئة|प्रतिशत)$/iu;
const scaleSuffix = /\s*(thousands?|millions?|billions?|[kmb])\s*$/iu;

export function parseAnswer(rawInput: string, options: ParseAnswerOptions = {}): ParsedAnswer {
  const raw = rawInput;
  const baseResult: ParsedAnswer = { raw, value: null, isPercentageInput: false };
  let input = normalizeLocalizedNumericCharacters(rawInput.trim().toLowerCase());

  if (input.length === 0) {
    return { ...baseResult, parseError: "Enter a number." };
  }

  let sign = 1;
  let signWasConsumed = false;
  if (input.startsWith("(") && input.endsWith(")")) {
    if (input.slice(1, -1).includes("(") || input.slice(1, -1).includes(")")) {
      return { ...baseResult, parseError: "Enter a valid number." };
    }
    sign = -1;
    signWasConsumed = true;
    input = input.slice(1, -1).trim();
    if (input.startsWith("+") || input.startsWith("-")) {
      return { ...baseResult, parseError: "Enter a valid number." };
    }
  }

  if (input.startsWith("+") || input.startsWith("-")) {
    sign *= input.startsWith("-") ? -1 : 1;
    signWasConsumed = true;
    input = input.slice(1).trim();
  }

  const hasCurrency = currencyToken.test(input);
  const hasPercent = percentageToken.test(input);
  if (hasCurrency && hasPercent) {
    return {
      ...baseResult,
      unitHint: "currency",
      isPercentageInput: true,
      parseError: "Use either a currency or percentage unit, not both."
    };
  }

  if (hasCurrency) {
    const stripped = stripSingleAffix(input, currencyPrefix, currencySuffix);
    if (stripped === undefined || currencyToken.test(stripped)) {
      return { ...baseResult, unitHint: "currency", parseError: "Enter a valid number." };
    }
    input = stripped;
  }

  if (hasPercent) {
    const stripped = stripSingleAffix(input, percentagePrefix, percentageSuffix);
    if (stripped === undefined || percentageToken.test(stripped)) {
      return {
        ...baseResult,
        unitHint: "percentage",
        isPercentageInput: true,
        parseError: "Enter a valid number."
      };
    }
    input = stripped;
  }

  const scaleMatch = input.match(scaleSuffix);
  let scaleHint: ScaleHint | undefined;
  if (scaleMatch !== null) {
    scaleHint = scaleWords[scaleMatch[1]] ?? (scaleMatch[1] as ScaleHint);
    input = input.slice(0, scaleMatch.index).trim();
    if (scaleSuffix.test(input)) {
      return {
        ...baseResult,
        unitHint: hasPercent ? "percentage" : hasCurrency ? "currency" : undefined,
        isPercentageInput: hasPercent,
        parseError: "Use only one scale suffix or word."
      };
    }
  }

  if (hasPercent && scaleHint !== undefined) {
    return {
      ...baseResult,
      unitHint: "percentage",
      scaleHint,
      isPercentageInput: true,
      parseError: "Do not combine a percentage with a scale suffix."
    };
  }

  if ((input.startsWith("+") || input.startsWith("-")) && signWasConsumed) {
    return { ...baseResult, parseError: "Enter a valid number." };
  }

  if (input.length === 0) {
    return {
      ...baseResult,
      unitHint: hasPercent ? "percentage" : hasCurrency ? "currency" : undefined,
      scaleHint,
      isPercentageInput: hasPercent,
      parseError: "Enter a numeric value."
    };
  }

  const parsedValue = parseNumericText(input, numberFormatPolicy(options.locale));
  if ("parseError" in parsedValue) {
    return {
      ...baseResult,
      unitHint: hasPercent ? "percentage" : hasCurrency ? "currency" : undefined,
      scaleHint,
      isPercentageInput: hasPercent,
      parseError: parsedValue.parseError
    };
  }

  const scaledValue = sign * parsedValue.value * (scaleHint === undefined ? 1 : scaleMultipliers[scaleHint]);

  return {
    raw,
    value: hasPercent ? scaledValue / 100 : scaledValue,
    unitHint: hasPercent ? "percentage" : hasCurrency ? "currency" : undefined,
    scaleHint,
    isPercentageInput: hasPercent
  };
}

function stripSingleAffix(input: string, prefix: RegExp, suffix: RegExp): string | undefined {
  if (prefix.test(input)) return input.replace(prefix, "").trim();
  if (suffix.test(input)) return input.replace(suffix, "").trim();
  return undefined;
}

function numberFormatPolicy(locale: string | undefined): NumberFormatPolicy {
  const resolvedLocale = locale ?? "en-US";
  try {
    const parts = new Intl.NumberFormat(resolvedLocale).formatToParts(12_345.6);
    const decimal = normalizeLocalizedNumericCharacters(parts.find((part) => part.type === "decimal")?.value ?? ".");
    const group = normalizeLocalizedNumericCharacters(parts.find((part) => part.type === "group")?.value ?? ",");
    return { decimal, group, legacyDecimalComma: locale === undefined };
  } catch {
    return { decimal: ".", group: ",", legacyDecimalComma: locale === undefined };
  }
}

function parseNumericText(
  input: string,
  policy: NumberFormatPolicy
): { value: number; parseError?: never } | { value?: never; parseError: string } {
  const fractionParts = input.split("/");
  if (fractionParts.length > 2) return { parseError: "Enter a valid number." };

  const numerator = parseLocalizedNumber(fractionParts[0], policy);
  if (numerator === undefined) return { parseError: "Enter a valid number." };
  if (fractionParts.length === 1) return { value: numerator };

  const denominator = parseLocalizedNumber(fractionParts[1], policy);
  if (denominator === undefined) return { parseError: "Enter a valid number." };
  if (denominator === 0) return { parseError: "Fraction denominator cannot be zero." };
  return { value: numerator / denominator };
}

function parseLocalizedNumber(input: string, policy: NumberFormatPolicy): number | undefined {
  let value = input.trim();
  let sign = "";
  if (value.startsWith("+") || value.startsWith("-")) {
    sign = value[0];
    value = value.slice(1);
  }
  if (value.length === 0 || /[+-]/u.test(value)) return undefined;

  if (policy.legacyDecimalComma && value.includes(".") && value.includes(",")) {
    const decimal = value.lastIndexOf(",") > value.lastIndexOf(".") ? "," : ".";
    return parseLocalizedNumber(value, {
      decimal,
      group: decimal === "," ? "." : ",",
      legacyDecimalComma: false
    });
  }

  const decimalCount = countOccurrences(value, policy.decimal);
  const groupCount = policy.group === policy.decimal ? 0 : countOccurrences(value, policy.group);
  let integerPart = value;
  let fractionPart: string | undefined;

  if (decimalCount > 1) return undefined;
  if (decimalCount === 1) {
    [integerPart, fractionPart] = splitOnce(value, policy.decimal);
  } else if (groupCount > 0 && !validGroupedInteger(value, policy.group)) {
    if (policy.legacyDecimalComma && policy.group === "," && groupCount === 1) {
      [integerPart, fractionPart] = splitOnce(value, policy.group);
    } else {
      return undefined;
    }
  }

  const normalizedInteger = normalizeGroupedInteger(integerPart, policy.group);
  if (normalizedInteger === undefined) return undefined;
  if (fractionPart !== undefined && !/^\d+$/u.test(fractionPart)) return undefined;
  if (normalizedInteger.length === 0 && fractionPart === undefined) return undefined;

  const normalized = `${sign}${normalizedInteger.length === 0 ? "0" : normalizedInteger}${fractionPart === undefined ? "" : `.${fractionPart}`}`;
  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function normalizeGroupedInteger(input: string, localeGroup: string): string | undefined {
  if (input.length === 0) return "";
  const candidateSeparators = Array.from(new Set([localeGroup, " ", "'", "’"].filter(Boolean)));
  const usedSeparators = candidateSeparators.filter((separator) => input.includes(separator));
  if (usedSeparators.length === 0) return /^\d+$/u.test(input) ? input : undefined;
  if (usedSeparators.length > 1) return undefined;

  const groups = input.split(usedSeparators[0]);
  if (groups.length < 2 || !/^\d{1,3}$/u.test(groups[0]) || groups.slice(1).some((group) => !/^\d{3}$/u.test(group))) {
    return undefined;
  }
  return groups.join("");
}

function validGroupedInteger(input: string, group: string): boolean {
  return normalizeGroupedInteger(input, group) !== undefined;
}

function splitOnce(input: string, separator: string): [string, string] {
  const index = input.indexOf(separator);
  return [input.slice(0, index), input.slice(index + separator.length)];
}

function countOccurrences(input: string, token: string): number {
  if (token.length === 0) return 0;
  return input.split(token).length - 1;
}

function normalizeLocalizedNumericCharacters(input: string): string {
  return input
    .replace(/[\u00a0\u202f]/gu, " ")
    .replace(/[\u0660-\u0669]/gu, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/gu, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0966-\u096f]/gu, (digit) => String(digit.charCodeAt(0) - 0x0966))
    .replace(/[\uff10-\uff19]/gu, (digit) => String(digit.charCodeAt(0) - 0xff10))
    .replace(/[\u066b\uff0e]/gu, ".")
    .replace(/[\u066c\uff0c]/gu, ",")
    .replace(/[\u066a\uff05]/gu, "%")
    .replace(/[\u2212\uff0d]/gu, "-")
    .replace(/\uff0b/gu, "+")
    .replace(/\s+/gu, " ");
}
