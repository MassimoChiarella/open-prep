import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LocalSettingsView } from "@/features/settings/LocalSettingsView";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

vi.mock("@/features/question-packs/QuestionPackManager", () => ({
  QuestionPackManager: () => <div data-testid="question-pack-manager">Question pack manager</div>
}));

describe("LocalSettingsView", () => {
  it("keeps saved preferences primary and explains that drill edits are launch-specific", async () => {
    const storage = new MemoryAppStorage();

    render(<LocalSettingsView storageFactory={() => storage} />);

    const appearance = screen.getByTestId("settings-appearance");
    const preferences = screen.getByTestId("settings-preferences");

    expect(within(appearance).getByRole("heading", { name: "Appearance" })).toBeInTheDocument();
    expect(within(appearance).getByRole("combobox", { name: "Theme" })).toHaveValue("system");
    expect(await within(preferences).findByText(/Setup changes affect one launch/)).toBeInTheDocument();
    expect(within(preferences).getByRole("link", { name: "Open Drill Setup" })).toHaveAttribute("href", "/drills");
    expect(within(preferences).getByText("Language coverage")).toBeInTheDocument();
    expect(within(preferences).getByText(/Bundled practice questions/)).toBeInTheDocument();
    expect(appearance.compareDocumentPosition(preferences) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    for (const testId of ["settings-local-data", "settings-content-packs", "settings-offline", "settings-reset"]) {
      const disclosure = screen.getByTestId(testId);

      expect(disclosure).not.toHaveAttribute("open");
      expect(preferences.compareDocumentPosition(disclosure) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it("preserves import and reset confirmations inside their disclosures", async () => {
    const storage = new MemoryAppStorage();

    render(<LocalSettingsView storageFactory={() => storage} />);
    await screen.findByText(/Built-in defaults initialize/);

    const localData = openDisclosure("settings-local-data");
    const importConfirmation = within(localData).getByLabelText(
      "I understand this replaces local progress on this device."
    );
    const includePrivateStories = within(localData).getByLabelText(
      "Include saved Fit/PEI story text in this export."
    );

    expect(localData).toHaveTextContent("Saved Fit/PEI stories can contain private personal text");
    expect(includePrivateStories).not.toBeChecked();
    fireEvent.click(includePrivateStories);
    expect(includePrivateStories).toBeChecked();
    expect(importConfirmation).toBeDisabled();
    expect(within(localData).getByRole("button", { name: "Import And Replace" })).toBeDisabled();

    const reset = openDisclosure("settings-reset");
    const resetButton = within(reset).getByRole("button", { name: "Reset Local Data" });

    expect(reset).toHaveTextContent("drill defaults and presets");
    expect(reset).toHaveTextContent("mistake and review schedules");
    expect(reset).toHaveTextContent("case-practice attempts, preparation profiles, and saved fit stories");
    expect(resetButton).toBeDisabled();
    fireEvent.click(
      within(reset).getByLabelText("I understand this clears local practice data on this device.")
    );
    expect(resetButton).toBeEnabled();
  });
});

function openDisclosure(testId: string): HTMLElement {
  const disclosure = screen.getByTestId(testId) as HTMLDetailsElement;

  fireEvent.click(disclosure.querySelector("summary") as HTMLElement);
  expect(disclosure.open).toBe(true);

  return disclosure;
}
