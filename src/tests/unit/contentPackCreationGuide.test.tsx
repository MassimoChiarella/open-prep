import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContentPackCreationGuide } from "@/features/question-packs/ContentPackCreationGuide";

vi.mock("@/features/i18n/I18nProvider", () => ({
  useI18n: () => ({
    t: (message: string, values?: Record<string, string>) => Object.entries(values ?? {}).reduce(
      (result, [key, value]) => result.replaceAll(`{${key}}`, value),
      message
    )
  })
}));

describe("ContentPackCreationGuide", () => {
  it("defaults to an honest multi-format series plan and links every authoring route", () => {
    render(<ContentPackCreationGuide />);

    expect(screen.getByRole("button", { name: "Multi-format series" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/one format per pack file/i)).toHaveTextContent(
      "A single mixed-format file or one practice session spanning those files is not available yet"
    );
    expect(screen.getAllByRole("button", { name: /^About / })).toHaveLength(5);

    const destinations = [
      ["Fixed numeric builder", "#fixed-numeric-builder"],
      ["Case questioning builder", "#case-questioning-builder"],
      ["Generated and interview math", "#content-pack-starters-numeric"],
      ["Exhibits", "#content-pack-starters-exhibits"],
      ["Market sizing", "#content-pack-starters-market-sizing"],
      ["Benchmarks", "#content-pack-starters-benchmarks"],
      ["Broader case practice", "#content-pack-starters-case-practice"]
    ] as const;

    for (const [name, href] of destinations) {
      expect(screen.getByRole("link", { name: new RegExp(name, "i") })).toHaveAttribute("href", href);
    }
  });

  it("switches to concise single-format guidance", () => {
    render(<ContentPackCreationGuide />);

    const singlePack = screen.getByRole("button", { name: "Single-format pack" });
    fireEvent.click(singlePack);

    expect(singlePack).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Current task: choose one format")).toBeInTheDocument();
    expect(screen.getByText(/Choose one builder or starter below/i)).toBeInTheDocument();
    expect(screen.queryByText(/single mixed-format file/i)).not.toBeInTheDocument();
  });
});
