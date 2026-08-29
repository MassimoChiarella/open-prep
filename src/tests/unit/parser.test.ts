import { describe, expect, it } from "vitest";

import { parseAnswer } from "@/lib/parser/parseAnswer";

describe("parseAnswer", () => {
  it("parses plain numbers and comma-separated numbers", () => {
    expect(parseAnswer("1000000")).toMatchObject({
      value: 1_000_000,
      isPercentageInput: false
    });
    expect(parseAnswer("1,000,000")).toMatchObject({
      value: 1_000_000,
      isPercentageInput: false
    });
  });

  it("parses K/M/B suffixes", () => {
    expect(parseAnswer("1M")).toMatchObject({
      value: 1_000_000,
      scaleHint: "m"
    });
    expect(parseAnswer("1.0M")).toMatchObject({
      value: 1_000_000,
      scaleHint: "m"
    });
    expect(parseAnswer("1000K")).toMatchObject({
      value: 1_000_000,
      scaleHint: "k"
    });
  });

  it("parses currency symbols and scale words", () => {
    expect(parseAnswer("$1M")).toMatchObject({
      value: 1_000_000,
      unitHint: "currency",
      scaleHint: "m"
    });
    expect(parseAnswer("$1.25 million")).toMatchObject({
      value: 1_250_000,
      unitHint: "currency",
      scaleHint: "m"
    });
    expect(parseAnswer("1.5 billion dollars")).toMatchObject({
      value: 1_500_000_000,
      unitHint: "currency",
      scaleHint: "b"
    });
  });

  it("parses percentages as decimal ratios", () => {
    expect(parseAnswer("15%")).toMatchObject({
      value: 0.15,
      unitHint: "percentage",
      isPercentageInput: true
    });
    expect(parseAnswer("15 percent")).toMatchObject({
      value: 0.15,
      unitHint: "percentage",
      isPercentageInput: true
    });
  });

  it("parses decimals and simple fractions", () => {
    expect(parseAnswer("0.15")).toMatchObject({
      value: 0.15,
      isPercentageInput: false
    });
    expect(parseAnswer("1/4")).toMatchObject({
      value: 0.25,
      isPercentageInput: false
    });
  });

  it("accepts common international number and unit conventions", () => {
    expect(parseAnswer("12,5%")).toMatchObject({ value: 0.125, unitHint: "percentage" });
    expect(parseAnswer("1.234,56 €")).toMatchObject({ value: 1_234.56, unitHint: "currency" });
    expect(parseAnswer("₹ 2 500")).toMatchObject({ value: 2_500, unitHint: "currency" });
    expect(parseAnswer("15 porcentaje")).toMatchObject({ value: 0.15, unitHint: "percentage" });
    expect(parseAnswer("15 pour cent")).toMatchObject({ value: 0.15, unitHint: "percentage" });
    expect(parseAnswer("15 por ciento")).toMatchObject({ value: 0.15, unitHint: "percentage" });
    expect(parseAnswer("15 por cento")).toMatchObject({ value: 0.15, unitHint: "percentage" });
    expect(parseAnswer("百分之１５")).toMatchObject({ value: 0.15, unitHint: "percentage" });
    expect(parseAnswer("١٢٫٥٪")).toMatchObject({ value: 0.125, unitHint: "percentage" });
    expect(parseAnswer("۱۲٬۵۰۰")).toMatchObject({ value: 12_500 });
    expect(parseAnswer("१२,५")).toMatchObject({ value: 12.5 });
    expect(parseAnswer("1,5/3")).toMatchObject({ value: 0.5 });
  });

  it("returns parse errors for malformed inputs", () => {
    expect(parseAnswer("").parseError).toBe("Enter a number.");
    expect(parseAnswer("abc").parseError).toBe("Enter a valid number.");
    expect(parseAnswer("1/0").parseError).toBe("Fraction denominator cannot be zero.");
    expect(parseAnswer("$15%").parseError).toBe("Use either a currency or percentage unit, not both.");
    expect(parseAnswer("1M million").parseError).toBe("Use only one scale suffix or word.");
  });
});
