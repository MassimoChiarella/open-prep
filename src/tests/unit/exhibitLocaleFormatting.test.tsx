import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { ExhibitQuestionFlow } from "@/features/exhibits/ExhibitQuestionFlow";
import { formatExhibitAnswerValue } from "@/features/exhibits/exhibitFormatting";
import { locales } from "@/features/i18n/i18n";
import german from "@/features/i18n/locales/de";
import french from "@/features/i18n/locales/fr";
import { validateAnswer } from "@/lib/validation/validateAnswer";
import { renderWithStoredLocale, resetI18nTestState } from "@/tests/renderWithStoredLocale";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(resetI18nTestState);

describe.each(locales)("generated exhibit notation in %s", (locale) => {
  it.each([
    [48384000, "currency"], [-1234.5678, "currency"], [1234567.89, "none"],
    [0.125, "percentage"], [4, "percentage_points"], [120000, "users"]
  ] as const)("round-trips %s %s through the active grader", (value, unit) => {
    const displayed = formatExhibitAnswerValue(value, unit, locale);
    expect(validateAnswer(displayed, { value, unit, tolerance: { type: "absolute", value: 0 } }, { locale }).isCorrect).toBe(true);
  });
});

it.each([["de", german], ["fr", french]] as const)("accepts its own displayed solution in %s without a language switch", async (locale, messages) => {
  const storage = new MemoryAppStorage();
  const control = renderWithStoredLocale(<ExhibitQuestionFlow datasets={exhibitDatasets} storageFactory={() => storage} />, locale);
  await control.initialize();
  fireEvent.change(screen.getByLabelText(messages.Answer), { target: { value: "0" } });
  fireEvent.click(screen.getByRole("button", { name: messages["Submit Answer"] }));
  await waitFor(() => expect(storage.peekAll("exhibit_attempts")).toHaveLength(1));
  const displayed = formatExhibitAnswerValue(48384000, "currency", locale);
  expect(displayed).not.toBe("$48,384,000");
  expect(screen.getByTestId("exhibit-solution-panel").textContent).toContain(displayed);
  fireEvent.change(screen.getByLabelText(messages.Answer), { target: { value: displayed } });
  fireEvent.click(screen.getByRole("button", { name: messages["Submit Answer"] }));
  await waitFor(() => expect(storage.peekAll("exhibit_attempts")).toHaveLength(2));
  expect(storage.peekAll("exhibit_attempts").find((attempt) => attempt.rawInput === displayed)).toMatchObject({ normalizedValue: 48384000, isCorrect: true });
});
