import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { PrepPlanView } from "@/features/case-practice/plan/PrepPlanView";
import { publishLocalDataInvalidation } from "@/features/settings/localDataInvalidation";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

describe("PrepPlanView", () => {
  it("locks every editable control and permits only one pending save", async () => {
    const storage = new MemoryAppStorage();
    const originalPut = storage.put.bind(storage);
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    const put = vi.spyOn(storage, "put").mockImplementation(async (...args) => {
      await pending;
      return originalPut(...args);
    });
    render(<PrepPlanView storageFactory={() => storage} />);
    const firms = await screen.findByRole("textbox", { name: /^Target firms/ });
    fireEvent.change(firms, { target: { value: "First firm, Second firm" } });
    const form = firms.closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);

    expect(put).toHaveBeenCalledTimes(1);
    expect(form).toHaveAttribute("aria-busy", "true");
    for (const control of form.querySelectorAll("input, select, button")) expect(control).toBeDisabled();

    await act(async () => { release(); await pending; });
    await screen.findByText("Your preparation profile and weekly target are saved.");
    expect(firms).toBeEnabled();
    expect(firms).toHaveValue("First firm, Second firm");
    expect(form).toHaveAttribute("aria-busy", "false");
  });

  it("retains all draft values after a failed save and allows retry", async () => {
    const storage = new MemoryAppStorage();
    vi.spyOn(storage, "put").mockRejectedValueOnce(new Error("storage unavailable"));
    render(<PrepPlanView storageFactory={() => storage} />);
    const firms = await screen.findByRole("textbox", { name: /^Target firms/ });
    fireEvent.change(firms, { target: { value: "Retained firm" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    await screen.findByText("Your profile could not be saved. Your current plan preview is still available.");
    expect(firms).toBeEnabled();
    expect(firms).toHaveValue("Retained firm");
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    await screen.findByText("Your preparation profile and weekly target are saved.");
    expect(storage.peekAll("practice_records")).toEqual([expect.objectContaining({ targetFirms: ["Retained firm"] })]);
  });

  it("does not announce a pending save after local data is invalidated", async () => {
    const storage = new MemoryAppStorage();
    let release!: () => void;
    const pending = new Promise<void>((resolve) => { release = resolve; });
    vi.spyOn(storage, "put").mockImplementation(() => pending);
    render(<PrepPlanView storageFactory={() => storage} />);
    const firms = await screen.findByRole("textbox", { name: /^Target firms/ });
    fireEvent.change(firms, { target: { value: "Discarded profile" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));
    act(() => { publishLocalDataInvalidation("all_data_cleared", { broadcastChannelFactory: null, fallbackStorage: null }); });
    await act(async () => { release(); await pending; });

    expect(screen.queryByText("Your preparation profile and weekly target are saved.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Profile" })).toBeEnabled();
  });

  it("discloses shared-browser exposure and saves every edited profile field in StrictMode", async () => {
    const storage = new MemoryAppStorage();

    render(<StrictMode><PrepPlanView storageFactory={() => storage} /></StrictMode>);

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

    fireEvent.change(screen.getByRole("combobox", { name: "Experience level" }), { target: { value: "advanced" } });
    fireEvent.change(interviewDate, { target: { value: "2099-12-15" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Practice sessions per week" }), { target: { value: "8" } });
    fireEvent.change(targetFirms, { target: { value: "Long Firm Name, Another Firm" } });
    expect(screen.getByText("Long Firm Name, Another Firm")).toHaveAttribute("dir", "auto");
    fireEvent.click(screen.getByRole("button", { name: "Save Profile" }));

    expect(await screen.findByText("Your preparation profile and weekly target are saved.")).toBeInTheDocument();
    expect(storage.peekAll("practice_records")).toEqual([
      expect.objectContaining({
        experienceLevel: "advanced",
        interviewDate: "2099-12-15",
        kind: "prep_profile",
        targetFirms: ["Long Firm Name", "Another Firm"],
        weeklySessions: 8
      })
    ]);
  });
});
