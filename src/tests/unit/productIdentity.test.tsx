import { readFileSync } from "node:fs";
import path from "node:path";

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { metadata } from "@/app/layout";
import { LocalizedAppShell, returnToNeutralRoute } from "@/components/LocalizedAppShell";
import { coreMessages } from "@/features/i18n/messages/core";

vi.mock("@/components/AppNav", () => ({
  AppNav: () => <nav aria-label="Test navigation" />
}));
vi.mock("@/features/offline/OfflineStatusIndicator", () => ({
  OfflineStatusIndicator: () => null
}));

describe("OpenPrep product identity", () => {
  it("uses the product name and comprehensive descriptor in app metadata", () => {
    expect(metadata).toMatchObject({
      applicationName: "OpenPrep",
      description: "Open-source, accessible, local-first consulting interview preparation with offline support.",
      title: {
        default: "OpenPrep",
        template: "%s | OpenPrep"
      }
    });
  });

  it("renders the untranslated product name with a translated descriptor", () => {
    render(<LocalizedAppShell><main>Practice</main></LocalizedAppShell>);

    expect(screen.getByText("OpenPrep")).toBeInTheDocument();
    expect(screen.queryByText("Open Prep")).not.toBeInTheDocument();
    expect(screen.getByText("Consulting interview preparation")).toBeInTheDocument();
  });

  it("returns every invalidated tab to the neutral route", () => {
    const replace = vi.fn();

    returnToNeutralRoute({ replace });

    expect(replace).toHaveBeenCalledWith("/");
  });

  it("keeps the proper name out of locale catalogs while translating the descriptor", () => {
    for (const [locale, messages] of Object.entries(coreMessages)) {
      expect(messages).not.toHaveProperty("OpenPrep");
      expect(messages["Consulting interview preparation"]).toBeTruthy();
      if (locale !== "en") {
        expect(messages["Consulting interview preparation"]).not.toBe("Consulting interview preparation");
      }
    }
  });

  it("ships original, non-calculator-only source artwork", () => {
    for (const filename of ["app-icon.svg", "maskable-icon.svg"]) {
      const source = readFileSync(path.join(process.cwd(), "public", "icons", filename), "utf8");
      expect(source).toContain("OpenPrep");
      expect(source).not.toMatch(/calculator|mental math/i);
    }
  });
});
