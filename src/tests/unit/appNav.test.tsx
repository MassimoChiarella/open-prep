import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppNav } from "@/components/AppNav";

let pathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => pathname
}));

describe("AppNav", () => {
  beforeEach(() => {
    pathname = "/";
  });

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
});
