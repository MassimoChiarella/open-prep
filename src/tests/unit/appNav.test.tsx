import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/AppNav";
import { I18nProvider } from "@/features/i18n/I18nProvider";

const navigationState = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => navigationState.pathname }));

afterEach(() => {
  navigationState.pathname = "/";
});

describe("AppNav", () => {
  it("keeps the compact menu through large screens and lets desktop labels wrap", () => {
    render(<I18nProvider><AppNav /></I18nProvider>);

    const navigation = screen.getByTestId("primary-navigation");
    const [compactDashboard, desktopDashboard] = screen.getAllByRole("link", { name: "Dashboard" });

    expect(navigation.firstElementChild).toHaveClass("xl:hidden");
    expect(navigation.lastElementChild).toHaveClass("xl:grid");
    expect(navigation.querySelector("details > div")).toHaveClass("end-0");
    expect(navigation.querySelector("details > div")).not.toHaveClass("right-0");
    expect(compactDashboard.firstElementChild).not.toHaveClass("truncate");
    expect(compactDashboard).toHaveClass("min-h-11", "px-1");
    expect(desktopDashboard.firstElementChild).not.toHaveClass("truncate");
  });

  it("keeps a clear More affordance while naming the current secondary destination", () => {
    navigationState.pathname = "/market-sizing";
    render(<I18nProvider><AppNav /></I18nProvider>);

    const more = screen.getByLabelText("More destinations: Market Sizing");
    const marketSizingLinks = screen.getAllByRole("link", { name: "Market Sizing" });

    expect(more).toHaveTextContent("More");
    expect(more).not.toHaveTextContent("Market Sizing");
    expect(marketSizingLinks.every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
  });
});
