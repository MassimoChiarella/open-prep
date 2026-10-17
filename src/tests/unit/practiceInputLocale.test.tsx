import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { exhibitDatasets } from "@/data/exhibits/exhibitDatasets";
import { marketSizingTemplates } from "@/data/marketSizing/marketSizingTemplates";
import { ActiveDrillSession } from "@/features/drills/ActiveDrillSession";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { ExhibitQuestionFlow } from "@/features/exhibits/ExhibitQuestionFlow";
import { ExhibitSprint } from "@/features/exhibits/ExhibitSprint";
import { LanguageSelect } from "@/features/i18n/I18nProvider";
import german from "@/features/i18n/locales/de";
import { MarketSizingGuidedForm } from "@/features/market-sizing/MarketSizingGuidedForm";
import { renderWithI18n, resetI18nTestState } from "@/tests/renderWithStoredLocale";
import { MemoryAppStorage } from "@/tests/unit/memoryAppStorage";

afterEach(resetI18nTestState);
const languageSwitches = [["en", "de"], ["de", "en"]] as const;
const label = (locale: "en" | "de", text: keyof typeof german) => locale === "de" ? german[text] : text;

describe.each(languageSwitches)("numeric input entered in %s and submitted in %s", (source, target) => {
  it("keeps the drill answer's original grouping interpretation", async () => {
    const storage = new MemoryAppStorage();
    const created = createDrillSession({ seed: "input-locale", settings: { questionCount: 1, timeMode: "untimed", feedbackMode: "instant", tags: ["addition"] } });
    created.questions[0] = { ...created.questions[0], answer: { value: 120000, unit: "none", tolerance: { type: "absolute", value: 0 } } };
    const control = renderWithI18n(<><LanguageSelect /><ActiveDrillSession initialSession={created.session} questions={created.questions} storageFactory={() => storage} /></>);
    fireEvent.change(screen.getByRole("combobox", { name: /^(Language|Sprache)$/ }), { target: { value: source } });
    await control.waitForLocale(source);
    const answer = screen.getByLabelText(label(source, "Answer"));
    await waitFor(() => expect(answer).toBeEnabled());
    fireEvent.change(answer, { target: { value: source === "en" ? "120,000" : "120.000" } });
    fireEvent.change(screen.getByRole("combobox", { name: /^(Language|Sprache)$/ }), { target: { value: target } });
    await control.waitForLocale(target);
    fireEvent.submit(answer.closest("form")!);
    await waitFor(() => expect(storage.peekAll("drill_sessions").some((session) => session.responses.length === 1)).toBe(true));
    expect(storage.peekAll("drill_sessions").find((session) => session.responses.length === 1)?.responses[0]).toMatchObject({ normalizedValue: 120000, isCorrect: true });
  });

  it.each([false, true])("preserves individual and sprint exhibit input (sprint=%s)", async (sprint) => {
    const storage = new MemoryAppStorage();
    const first = exhibitDatasets[0].questions[0];
    if (first.responseType === "multiple_choice") throw new Error("Expected numeric fixture");
    const datasets = [{ ...exhibitDatasets[0], questions: [0, 1, 2].map((index) => ({ ...first, id: `locale-question-${index}`, answer: { value: 120000, unit: "none" as const } })) }];
    const control = renderWithI18n(<><LanguageSelect />{sprint
      ? <ExhibitSprint datasets={datasets} seed={0} storageFactory={() => storage} />
      : <ExhibitQuestionFlow datasets={datasets} storageFactory={() => storage} />}</>);
    fireEvent.change(screen.getByRole("combobox", { name: /^(Language|Sprache)$/ }), { target: { value: source } });
    await control.waitForLocale(source);
    if (sprint) fireEvent.click(screen.getByRole("button", { name: label(source, "Start Exhibit Sprint") }));
    fireEvent.change(screen.getByLabelText(label(source, "Answer")), { target: { value: source === "en" ? "120,000" : "120.000" } });
    fireEvent.change(screen.getByRole("combobox", { name: /^(Language|Sprache)$/ }), { target: { value: target } });
    await control.waitForLocale(target);
    fireEvent.click(screen.getByRole("button", { name: label(target, "Submit Answer") }));
    await waitFor(() => expect(storage.peekAll("exhibit_attempts")).toHaveLength(1));
    expect(storage.peekAll("exhibit_attempts")[0]).toMatchObject({ normalizedValue: 120000, isCorrect: true });
  });

  it("keeps sizing field locales and canonical number inputs through final scoring", async () => {
    const storage = new MemoryAppStorage();
    const control = renderWithI18n(<><LanguageSelect /><MarketSizingGuidedForm templates={marketSizingTemplates} storageFactory={() => storage} /></>);
    fireEvent.change(screen.getByRole("combobox", { name: /^(Language|Sprache)$/ }), { target: { value: source } });
    await control.waitForLocale(source);
    for (const [field, value] of [["Population", "3000000"], ["Percent who buy prepared coffee", "60%"], ["Purchased cups per drinker per day", "1.5"], ["Purchase days per year", "365"], ["Average price per cup", "$4"]]) {
      fireEvent.change(screen.getByLabelText(field), { target: { value } });
    }
    fireEvent.click(screen.getByLabelText("Sense-check completed"));
    fireEvent.click(screen.getByRole("button", { name: label(source, "Continue to Calculation") }));
    fireEvent.click(screen.getByRole("button", { name: label(source, "Continue to Final Answer") }));
    const finalAnswer = screen.getByRole("textbox", { name: new RegExp(label(source, "Final answer ({unit})").split("{unit}")[0].replace("(", "\\(")) });
    fireEvent.change(finalAnswer, { target: { value: source === "en" ? "$3.942B" : "$3,942B" } });
    fireEvent.click(screen.getByRole("button", { name: label(source, "Submit Answer") }));
    fireEvent.change(screen.getByLabelText(label(source, "Interpretation")), { target: { value: "plausible" } });
    fireEvent.change(screen.getByRole("combobox", { name: /^(Language|Sprache)$/ }), { target: { value: target } });
    await control.waitForLocale(target);
    fireEvent.click(screen.getByRole("button", { name: label(target, "Score Draft") }));
    await waitFor(() => expect(storage.peekAll("market_sizing_attempts")).toHaveLength(1));
    expect(storage.peekAll("market_sizing_attempts")[0]).toMatchObject({ normalizedFinalAnswer: 3942000000, calculatedValue: 3942000000, score: 100 });
  });
});
