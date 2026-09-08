import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/AppNav";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname
}));

describe("AppNav", () => {
  beforeEach(() => {
    pathname = "/";
  });

  afterEach(() => vi.restoreAllMocks());

  it("exposes Content Packs in desktop navigation and mobile More", () => {
    render(<AppNav />);

    const links = screen.getAllByRole("link", { name: "Content Packs" });
    expect(links).toHaveLength(2);
    for (const link of links) expect(link).toHaveAttribute("href", "/content-packs");
  });

  it("marks Content Packs active for hub descendants and identifies it in mobile More", () => {
    pathname = "/content-packs/downloads";
    render(<AppNav />);

    for (const link of screen.getAllByRole("link", { name: "Content Packs" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    expect(screen.getByLabelText("More destinations: Content Packs")).toBeInTheDocument();
  });

  it("warns truthfully when an active drill could not save recent progress", () => {
    pathname = "/drills/session";
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<><AppNav /><div data-drill-save-state="error" /></>);

    fireEvent.click(screen.getByTestId("focused-task-exit"));

    expect(confirm).toHaveBeenCalledWith(
      "Leave this active session? Some recent progress could not be saved on this device."
    );
  });

  it("warns truthfully when active drill progress could not be saved", () => {
    pathname = "/drills/session";
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<><AppNav /><main data-drill-save-state="error" /></>);

    fireEvent.click(screen.getByTestId("focused-task-exit"));

    expect(confirm).toHaveBeenCalledWith(
      "Leave this active session? Some recent progress could not be saved on this device."
    );
  });
});
