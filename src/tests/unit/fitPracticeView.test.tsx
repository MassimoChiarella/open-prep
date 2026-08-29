import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FitPracticeView } from "@/features/case-practice/fit/FitPracticeView";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("FitPracticeView accessibility", () => {
  it("describes invalid fields and focuses the first error", async () => {
    const storage = new MemoryAppStorage();
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      callback(0);
      return 0;
    });

    render(<FitPracticeView storageFactory={() => storage} />);

    const title = await screen.findByLabelText("Story title");
    fireEvent.click(screen.getByRole("button", { name: "Save Story" }));

    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveAttribute("aria-invalid", "true");
    expect(title).toHaveAttribute("aria-describedby", "fit-story-title-error");
    expect(screen.getByText("Story title is required.")).toHaveAttribute("id", "fit-story-title-error");

    fireEvent.change(title, { target: { value: "Led a difficult turnaround" } });

    expect(title).toHaveAttribute("aria-invalid", "false");
    expect(title).not.toHaveAttribute("aria-describedby");
    expect(screen.queryByText("Story title is required.")).not.toBeInTheDocument();
  });
});
