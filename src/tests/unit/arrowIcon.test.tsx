import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ArrowIcon } from "@/components/ArrowIcon";

describe("ArrowIcon", () => {
  it("uses an inherited-color vector without adding a name or focus target", () => {
    const { container } = render(<button type="button">Continue<ArrowIcon /></button>);
    const icon = container.querySelector("svg");

    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(icon).toHaveAttribute("aria-hidden", "true");
    expect(icon).toHaveAttribute("focusable", "false");
    expect(icon).toHaveAttribute("fill", "none");
    expect(icon).toHaveAttribute("stroke", "currentColor");
    expect(icon).toHaveAttribute("stroke-width", "2");
    expect(icon?.querySelector("path")).toHaveAttribute("d", "M2 8h12M9 3l5 5-5 5");
    expect(icon).not.toHaveAttribute("tabindex");
  });

  it.each([
    ["right", "M2 8h12M9 3l5 5-5 5", "1em", "0 0 16 16"],
    ["left", "M14 8H2m5-5L2 8l5 5", "1em", "0 0 16 16"],
    ["up", "M4 14V2M1 5l3-3 3 3", "0.5em", "0 0 8 16"],
    ["down", "M4 2v12m-3-3 3 3 3-3", "0.5em", "0 0 8 16"]
  ] as const)("draws %s within its existing font-relative slot", (direction, path, width, viewBox) => {
    const { container } = render(<ArrowIcon direction={direction} />);
    const icon = container.querySelector("svg");

    expect(icon?.querySelector("path")).toHaveAttribute("d", path);
    expect(icon).toHaveAttribute("height", "1em");
    expect(icon).toHaveAttribute("width", width);
    expect(icon).toHaveAttribute("viewBox", viewBox);
  });

  it("keeps caller-specific sizing and RTL classes", () => {
    const { container } = render(<ArrowIcon className="w-[1ch] rtl:rotate-180" />);

    expect(container.querySelector("svg")).toHaveClass("w-[1ch]", "rtl:rotate-180");
  });
});
