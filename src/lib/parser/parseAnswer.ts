import type { UnitType } from "@/lib/domain";

export type ScaleHint = "k" | "m" | "b";

export interface ParsedAnswer {
  raw: string;
  value: number | null;
  unitHint?: UnitType;
  scaleHint?: ScaleHint;
  isPercentageInput: boolean;
  parseError?: string;
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

const numberPattern = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;
const fractionPattern = /^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\/([+-]?(?:\d+(?:\.\d+)?|\.\d+))$/;

export function parseAnswer(rawInput: string): ParsedAnswer {
  const raw = rawInput;
  const baseResult: ParsedAnswer = {
    raw,
    value: null,
    isPercentageInput: false
  };

  let input = normalizeLocalizedNumericCharacters(rawInput.trim().toLowerCase().replace(/\u00a0/g, " "));

  if (input.length === 0) {
    return { ...baseResult, parseError: "Enter a number." };
  }

  const isParenthesizedNegative = input.startsWith("(") && input.endsWith(")");
  if (isParenthesizedNegative) {
    input = `-${input.slice(1, -1).trim()}`;
  }

  const hasCurrency = /[$€£¥₹]|(?:\b(?:usd|eur|gbp|jpy|inr)\b)|(?:\b(?:dollars?|euros?|pounds?|yen|rupees?)\b)/iu.test(input);
  const hasPercent =
    /%|(?:\bpercent(?:age)?\b)|(?:\bporcentaje\b|\bpor\s+ciento\b)|(?:\bpour\s+cent\b)|(?:\bprozent\b)|(?:\bpercentagem\b|\bpor\s+cento\b)|百分(?:比|之)|パーセント|(?:بالمئة|في\s+المئة)|प्रतिशत/iu.test(input);

  if (hasCurrency && hasPercent) {
    return {
      ...baseResult,
      unitHint: "currency",
      isPercentageInput: true,
      parseError: "Use either a currency or percentage unit, not both."
    };
  }

  let unitHint: UnitType | undefined = hasCurrency ? "currency" : undefined;
  if (hasPercent) {
    unitHint = "percentage";
  }

  let normalized = input
    .replace(/[$€£¥₹]/gu, "")
    .replace(/\b(?:usd|eur|gbp|jpy|inr)\b/giu, "")
    .replace(/\b(?:dollars?|euros?|pounds?|yen|rupees?)\b/giu, "")
    .replace(/%/g, "")
    .replace(/\bpercent(?:age)?\b/giu, "")
    .replace(/\bporcentaje\b|\bpor\s+ciento\b|\bpour\s+cent\b|\bprozent\b|\bpercentagem\b|\bpor\s+cento\b|百分(?:比|之)|パーセント|بالمئة|في\s+المئة|प्रतिशत/giu, "")
    .trim();

  const scaleHints: ScaleHint[] = [];
  normalized = normalized.replace(/\b(thousands?|millions?|billions?)\b/g, (match) => {
    scaleHints.push(scaleWords[match]);
    return "";
  });

  const suffixMatch = normalized.match(/([kmb])\s*$/);
  if (suffixMatch) {
    scaleHints.push(suffixMatch[1] as ScaleHint);
    normalized = normalized.slice(0, suffixMatch.index).trim();
  }

  const uniqueScaleHints = Array.from(new Set(scaleHints));
  if (uniqueScaleHints.length > 1 || scaleHints.length > 1) {
    return {
      ...baseResult,
      unitHint,
      isPercentageInput: hasPercent,
      parseError: "Use only one scale suffix or word."
    };
  }

  const scaleHint = uniqueScaleHints[0];
  const scaleMultiplier = scaleHint ? scaleMultipliers[scaleHint] : 1;
  const numericText = normalizeNumericSeparators(normalized.replace(/[\s'’]/gu, ""));

  if (numericText.length === 0) {
    return {
      ...baseResult,
      unitHint,
      scaleHint,
      isPercentageInput: hasPercent,
      parseError: "Enter a numeric value."
    };
  }

  const parsedValue = parseNumericText(numericText);
  if ("parseError" in parsedValue) {
    return {
      ...baseResult,
      unitHint,
      scaleHint,
      isPercentageInput: hasPercent,
      parseError: parsedValue.parseError
    };
  }

  const scaledValue = parsedValue.value * scaleMultiplier;
  const value = hasPercent ? scaledValue / 100 : scaledValue;

  return {
    raw,
    value,
    unitHint,
    scaleHint,
    isPercentageInput: hasPercent
  };
}

function normalizeNumericSeparators(input: string): string {
  const slashParts = input.split("/");
  if (slashParts.length > 1) {
    return slashParts.map(normalizeDecimalSeparators).join("/");
  }

  return normalizeDecimalSeparators(input);
}

function normalizeLocalizedNumericCharacters(input: string): string {
  return input
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0966-\u096f]/g, (digit) => String(digit.charCodeAt(0) - 0x0966))
    .replace(/[\uff10-\uff19]/g, (digit) => String(digit.charCodeAt(0) - 0xff10))
    .replace(/[\u066b\uff0e]/g, ".")
    .replace(/[\u066c\uff0c]/g, ",")
    .replace(/[\u066a\uff05]/g, "%")
    .replace(/[\u2212\uff0d]/g, "-")
    .replace(/\uff0b/g, "+");
}

function normalizeDecimalSeparators(input: string): string {
  const lastComma = input.lastIndexOf(",");
  const lastDot = input.lastIndexOf(".");

  if (lastComma >= 0 && lastDot >= 0) {
    return lastComma > lastDot
      ? input.replaceAll(".", "").replace(",", ".")
      : input.replaceAll(",", "");
  }

  if (lastComma < 0) return input;

  const commaParts = input.split(",");
  const groupedThousands =
    commaParts.length > 1 &&
    commaParts.slice(1).every((part) => /^\d{3}$/.test(part)) &&
    /^[+-]?\d{1,3}$/.test(commaParts[0]);

  return groupedThousands ? commaParts.join("") : input.replace(",", ".");
}

function parseNumericText(input: string): { value: number; parseError?: never } | { value?: never; parseError: string } {
  const fractionMatch = input.match(fractionPattern);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);

    if (denominator === 0) {
      return { parseError: "Fraction denominator cannot be zero." };
    }

    return { value: numerator / denominator };
  }

  if (!numberPattern.test(input)) {
    return { parseError: "Enter a valid number." };
  }

  const value = Number(input);
  if (!Number.isFinite(value)) {
    return { parseError: "Enter a finite number." };
  }

  return { value };
}
