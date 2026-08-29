import type { Config } from "tailwindcss";

export const lightPalette = {
  coral: "#744732",
  ink: "#20211f",
  mint: "#e7e2d8",
  paper: "#f2f2ee",
  saffron: "#b38b6d",
  selectionText: "#20211f",
  teal: "#3c423e",
  white: "#ffffff"
} as const;

export const darkPalette = {
  coral: "#e4a686",
  ink: "#f4f2eb",
  mint: "#2f3833",
  paper: "#141715",
  saffron: "#d8b98a",
  selectionText: "#1d211e",
  teal: "#a6c7b5",
  white: "#1d211e"
} as const;

function themeColor(name: keyof Omit<typeof lightPalette, "selectionText">): string {
  return `rgb(var(--color-${name}) / <alpha-value>)`;
}

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coral: themeColor("coral"),
        ink: themeColor("ink"),
        mint: themeColor("mint"),
        paper: themeColor("paper"),
        saffron: themeColor("saffron"),
        teal: themeColor("teal"),
        white: themeColor("white")
      },
      boxShadow: {
        sm: "0 1px 3px rgb(0 0 0 / 0.035)"
      },
      fontFamily: {
        display: ["Iowan Old Style", "Palatino Linotype", "Book Antiqua", "Georgia", "serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Consolas", "Liberation Mono", "monospace"],
        sans: ["Helvetica Neue", "Helvetica", "Arial", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  }
};

export default config;
