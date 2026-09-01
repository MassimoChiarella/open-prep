import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrepPlanView } from "@/features/case-practice/plan/PrepPlanView";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("PrepPlanView", () => {
  it("discloses shared-browser exposure beside profile fields without changing saves", async () => {
    const storage = new MemoryAppStorage();

    render(<PrepPlanView storageFactory={() => storage} />);

    await screen.findByRole("heading", { name: "Preparation profile" });

    const disclosureText = screen.getByText(
      "Saved preparation profile data is browser-local, unencrypted, and visible to anyone with access to this browser profile."
    );
    const disclosure = disclosureText.closest("#prep-profile-shared-device-disclosure");
    if (!(disclosure instanceof HTMLElement)) throw new Error("Missing profile disclosure container.");

    expect(disclosure).toHaveClass("min-w-0", "grid-cols-[minmax(0,1fr)]", "[overflow-wrap:anywhere]");
    expect(within(disclosure).getByRole("link", { name: "Manage backups and clear saved data in Settings" }))
      .toHaveAttribute("href", "/settings");

    const interviewDate = screen.getByLabelText("Interview date (optional)");
    const targetFirms = screen.getByRole("textbox", { name: /^Target firms \(optional\)/ });
    expect(interviewDate).toHaveAttribute("aria-describedby", "prep-profile-shared-device-disclosure");
    expect(targetFirms).toHaveAttribute(
      "aria-describedby",
      "target-firms-help prep-profile-shared-device-disclosure"
    );
    expect(targetFirms).toHaveAttribute("dir", "auto");

    fireEvent.change(targetFirms, { target: { value: "Long Firm Name" } });
    expect(screen.getByText("Long Firm Name")).toHaveAttribute("dir", "auto");
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    expect(await screen.findByText("Your preparation profile and weekly target are saved.")).toBeInTheDocument();
    expect(storage.peekAll("practice_records")).toEqual([
      expect.objectContaining({ kind: "prep_profile", targetFirms: ["Long Firm Name"] })
    ]);
  });
});
