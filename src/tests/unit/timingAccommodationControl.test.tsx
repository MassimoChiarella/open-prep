import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TimingAccommodationControl } from "@/features/timing/TimingAccommodationControl";

describe("TimingAccommodationControl", () => {
  it("exposes every policy and reports the deterministic adjusted duration", () => {
    const onChange = vi.fn();
    render(
      <TimingAccommodationControl
        onChange={onChange}
        onRememberChange={vi.fn()}
        remember={false}
        standardDurationSeconds={61}
        value="standard"
      />
    );

    expect(screen.getByLabelText("Timing choice")).toHaveValue("standard");
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Standard time",
      "Time and a half",
      "Double time",
      "Untimed practice"
    ]);
    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "time_and_a_half" } });
    expect(onChange).toHaveBeenCalledWith("time_and_a_half");
  });

  it("does not persist implicitly and exposes Remember as a separate choice", () => {
    const onRememberChange = vi.fn();
    render(
      <TimingAccommodationControl
        onChange={vi.fn()}
        onRememberChange={onRememberChange}
        remember={false}
        standardDurationSeconds={60}
        value="untimed"
      />
    );

    expect(screen.getByRole("status")).toHaveTextContent("will not expire automatically");
    expect(onRememberChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Remember this timing choice on this device" }));
    expect(onRememberChange).toHaveBeenCalledWith(true);
  });
});
