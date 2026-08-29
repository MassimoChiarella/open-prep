import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DrillSettingsForm, quickDrillPresets } from "@/features/drills/DrillSettingsForm";
import { parseDrillSettingsQuery } from "@/features/drills/drillSessionQuery";
import { createDrillSettings } from "@/features/drills/drillSettings";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { saveUserDrillSettings } from "@/features/settings/settingsPersistence";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

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
    expect(startParams.get("feedbackMode")).toBe("end_of_session");
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
      mode: "interview",
      requireEquation: "0",
      requireInterpretation: "1"
    });
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
