import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { DrillSettingsForm, quickDrillPresets } from "@/features/drills/DrillSettingsForm";
import { parseDrillSettingsQuery } from "@/features/drills/drillSessionQuery";
import { createDrillSettings } from "@/features/drills/drillSettings";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { saveUserDrillSettings } from "@/features/settings/settingsPersistence";
import { timingAccommodationPreferenceKey } from "@/features/timing/timingAccommodationPreference";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(() => window.localStorage.removeItem(timingAccommodationPreferenceKey));

describe("DrillSettingsForm", () => {
  it("generates usable sessions for every built-in quick preset", () => {
    expect(quickDrillPresets.map((preset) => preset.label)).toEqual([
      "Arithmetic Warmup",
      "Percentage Basics",
      "Business Math",
      "Interview Math",
      "Quick Fire",
      "Accuracy Mode"
    ]);

    const presetSearchParams = quickDrillPresets.map(
      (preset) => new URL(preset.href, "http://localhost").searchParams
    );

    expect(presetSearchParams[0].get("categories")).toBe("arithmetic");
    expect(presetSearchParams[0].get("tags")).toBe("mixed_operations");
    expect(presetSearchParams[1].get("categories")).toBe("percentages");
    expect(presetSearchParams[1].get("tags")).toBe("percentage_of_number,percentage_change");
    expect(presetSearchParams[2].get("categories")).toBe("business_math");
    expect(presetSearchParams[2].get("tags")).toBe("revenue,margin");
    expect(presetSearchParams[3].get("categories")).toBe("case_math");
    expect(presetSearchParams[3].get("difficulty")).toBe("intermediate");
    expect(presetSearchParams[3].get("mode")).toBe("interview");
    expect(presetSearchParams[3].get("requireEquation")).toBe("1");
    expect(presetSearchParams[3].get("requireInterpretation")).toBe("0");
    expect(presetSearchParams[4].get("source")).toBe("quick_fire_mode");
    expect(presetSearchParams[4].get("count")).toBe("10");
    expect(presetSearchParams[4].get("timeMode")).toBe("per_question");
    expect(presetSearchParams[4].get("secondsPerQuestion")).toBe("20");
    expect(presetSearchParams[5].get("source")).toBe("accuracy_mode");
    expect(presetSearchParams[5].get("count")).toBe("10");
    expect(presetSearchParams[5].get("hints")).toBe("1");

    for (const searchParams of presetSearchParams.slice(0, 4)) {
      expect(searchParams.get("count")).toBe("5");
      expect(searchParams.get("feedbackMode")).toBe("instant");
      expect(searchParams.get("timeMode")).toBe("untimed");
    }

    for (const preset of quickDrillPresets) {
      const params = new URL(preset.href, "http://localhost").searchParams;
      const { settings } = parseDrillSettingsQuery(params);

      expect(() => createDrillSession({ seed: `preset-${preset.label}`, settings })).not.toThrow();
    }
  });

  it("keeps category guardrails and only offers compatible skills", () => {
    render(<DrillSettingsForm />);

    expect(screen.getByText("At least one category must stay selected. Add another category before clearing the current one.")).toBeInTheDocument();
    expect(screen.getByLabelText("Arithmetic")).toBeDisabled();

    openDisclosure("drill-skill-options");
    expect(screen.queryByRole("button", { name: "Revenue" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Business math"));

    expect(screen.getByRole("button", { name: "Revenue" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revenue" }));
    fireEvent.click(screen.getByLabelText("Business math"));

    expect(screen.queryByRole("button", { name: "Revenue" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Start Drill" })).not.toHaveAttribute("href", expect.stringContaining("tags="));
  });

  it("keeps generated session URLs in sync with advanced settings", () => {
    render(<DrillSettingsForm />);

    fireEvent.change(screen.getByLabelText("Timing choice"), { target: { value: "double_time" } });
    fireEvent.click(screen.getByLabelText("Business math"));
    openDisclosure("drill-skill-options");
    openDisclosure("drill-timing-options");
    openDisclosure("drill-feedback-options");
    fireEvent.click(screen.getByRole("button", { name: "Revenue" }));
    fireEvent.change(screen.getByLabelText("Preset"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /Session/ }));
    fireEvent.change(screen.getByLabelText("Total seconds"), { target: { value: "600" } });
    fireEvent.click(screen.getByRole("button", { name: /End only/ }));

    const previewParams = searchParamsForLink("Start Selected Drill");
    const startParams = searchParamsForLink("Start Drill");

    expect(Object.fromEntries(previewParams)).toEqual(Object.fromEntries(startParams));
    expect(startParams.get("categories")).toBe("arithmetic,business_math");
    expect(startParams.get("tags")).toBe("revenue");
    expect(startParams.get("count")).toBe("20");
    expect(startParams.get("timeMode")).toBe("session");
    expect(startParams.get("totalSessionSeconds")).toBe("600");
    expect(startParams.get("timingAccommodation")).toBe("double_time");
    expect(startParams.get("feedbackMode")).toBe("end_of_session");
    expect(screen.getByTestId("drill-selection-summary").parentElement).toHaveTextContent("Double time");
  });

  it("applies the selected accommodation to Quick Fire with keyboard-labelled controls", async () => {
    render(<DrillSettingsForm />);

    const timingChoice = screen.getByRole("combobox", { name: "Timing choice" });
    const remember = screen.getByRole("checkbox", {
      name: "Remember this timing choice on this device"
    });

    expect(timingChoice).toHaveValue("standard");
    expect(remember).not.toBeChecked();
    fireEvent.change(timingChoice, { target: { value: "time_and_a_half" } });

    await waitFor(() => {
      const href = screen.getByRole("link", { name: /Quick Fire/ }).getAttribute("href");
      expect(new URL(href ?? "", "http://localhost").searchParams.get("timingAccommodation"))
        .toBe("time_and_a_half");
    });
    expect(screen.getByRole("link", { name: /Quick Fire/ })).toHaveTextContent("30 sec each");
    expect(searchParamsForLink("Start Drill").get("timingAccommodation")).toBe("standard");
  });

  it("writes the remembered preference only when a launch is explicitly requested", async () => {
    window.localStorage.setItem(timingAccommodationPreferenceKey, "time_and_a_half");
    render(<DrillSettingsForm />);

    const timingChoice = await screen.findByRole("combobox", { name: "Timing choice" });
    await waitFor(() => expect(timingChoice).toHaveValue("time_and_a_half"));

    fireEvent.change(timingChoice, { target: { value: "untimed" } });
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("time_and_a_half");

    fireEvent.click(screen.getByRole("checkbox", {
      name: "Remember this timing choice on this device"
    }));
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("time_and_a_half");

    const quickFireLink = screen.getByRole("link", { name: /Quick Fire/ });
    quickFireLink.addEventListener("click", (event) => event.preventDefault());
    fireEvent.click(quickFireLink);
    expect(window.localStorage.getItem(timingAccommodationPreferenceKey)).toBe("untimed");
  });

  it("disables infeasible presets and clamps the audited 24-item filter", async () => {
    render(<DrillSettingsForm />);

    fireEvent.click(screen.getByLabelText("Growth and compounding"));
    fireEvent.click(screen.getByLabelText("Arithmetic"));
    fireEvent.click(screen.getByRole("button", { name: "Expert" }));
    openDisclosure("drill-skill-options");
    fireEvent.click(screen.getByRole("button", { name: "Compound growth" }));

    await waitFor(() => expect(screen.getByLabelText("Custom question count")).toHaveAttribute("max", "24"));
    expect(within(screen.getByLabelText("Preset")).getByRole("option", { name: "30" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Custom question count"), { target: { value: "30" } });

    expect(screen.getByLabelText("Custom question count")).toHaveValue(24);
    expect(searchParamsForLink("Start Drill").get("count")).toBe("24");
  });

  it("serializes granular arithmetic controls, hints, units, and a custom count", () => {
    render(<DrillSettingsForm />);

    openDisclosure("drill-arithmetic-options");
    openDisclosure("drill-feedback-options");
    fireEvent.change(screen.getByLabelText("Number of terms"), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Decimals" }));
    fireEvent.click(screen.getByRole("button", { name: "Large" }));
    fireEvent.change(screen.getByLabelText("Multiplication factors"), { target: { value: "multiple_25" } });
    fireEvent.click(screen.getByRole("button", { name: "Approximate" }));
    fireEvent.change(screen.getByLabelText("Division rounding"), { target: { value: "nearest_whole" } });
    fireEvent.click(screen.getByLabelText("Divide"));
    fireEvent.click(screen.getByLabelText("Use parentheses in mixed operations"));
    fireEvent.click(screen.getByLabelText("Include negative values"));
    fireEvent.change(screen.getByLabelText("Unit preference"), { target: { value: "m" } });
    fireEvent.click(screen.getByLabelText("Enable hints during the drill"));
    fireEvent.change(screen.getByLabelText("Custom question count"), { target: { value: "23" } });

    const params = searchParamsForLink("Start Drill");

    expect(Object.fromEntries(params)).toMatchObject({
      count: "23",
      hints: "1",
      multiplicationStyle: "multiple_25",
      divisionMode: "approximate",
      divisionRounding: "nearest_whole",
      negatives: "1",
      numberFormat: "decimal",
      operandSize: "large",
      operators: "addition,subtraction,multiplication,division",
      parentheses: "0",
      terms: "4",
      unit: "m"
    });
    expect(screen.getByLabelText("Preset")).toHaveValue("custom");
  });

  it("clears and disables negative values for remainder division across reloads", async () => {
    const storage = new MemoryAppStorage();
    const view = render(<DrillSettingsForm storageFactory={() => storage} />);

    expect(await screen.findByText(/Built-in defaults loaded/)).toBeInTheDocument();

    openDisclosure("drill-arithmetic-options");
    const negativeValues = screen.getByLabelText("Include negative values");
    fireEvent.click(negativeValues);
    expect(negativeValues).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Remainder" }));

    expect(negativeValues).toBeDisabled();
    expect(negativeValues).not.toBeChecked();
    expect(screen.getByText("Remainder division uses non-negative whole-number operands.")).toBeInTheDocument();
    expect(searchParamsForLink("Start Drill").get("negatives")).toBe("0");

    fireEvent.click(screen.getByRole("button", { name: "Save as my defaults" }));
    await waitFor(() => expect(storage.peekAll("user_settings")[0]?.settings).toMatchObject({
      arithmeticAllowNegatives: false,
      arithmeticDivisionMode: "remainder"
    }));

    view.unmount();
    render(<DrillSettingsForm storageFactory={() => storage} />);
    openDisclosure("drill-arithmetic-options");
    await waitFor(() => expect(screen.getByRole("button", { name: "Remainder" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByLabelText("Include negative values")).toBeDisabled();
    expect(screen.getByLabelText("Include negative values")).not.toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: "Exact" }));
    expect(screen.getByLabelText("Include negative values")).toBeEnabled();
    expect(screen.getByLabelText("Include negative values")).not.toBeChecked();
  });

  it("configures a compatible case-only Interview Math session", () => {
    render(<DrillSettingsForm />);

    fireEvent.click(screen.getByLabelText("Case-style mixed"));
    fireEvent.click(screen.getByLabelText("Arithmetic"));
    openDisclosure("drill-case-options");
    fireEvent.change(screen.getByLabelText("Industry"), { target: { value: "retail" } });
    fireEvent.change(screen.getByLabelText("Calculation steps"), { target: { value: "2" } });
    fireEvent.click(screen.getByLabelText("Require equation setup"));
    fireEvent.click(screen.getByLabelText("Require final interpretation"));

    const params = searchParamsForLink("Start Drill");
    const summary = screen.getByTestId("drill-selection-summary");

    expect(Object.fromEntries(params)).toMatchObject({
      caseIndustry: "retail",
      caseSteps: "2",
      categories: "case_math",
      requireEquation: "0",
      requireInterpretation: "1"
    });
    expect(params.has("mode")).toBe(false);
    expect(within(summary).getByText("Retail / 2 steps")).toBeInTheDocument();
    expect(within(summary).getByText("Answer + interpretation")).toBeInTheDocument();
  });

  it("keeps setup changes local to the current drill until defaults are explicitly saved", async () => {
    const storage = new MemoryAppStorage();

    render(<DrillSettingsForm storageFactory={() => storage} />);

    expect(await screen.findByText(/Built-in defaults loaded/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Intermediate" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(storage.peekAll("user_settings")).toEqual([]);
    expect(screen.getByText(/affect only this drill/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save as my defaults" }));

    await waitFor(() => expect(storage.peekAll("user_settings")[0]?.settings.difficulty).toBe("intermediate"));
    expect(screen.getByText("Saved as your defaults for future drill setup.")).toBeInTheDocument();
  });

  it("loads saved defaults without overwriting them when the current launch changes", async () => {
    const storage = new MemoryAppStorage();

    await saveUserDrillSettings(storage, createDrillSettings({ difficulty: "advanced", questionCount: 12 }));
    render(<DrillSettingsForm storageFactory={() => storage} />);

    await waitFor(() => expect(screen.getByRole("button", { name: "Advanced" })).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByText(/Your saved defaults loaded/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Beginner" }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(storage.peekAll("user_settings")[0]?.settings.difficulty).toBe("advanced");
    expect(screen.getByText("This drill differs from your saved defaults. Your defaults have not changed.")).toBeInTheDocument();
  });

});

function searchParamsForLink(name: string): URLSearchParams {
  const href = screen.getByRole("link", { name }).getAttribute("href");

  if (href === null) {
    throw new Error(`Missing href for "${name}".`);
  }

  return new URL(href, "http://localhost").searchParams;
}

function openDisclosure(testId: string): void {
  const disclosure = screen.getByTestId(testId) as HTMLDetailsElement;

  if (!disclosure.open) {
    fireEvent.click(disclosure.querySelector("summary") as HTMLElement);
  }
}
