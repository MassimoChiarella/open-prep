import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InfoHint } from "@/components/InfoHint";

describe("InfoHint", () => {
  it("keeps shared alignment and opts into mobile end alignment only when requested", () => {
    const { rerender } = render(<InfoHint align="start" label="Position">Help</InfoHint>);
    fireEvent.focus(screen.getByRole("button"));
    expect(screen.getByRole("tooltip")).toHaveClass("start-0");
    expect(screen.getByRole("tooltip")).not.toHaveClass("end-0");
    rerender(<InfoHint align="start" alignEndOnMobile label="Position">Help</InfoHint>);
    expect(screen.getByRole("tooltip")).toHaveClass("end-0", "sm:start-0");
    rerender(<InfoHint align="center" label="Position">Help</InfoHint>);
    expect(screen.getByRole("tooltip")).toHaveClass("start-1/2", "-translate-x-1/2", "rtl:translate-x-1/2");
    rerender(<InfoHint align="end" label="Position">Help</InfoHint>);
    expect(screen.getByRole("tooltip")).toHaveClass("end-0");
  });

  it("exposes help on focus and closes it with Escape", () => {
    render(<InfoHint label="About this step">Helpful context</InfoHint>);

    const trigger = screen.getByRole("button", { name: "About this step" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).not.toHaveAttribute("title");
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.focus(trigger);
    const tooltip = screen.getByRole("tooltip");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", tooltip.id);
    expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveTextContent("Helpful context");

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("supports hover, tap toggling, and outside dismissal", () => {
    render(<InfoHint label="More information">More detail</InfoHint>);

    const trigger = screen.getByRole("button", { name: "More information" });
    const container = trigger.parentElement;
    expect(container).not.toBeNull();

    fireEvent.mouseEnter(container!);
    expect(screen.getByRole("tooltip")).toHaveTextContent("More detail");
    fireEvent.mouseLeave(container!);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
