import { describe, expect, it } from "vitest";

import {
  darkExhibitChartColors,
  lightExhibitChartColors
} from "@/features/exhibits/exhibitChartData";
import { darkPalette, lightPalette } from "../../../tailwind.config";

type Rgb = [number, number, number];
type AppPalette = Record<keyof typeof lightPalette, string>;

describe("color contrast", () => {
  it.each([
    ["light", lightPalette],
    ["dark", darkPalette]
  ] as const)("keeps %s core text and action pairs at WCAG AA contrast", (mode, colors) => {
    for (const pair of coreContrastPairs(colors)) {
      expect(contrastRatio(pair.foreground, pair.background), `${mode}: ${pair.label}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each([
    ["light", lightPalette],
    ["dark", darkPalette]
  ] as const)("keeps %s control boundaries distinguishable", (mode, colors) => {
    const boundary = blend(colors.ink, colors.white, 0.5);

    expect(contrastRatio(boundary, colors.white), `${mode}: control boundary`).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ["light", lightPalette, lightExhibitChartColors],
    ["dark", darkPalette, darkExhibitChartColors]
  ] as const)("keeps %s selection and chart marks distinguishable", (mode, colors, chartColors) => {
    expect(contrastRatio(colors.selectionText, colors.saffron), `${mode}: selected text`).toBeGreaterThanOrEqual(4.5);

    for (const color of chartColors) {
      expect(contrastRatio(color, colors.white), `${mode}: chart color ${color}`).toBeGreaterThanOrEqual(3);
    }
  });
});

function coreContrastPairs(colors: AppPalette) {
  return [
    { background: colors.paper, foreground: colors.ink, label: "body text on paper" },
    { background: colors.white, foreground: colors.ink, label: "body text on surface" },
    { background: colors.white, foreground: colors.teal, label: "teal links and labels on surface" },
    { background: colors.paper, foreground: colors.teal, label: "teal labels on paper" },
    { background: colors.mint, foreground: colors.teal, label: "teal labels on mint" },
    { background: colors.ink, foreground: colors.white, label: "inverse text on ink actions" },
    { background: colors.teal, foreground: colors.white, label: "inverse text on teal actions" },
    { background: colors.white, foreground: colors.coral, label: "coral labels on surface" },
    { background: colors.paper, foreground: colors.coral, label: "coral labels on paper" },
    { background: colors.coral, foreground: colors.white, label: "inverse text on coral actions" },
    {
      background: colors.white,
      foreground: blend(colors.ink, colors.white, 0.65),
      label: "muted ink text on surface"
    },
    {
      background: colors.paper,
      foreground: blend(colors.ink, colors.paper, 0.65),
      label: "muted ink text on paper"
    },
    {
      background: colors.mint,
      foreground: blend(colors.ink, colors.mint, 0.65),
      label: "muted ink text on mint"
    },
    {
      background: blend(colors.coral, colors.white, 0.1),
      foreground: colors.ink,
      label: "ink text on coral status tint"
    },
    {
      background: blend(colors.saffron, colors.white, 0.15),
      foreground: colors.ink,
      label: "ink text on saffron status tint"
    },
    {
      background: blend(colors.mint, colors.white, 0.7),
      foreground: colors.ink,
      label: "ink text on mint status tint"
    }
  ];
}

function contrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = relativeLuminance(hexToRgb(foreground));
  const backgroundLuminance = relativeLuminance(hexToRgb(background));
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance([red, green, blue]: Rgb): number {
  const [linearRed, linearGreen, linearBlue] = [red, green, blue].map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  );

  return 0.2126 * linearRed + 0.7152 * linearGreen + 0.0722 * linearBlue;
}

function blend(foreground: string, background: string, alpha: number): string {
  const foregroundRgb = hexToRgb(foreground);
  const backgroundRgb = hexToRgb(background);
  const blended = foregroundRgb.map((channel, index) => channel * alpha + backgroundRgb[index] * (1 - alpha)) as Rgb;

  return rgbToHex(blended);
}

function hexToRgb(hex: string): Rgb {
  const normalized = hex.replace("#", "");

  return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16) / 255) as Rgb;
}

function rgbToHex(rgb: Rgb): string {
  return `#${rgb
    .map((channel) =>
      Math.round(channel * 255)
        .toString(16)
        .padStart(2, "0")
    )
    .join("")}`;
}
