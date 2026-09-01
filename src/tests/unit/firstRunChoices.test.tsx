import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { FirstRunChoices } from "@/features/progress/FirstRunChoices";

const i18n = vi.hoisted(() => ({
  t: (message: string) => message
}));

vi.mock("@/features/i18n/I18nProvider", () => ({
  useI18n: () => ({ t: i18n.t })
}));

const primaryActions = [
  ["Build my prep plan", "/case-practice/plan"],
  ["Take a baseline", "/benchmark"],
  ["Practice a specific skill", "/case-practice"]
] as const;

describe("FirstRunChoices", () => {
  beforeEach(() => {
    i18n.t = (message: string) => message;
  });

  it("links each primary intent to its frozen destination and leaves Content Packs disabled", () => {
    render(<FirstRunChoices showContentPacksAction={false} />);

    for (const [name, href] of primaryActions) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }

    expect(screen.queryByRole("link", { name: "Find or create a content pack" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Skip for now and browse drills" })).toHaveAttribute(
      "href",
      "/drills"
    );
  });

  it("adds the Content Packs intent only when explicitly enabled", () => {
    render(<FirstRunChoices showContentPacksAction />);

    expect(screen.getByRole("link", { name: "Find or create a content pack" })).toHaveAttribute(
      "href",
      "/content-packs?view=discover"
    );
  });

  it("keeps accessible names and keyboard order aligned with the visual order", () => {
    render(<FirstRunChoices showContentPacksAction />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("aria-label") ?? link.textContent)).toEqual([
      "Build my prep plan",
      "Take a baseline",
      "Practice a specific skill",
      "Find or create a content pack",
      "Skip for now and browse drills"
    ]);

    for (const link of links) {
      expect(link).toHaveProperty("tabIndex", 0);
      expect(link).not.toHaveAttribute("tabindex");
      link.focus();
      expect(link).toHaveFocus();
    }

    expect(screen.getByRole("link", { name: "Build my prep plan" })).toHaveAccessibleDescription(
      "Set your goals and turn them into a focused weekly roadmap."
    );
  });

  it("is a direct-navigation section rather than a dialog, form, or profile gate", () => {
    render(<FirstRunChoices showContentPacksAction={false} />);

    expect(screen.getByRole("region", { name: "Choose how to start" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("form")).not.toBeInTheDocument();
    expect(screen.queryByText(/account|profile|employer|school/i)).not.toBeInTheDocument();
  });

  it("uses one-column minimum tracks and wrap-safe text for 320px and long translations", () => {
    const longLabel = "BuildMyPreparationPlanWithAnIntentionallyLongUnbrokenTranslationThatMustRemainContained";
    const longDescription = "Averylonglocalizeddescriptionwithoutnaturalbreakpointsmuststayinsideitsavailableinlinearea.";
    i18n.t = (message: string) => {
      if (message === "Build my prep plan") return longLabel;
      if (message === "Set your goals and turn them into a focused weekly roadmap.") return longDescription;
      return message;
    };

    render(<FirstRunChoices showContentPacksAction={false} />);

    const region = screen.getByTestId("first-run-choices");
    const list = within(region).getByRole("list");
    const choice = screen.getByRole("link", { name: longLabel });

    expect(region).toHaveClass("min-w-0", "max-w-full");
    expect(list).toHaveClass("min-w-0", "max-w-full", "grid-cols-[minmax(0,1fr)]");
    expect(choice).toHaveClass("min-w-0", "max-w-full", "grid-cols-[minmax(0,1fr)_auto]");
    expect(within(choice).getByText(longLabel)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
    expect(within(choice).getByText(longDescription)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
  });

  it("uses a logical arrow treatment that reverses under RTL without locale fixtures", () => {
    render(
      <div dir="rtl">
        <FirstRunChoices showContentPacksAction={false} />
      </div>
    );

    for (const arrow of screen.getAllByTestId("first-run-choice-arrow")) {
      expect(arrow).toHaveAttribute("aria-hidden", "true");
      expect(arrow).toHaveClass("rtl:rotate-180");
      expect(arrow.closest("[dir='rtl']")).not.toBeNull();
    }
  });
});
