"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ArrowIcon } from "@/components/ArrowIcon";
import { PageHeader } from "@/components/PageHeader";
import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { caseStyleQuestionTemplates } from "@/data/questionTemplates/caseStyleTemplates";
import { accuracyModeSourceParam, createAccuracyModeSettings } from "@/features/drills/accuracyMode";
import {
  arithmeticDivisionModeOptions,
  arithmeticDivisionRoundingOptions,
  arithmeticMixedOperatorOptions,
  arithmeticMultiplicationStyleOptions,
  arithmeticNumberFormatOptions,
  arithmeticOperandSizeOptions,
  arithmeticTermCountOptions,
  buildDrillSettingsQuery,
  caseCalculationStepCountOptions,
  caseIndustryOptions,
  categoryOptions,
  difficultyOptions,
  feedbackModeOptions,
  questionCountOptions,
  skillTagOptions,
  timeModeOptions,
  unitPreferenceOptions,
  type DrillOption
} from "@/features/drills/drillSettingsOptions";
import { createDrillSettings, hasActiveRemainderDivision } from "@/features/drills/drillSettings";
import { timingAccommodationLabel } from "@/features/drills/drillTimer";
import { createQuickFireModeSettings, quickFireModeSourceParam } from "@/features/drills/quickFireMode";
import { useI18n } from "@/features/i18n/I18nProvider";
import { createDrillSession } from "@/features/drills/sessionFactory";
import { getQuestionGenerationCapacity } from "@/features/questions/questionGenerator";
import { loadUserDrillSettings, saveUserDrillSettings } from "@/features/settings/settingsPersistence";
import { TimingAccommodationControl } from "@/features/timing/TimingAccommodationControl";
import {
  getEffectiveDurationSeconds,
  normalizeTimingAccommodation,
  type TimingAccommodation
} from "@/features/timing/timingAccommodation";
import {
  readTimingAccommodationPreference,
  writeTimingAccommodationPreference
} from "@/features/timing/timingAccommodationPreference";
import type {
  ArithmeticMixedOperator,
  CaseCalculationStepCount,
  CaseIndustry,
  Difficulty,
  DrillSettings,
  SkillCategory,
  SkillTag
} from "@/lib/domain";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import type { AppStorage } from "@/lib/storage/appStorageTypes";

const previewStartedAt = "2026-06-02T00:00:00.000Z";
type SettingsPersistenceStatus = "error" | "loading" | "ready" | "saved" | "saving";

const timeModeDescriptions: Record<DrillSettings["timeMode"], string> = {
  per_question: "Set a timer for each question.",
  session: "Set one timer for the whole drill.",
  untimed: "Practice without time pressure."
};

const feedbackModeDescriptions: Record<DrillSettings["feedbackMode"], string> = {
  end_of_session: "Review all answers after the drill.",
  instant: "See correctness after every answer.",
  retry_first: "Try once more before seeing feedback."
};

export const quickDrillPresets = [
  {
    description: "Start with a short untimed arithmetic set.",
    href: buildPresetHref({
      categories: ["arithmetic"],
      feedbackMode: "instant",
      questionCount: 5,
      tags: ["mixed_operations"],
      timeMode: "untimed"
    }),
    label: "Arithmetic Warmup",
    meta: "5 questions - untimed"
  },
  {
    description: "Practice common percentage calculations with instant feedback.",
    href: buildPresetHref({
      categories: ["percentages"],
      feedbackMode: "instant",
      questionCount: 5,
      tags: ["percentage_of_number", "percentage_change"],
      timeMode: "untimed"
    }),
    label: "Percentage Basics",
    meta: "5 questions - untimed"
  },
  {
    description: "Focus on revenue and margin math used in case prompts.",
    href: buildPresetHref({
      categories: ["business_math"],
      feedbackMode: "instant",
      questionCount: 5,
      tags: ["revenue", "margin"],
      timeMode: "untimed"
    }),
    label: "Business Math",
    meta: "5 questions - untimed"
  },
  {
    description: "Practice equation setup, calculation, units, and business interpretation.",
    href: buildPresetHref({
      categories: ["case_math"],
      caseRequireEquationSetup: true,
      caseRequireInterpretation: false,
      difficulty: "intermediate",
      feedbackMode: "instant",
      questionCount: 5,
      timeMode: "untimed"
    }, "interview"),
    label: "Interview Math",
    meta: "5 questions - intermediate"
  },
  {
    description: "Build arithmetic speed with a short countdown on every question.",
    href: buildPresetHref(
      createQuickFireModeSettings({
        categories: ["arithmetic"],
        tags: ["mixed_operations"]
      }),
      undefined,
      quickFireModeSourceParam
    ),
    label: "Quick Fire",
    meta: "10 questions - 20 sec each"
  },
  {
    description: "Work untimed with hints and detailed feedback after every answer.",
    href: buildPresetHref(
      createAccuracyModeSettings({
        hintsEnabled: true,
        questionCount: 10
      }),
      undefined,
      accuracyModeSourceParam
    ),
    label: "Accuracy Mode",
    meta: "10 questions - untimed"
  }
];

export function DrillSettingsForm({ storageFactory = createIndexedDbAppStorage }: { storageFactory?: () => AppStorage } = {}) {
  const { formatNumber: formatLocaleNumber, t } = useI18n();
  const [settings, setSettingsState] = useState<DrillSettings>(() => createFormDrillSettings());
  const [savedSettingsSignature, setSavedSettingsSignature] = useState<string>();
  const [persistenceStatus, setPersistenceStatus] = useState<SettingsPersistenceStatus>("loading");
  const [rememberTimingAccommodation, setRememberTimingAccommodation] = useState(false);
  const timingAccommodationTouched = useRef(false);
  const setSettings = useCallback<React.Dispatch<React.SetStateAction<DrillSettings>>>((update) => {
    setSettingsState((current) => {
      const next = typeof update === "function" ? update(current) : update;
      const capacity = getQuestionGenerationCapacity(starterQuestionTemplates, next);

      return capacity > 0 && next.questionCount > capacity
        ? createDrillSettings({ ...next, questionCount: capacity })
        : next;
    });
  }, []);

  const questionCapacity = useMemo(
    () => getQuestionGenerationCapacity(starterQuestionTemplates, settings),
    [settings]
  );
  const preview = useMemo(() => createPreview(settings), [settings]);
  const startHref = useMemo(() => buildFormSessionHref(settings), [settings]);
  const timingAccommodation = normalizeTimingAccommodation(settings.timingAccommodation);
  const displayedQuickDrillPresets = useMemo(
    () => quickDrillPresets.map((preset) =>
      preset.label === "Quick Fire"
        ? {
            ...preset,
            href: withTimingAccommodation(preset.href, timingAccommodation),
            meta: quickFireMeta(timingAccommodation)
          }
        : preset
    ),
    [timingAccommodation]
  );
  const settingsMatchSavedDefaults = settingsDefaultsSignature(settings) === savedSettingsSignature;
  const selectedCategories = useMemo(() => new Set(settings.categories), [settings.categories]);
  const selectedTags = useMemo(() => new Set(settings.tags ?? []), [settings.tags]);
  const compatibleSkillOptions = useMemo(() => {
    const compatibleTags = getCompatibleSkillTags(settings.categories);

    return skillTagOptions.filter((option) => compatibleTags.has(option.value));
  }, [settings.categories]);
  const availableCaseIndustries = useMemo(
    () => getAvailableCaseIndustries(settings.difficulty, settings.caseCalculationStepCount),
    [settings.caseCalculationStepCount, settings.difficulty]
  );
  const availableCaseStepCounts = useMemo(
    () => getAvailableCaseStepCounts(settings.difficulty, settings.caseIndustry),
    [settings.caseIndustry, settings.difficulty]
  );
  const showMultiplicationControls = selectedTags.size === 0 || selectedTags.has("multiplication");
  const showDivisionControls = selectedTags.size === 0 || selectedTags.has("division");
  const showMixedOperationControls = selectedTags.size === 0 || selectedTags.has("mixed_operations");
  const remainderDivisionSelected = hasActiveRemainderDivision(settings);
  const previewQuestions = useMemo(
    () => (preview.error === undefined ? preview.questions.slice(0, 1) : []),
    [preview]
  );

  useEffect(() => {
    let cancelled = false;
    let rememberedAccommodation = normalizeTimingAccommodation(undefined);

    try {
      rememberedAccommodation = readTimingAccommodationPreference();
    } catch {
      // Local storage can be unavailable while drill defaults remain usable.
    }

    void Promise.resolve().then(() => {
      if (!cancelled && !timingAccommodationTouched.current) {
        setSettings((current) => createDrillSettings({
          ...current,
          timingAccommodation: rememberedAccommodation
        }));
      }
    });

    try {
      const storage = storageFactory();

      void loadUserDrillSettings(storage)
        .then((savedSettings) => {
          if (cancelled) {
            return;
          }

          if (savedSettings !== undefined) {
            const formSettings = createFormDrillSettings({
              ...savedSettings,
              timingAccommodation: rememberedAccommodation
            });

            setSettings((current) => createFormDrillSettings({
              ...formSettings,
              timingAccommodation: timingAccommodationTouched.current
                ? current.timingAccommodation
                : rememberedAccommodation
            }));
            setSavedSettingsSignature(settingsDefaultsSignature(formSettings));
          }

          setPersistenceStatus("ready");
        })
        .catch(() => {
          if (!cancelled) {
            setPersistenceStatus("error");
          }
        })
        .finally(() => storage.close());
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) {
          setPersistenceStatus("error");
        }
      });
    }

    return () => {
      cancelled = true;
    };
  }, [setSettings, storageFactory]);

  async function handleSaveDefaults() {
    setPersistenceStatus("saving");

    let storage: AppStorage | undefined;

    try {
      storage = storageFactory();
      await saveUserDrillSettings(storage, createDrillSettings({
        ...settings,
        timingAccommodation: "standard"
      }));
      setSavedSettingsSignature(settingsDefaultsSignature(settings));
      setPersistenceStatus("saved");
    } catch {
      setPersistenceStatus("error");
    } finally {
      storage?.close();
    }
  }

  function handleLaunchClick(event: React.MouseEvent<HTMLElement>) {
    if (
      !rememberTimingAccommodation ||
      !(event.target instanceof Element) ||
      event.target.closest('a[href^="/drills/session?"]') === null
    ) {
      return;
    }

    try {
      writeTimingAccommodationPreference(timingAccommodation);
    } catch {
      // A blocked preference write must not block the selected drill.
    }
  }

  return (
    <main
      className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:px-8"
      onClickCapture={handleLaunchClick}
    >
      <section className="space-y-8">
        <header className="grid gap-3">
          <PageHeader
            action={preview.error === undefined ? { href: startHref, label: t("Start Drill") } : undefined}
            description={t("Build one focused practice queue. Changes here apply only to this drill unless you save them as defaults.")}
            eyebrow={t("Practice")}
            title={t("Drill Selection")}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-ink/50 bg-white px-4 text-sm font-semibold text-ink transition hover:border-ink hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:text-ink/65"
              disabled={persistenceStatus === "loading" || persistenceStatus === "saving"}
              onClick={() => void handleSaveDefaults()}
              type="button"
            >
              {t(persistenceStatus === "saving" ? "Saving defaults..." : "Save as my defaults")}
            </button>
            <SettingsPersistenceNote
              hasSavedDefaults={savedSettingsSignature !== undefined}
              matchesSavedDefaults={settingsMatchSavedDefaults}
              status={persistenceStatus}
            />
          </div>
        </header>

        <TimingAccommodationControl
          onChange={(value) => {
            timingAccommodationTouched.current = true;
            setSettings((current) => createDrillSettings({
              ...current,
              timingAccommodation: value
            }));
          }}
          onRememberChange={setRememberTimingAccommodation}
          remember={rememberTimingAccommodation}
          standardDurationSeconds={
            settings.timeMode === "per_question"
              ? settings.secondsPerQuestion
              : settings.timeMode === "session"
                ? settings.totalSessionSeconds
                : undefined
          }
          value={timingAccommodation}
        />

        <section className="grid gap-5 border-y border-ink/20 py-6">
          <div className="grid max-w-2xl gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-coral">{t("Quick Presets")}</p>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-ink">{t("Start fast")}</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2" data-testid="quick-drill-presets">
            {displayedQuickDrillPresets.map((preset, index) => (
              <Link
                className="group grid gap-4 border border-ink/15 bg-white px-4 py-5 text-left transition-colors hover:border-ink/30 hover:bg-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                href={preset.href}
                key={preset.label}
              >
                <span aria-hidden="true" className="flex items-center justify-between font-mono text-xs font-semibold text-ink/65">
                  0{index + 1}
                  <span className="text-base text-teal rtl:rotate-180">
                    <ArrowIcon className="w-[1ch]" />
                  </span>
                </span>
                <span className="text-base font-semibold tracking-[-0.01em] text-ink">{t(preset.label)}</span>
                <span className="text-sm leading-6 text-ink/70">{t(preset.description)}</span>
                <span className="text-xs font-semibold uppercase tracking-wide text-teal">{t(preset.meta)}</span>
              </Link>
            ))}
          </div>
        </section>

        <fieldset
          aria-busy={persistenceStatus === "loading" || persistenceStatus === "saving"}
          aria-label={t("Customize the drill")}
          className="min-w-0 space-y-8 border-y border-ink/20 bg-white px-4 py-6 sm:px-6"
          data-testid="advanced-drill-options"
          disabled={persistenceStatus === "loading" || persistenceStatus === "saving"}
        >
          <div className="grid gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.06em] text-coral">{t("Advanced Options")}</p>
            <h2 className="text-2xl font-semibold tracking-[-0.025em] text-ink">{t("Customize the drill")}</h2>
          </div>

          <ControlGroup title="Category">
            <div className="grid gap-3 sm:grid-cols-2">
              {categoryOptions.map((option) => {
                const checked = selectedCategories.has(option.value);
                const isLastSelected = checked && settings.categories.length === 1;

                return (
                  <label
                    className="flex min-h-12 items-center gap-3 rounded-md border border-ink/15 px-3 py-2 text-sm font-medium text-ink transition hover:bg-paper focus-within:ring-2 focus-within:ring-teal focus-within:ring-offset-2 has-[:checked]:border-teal has-[:checked]:bg-mint/70"
                    key={option.value}
                  >
                    <input
                      checked={checked}
                      className="h-4 w-4 accent-teal"
                      disabled={isLastSelected}
                      aria-describedby={isLastSelected ? "category-disabled-note" : undefined}
                      onChange={() => toggleCategory(option.value, setSettings)}
                      type="checkbox"
                    />
                    {t(option.label)}
                  </label>
                );
              })}
            </div>
            <p className="rounded-md bg-paper px-3 py-2 text-sm leading-6 text-ink/70" id="category-disabled-note">
              {t("At least one category must stay selected. Add another category before clearing the current one.")}
            </p>
          </ControlGroup>

          <DisclosureGroup
            summary={settings.tags === undefined ? "All compatible skills" : formatSkillSelection(settings.tags)}
            testId="drill-skill-options"
            title="Skills"
          >
            <div className="flex flex-wrap gap-2">
              <button
                className={tagButtonClass(settings.tags === undefined || settings.tags.length === 0)}
                onClick={() => setSettings((current) => createDrillSettings({ ...current, tags: undefined }))}
                type="button"
              >
                {t("All")}
              </button>
              {compatibleSkillOptions.map((option) => {
                const active = selectedTags.has(option.value);

                return (
                  <button
                    aria-pressed={active}
                    className={tagButtonClass(active)}
                    key={option.value}
                    onClick={() => toggleTag(option.value, setSettings)}
                    type="button"
                  >
                    {t(option.label)}
                  </button>
                );
              })}
            </div>
          </DisclosureGroup>

          <ControlGroup title="Difficulty">
            <SegmentedControl
              options={difficultyOptions}
              value={settings.difficulty}
              onChange={(difficulty) =>
                setSettings((current) =>
                  createDrillSettings({
                    ...current,
                    caseCalculationStepCount: undefined,
                    caseIndustry: undefined,
                    difficulty
                  })
                )
              }
            />
          </ControlGroup>

          {selectedCategories.has("arithmetic") ? (
            <DisclosureGroup
              summary="Number format, operand size, operators, and units"
              testId="drill-arithmetic-options"
              title="Arithmetic details"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-ink/80">
                  {t("Number of terms")}
                  <select
                    className="h-11 min-w-0 w-full max-w-full rounded-md border border-ink/50 bg-white px-3 text-sm text-ink"
                    onChange={(event) => {
                      const arithmeticTermCount = Number(event.currentTarget.value) as 2 | 3 | 4 | 5;
                      setSettings((current) =>
                        createDrillSettings({
                          ...current,
                          arithmeticTermCount
                        })
                      );
                    }}
                    value={settings.arithmeticTermCount ?? 2}
                  >
                    {arithmeticTermCountOptions.map((count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-ink/80">
                  {t("Unit preference")}
                  <select
                    className="h-11 min-w-0 w-full max-w-full rounded-md border border-ink/50 bg-white px-3 text-sm text-ink"
                    onChange={(event) => {
                      const unitPreference = event.currentTarget.value as DrillSettings["unitPreference"];
                      setSettings((current) =>
                        createDrillSettings({
                          ...current,
                          unitPreference
                        })
                      );
                    }}
                    value={settings.unitPreference ?? "none"}
                  >
                    {unitPreferenceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3">
                <p className="text-sm font-medium text-ink/80">{t("Number format")}</p>
                <SegmentedControl
                  onChange={(arithmeticNumberFormat) =>
                    setSettings((current) => createDrillSettings({ ...current, arithmeticNumberFormat }))
                  }
                  options={arithmeticNumberFormatOptions}
                  value={settings.arithmeticNumberFormat ?? "integer"}
                />
              </div>
              <div className="grid gap-3">
                <p className="text-sm font-medium text-ink/80">{t("Operand size")}</p>
                <SegmentedControl
                  onChange={(arithmeticOperandSize) =>
                    setSettings((current) => createDrillSettings({ ...current, arithmeticOperandSize }))
                  }
                  options={arithmeticOperandSizeOptions}
                  value={settings.arithmeticOperandSize ?? "medium"}
                />
              </div>
              {showMultiplicationControls ? (
                <label className="grid gap-2 text-sm font-medium text-ink/80">
                  {t("Multiplication factors")}
                  <select
                    className="h-11 rounded-md border border-ink/50 bg-white px-3 text-sm text-ink"
                    onChange={(event) => {
                      const arithmeticMultiplicationStyle = event.currentTarget.value as DrillSettings["arithmeticMultiplicationStyle"];
                      setSettings((current) =>
                        createDrillSettings({ ...current, arithmeticMultiplicationStyle })
                      );
                    }}
                    value={settings.arithmeticMultiplicationStyle ?? "difficulty_scaled"}
                  >
                    {arithmeticMultiplicationStyleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {t(option.label)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {showDivisionControls ? (
                <div className="grid gap-4 border-t border-ink/10 pt-4">
                  <div className="grid gap-3">
                    <p className="text-sm font-medium text-ink/80">{t("Division answers")}</p>
                    <SegmentedControl
                      onChange={(arithmeticDivisionMode) =>
                        setSettings((current) => createDrillSettings({ ...current, arithmeticDivisionMode }))
                      }
                      options={arithmeticDivisionModeOptions}
                      value={settings.arithmeticDivisionMode ?? "exact"}
                    />
                  </div>
                  {(settings.arithmeticDivisionMode ?? "exact") === "approximate" ? (
                    <label className="grid max-w-xs gap-2 text-sm font-medium text-ink/80">
                      {t("Division rounding")}
                      <select
                        className="h-11 rounded-md border border-ink/50 bg-white px-3 text-sm text-ink"
                        onChange={(event) => {
                          const arithmeticDivisionRounding = event.currentTarget.value as DrillSettings["arithmeticDivisionRounding"];
                          setSettings((current) =>
                            createDrillSettings({ ...current, arithmeticDivisionRounding })
                          );
                        }}
                        value={settings.arithmeticDivisionRounding ?? "nearest_0_1"}
                      >
                        {arithmeticDivisionRoundingOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {t(option.label)}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}
                </div>
              ) : null}
              {showMixedOperationControls ? (
                <div className="grid gap-4 border-t border-ink/10 pt-4">
                  <fieldset className="grid gap-3">
                    <legend className="text-sm font-medium text-ink/80">{t("Mixed operators")}</legend>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {arithmeticMixedOperatorOptions.map((option) => {
                        const operators = settings.arithmeticMixedOperators ?? ["addition", "subtraction", "multiplication"];
                        const checked = operators.includes(option.value);

                        return (
                          <label
                            className="flex min-h-11 items-center gap-2 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink"
                            key={option.value}
                          >
                            <input
                              checked={checked}
                              className="h-4 w-4 accent-teal"
                              disabled={checked && operators.length === 1}
                              onChange={() => toggleMixedOperator(option.value, setSettings)}
                              type="checkbox"
                            />
                            {t(option.label)}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                  <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink">
                    <input
                      checked={settings.arithmeticUseParentheses !== false}
                      className="h-4 w-4 accent-teal"
                      onChange={(event) => {
                        const arithmeticUseParentheses = event.currentTarget.checked;
                        setSettings((current) =>
                          createDrillSettings({ ...current, arithmeticUseParentheses })
                        );
                      }}
                      type="checkbox"
                    />
                    {t("Use parentheses in mixed operations")}
                  </label>
                </div>
              ) : null}
              <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink">
                <input
                  aria-label={t("Include negative values")}
                  aria-describedby={remainderDivisionSelected ? "remainder-negative-values-note" : undefined}
                  checked={settings.arithmeticAllowNegatives === true}
                  className="h-4 w-4 accent-teal"
                  disabled={remainderDivisionSelected}
                  onChange={(event) => {
                    const arithmeticAllowNegatives = event.currentTarget.checked;
                    setSettings((current) =>
                      createDrillSettings({ ...current, arithmeticAllowNegatives })
                    );
                  }}
                  type="checkbox"
                />
                <span>
                  {t("Include negative values")}
                  {remainderDivisionSelected ? (
                    <span className="mt-0.5 block font-normal text-ink/65" id="remainder-negative-values-note">
                      {t("Remainder division uses non-negative whole-number operands.")}
                    </span>
                  ) : null}
                </span>
              </label>
            </DisclosureGroup>
          ) : null}

          {isCaseOnly(settings) ? (
            <DisclosureGroup
              summary="Industry, calculation steps, and answer requirements"
              testId="drill-case-options"
              title="Case details"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-ink/80">
                  {t("Industry")}
                  <select
                    className="h-11 rounded-md border border-ink/50 bg-white px-3 text-sm text-ink"
                    onChange={(event) => {
                      const caseIndustry = (event.currentTarget.value || undefined) as CaseIndustry | undefined;
                      setSettings((current) => createDrillSettings({ ...current, caseIndustry }));
                    }}
                    value={settings.caseIndustry ?? ""}
                  >
                    <option value="">{t("Any industry")}</option>
                    {caseIndustryOptions
                      .filter((option) => availableCaseIndustries.includes(option.value))
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {t(option.label)}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-ink/80">
                  {t("Calculation steps")}
                  <select
                    className="h-11 rounded-md border border-ink/50 bg-white px-3 text-sm text-ink"
                    onChange={(event) => {
                      const caseCalculationStepCount = event.currentTarget.value
                        ? (Number(event.currentTarget.value) as CaseCalculationStepCount)
                        : undefined;
                      setSettings((current) => createDrillSettings({ ...current, caseCalculationStepCount }));
                    }}
                    value={settings.caseCalculationStepCount ?? ""}
                  >
                    <option value="">{t("Any number")}</option>
                    {caseCalculationStepCountOptions
                      .filter((count) => availableCaseStepCounts.includes(count))
                      .map((count) => (
                        <option key={count} value={count}>
                          {count}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink">
                  <input
                    checked={settings.caseRequireEquationSetup !== false}
                    className="h-4 w-4 accent-teal"
                    onChange={(event) => {
                      const caseRequireEquationSetup = event.currentTarget.checked;
                      setSettings((current) => createDrillSettings({ ...current, caseRequireEquationSetup }));
                    }}
                    type="checkbox"
                  />
                  {t("Require equation setup")}
                </label>
                <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink">
                  <input
                    checked={settings.caseRequireInterpretation === true}
                    className="h-4 w-4 accent-teal"
                    onChange={(event) => {
                      const caseRequireInterpretation = event.currentTarget.checked;
                      setSettings((current) => createDrillSettings({ ...current, caseRequireInterpretation }));
                    }}
                    type="checkbox"
                  />
                  {t("Require final interpretation")}
                </label>
              </div>
            </DisclosureGroup>
          ) : null}

          <ControlGroup title="Question Count">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-ink/80">
                {t("Preset")}
                <select
                  className="h-11 rounded-md border border-ink/50 bg-white px-3 text-sm font-medium text-ink"
                  onChange={(event) => {
                    if (event.currentTarget.value !== "custom") {
                      updateQuestionCount(Number(event.currentTarget.value), questionCapacity, setSettings);
                    }
                  }}
                  value={
                    questionCountOptions.includes(settings.questionCount as (typeof questionCountOptions)[number])
                      ? settings.questionCount
                      : "custom"
                  }
                >
                  {questionCountOptions.map((count) => (
                    <option disabled={count > questionCapacity} key={count} value={count}>
                      {count}
                    </option>
                  ))}
                  <option value="custom">{t("Custom")}</option>
                </select>
              </label>
              <NumberField
                label="Custom question count"
                disabled={questionCapacity === 0}
                max={Math.max(1, questionCapacity)}
                min={1}
                onChange={(questionCount) => updateQuestionCount(questionCount, questionCapacity, setSettings)}
                value={settings.questionCount}
              />
            </div>
            {questionCapacity < 50 ? (
              <p className="text-sm leading-6 text-ink/65" role="status">
                {t("{count} questions", { count: formatLocaleNumber(questionCapacity) })}.{" "}
                {t("The current filters are too narrow for the requested question count. Lower the count or broaden the categories and skills.")}
              </p>
            ) : null}
          </ControlGroup>

          <DisclosureGroup
            summary={labelFor(timeModeOptions, settings.timeMode)}
            testId="drill-timing-options"
            title="Timing"
          >
            <SegmentedControl
              descriptions={timeModeDescriptions}
              options={timeModeOptions}
              value={settings.timeMode}
              onChange={(timeMode) => updateTimeMode(timeMode, setSettings)}
            />
            {settings.timeMode === "per_question" ? (
              <NumberField
                label="Seconds per question"
                max={120}
                min={5}
                onChange={(secondsPerQuestion) =>
                  setSettings((current) => createDrillSettings({ ...current, secondsPerQuestion }))
                }
                value={settings.secondsPerQuestion ?? 30}
              />
            ) : null}
            {settings.timeMode === "session" ? (
              <NumberField
                label="Total seconds"
                max={1800}
                min={60}
                onChange={(totalSessionSeconds) =>
                  setSettings((current) => createDrillSettings({ ...current, totalSessionSeconds }))
                }
                value={settings.totalSessionSeconds ?? 300}
              />
            ) : null}
          </DisclosureGroup>

          <DisclosureGroup
            summary={`${labelFor(feedbackModeOptions, settings.feedbackMode)}${settings.hintsEnabled ? " + hints" : ""}`}
            testId="drill-feedback-options"
            title="Feedback"
          >
            <SegmentedControl
              descriptions={feedbackModeDescriptions}
              options={feedbackModeOptions}
              value={settings.feedbackMode}
              onChange={(feedbackMode) =>
                setSettings((current) => createDrillSettings({ ...current, feedbackMode }))
              }
            />
            <label className="flex min-h-11 items-center gap-3 rounded-md border border-ink/10 bg-white px-3 py-2 text-sm font-medium text-ink">
              <input
                checked={settings.hintsEnabled === true}
                className="h-4 w-4 accent-teal"
                onChange={(event) => {
                  const hintsEnabled = event.currentTarget.checked;
                  setSettings((current) => createDrillSettings({ ...current, hintsEnabled }));
                }}
                type="checkbox"
              />
              {t("Enable hints during the drill")}
            </label>
          </DisclosureGroup>

        </fieldset>
      </section>

      <aside
        aria-labelledby="drill-session-queue-heading"
        className="h-fit border border-ink/15 border-t-2 border-t-coral bg-white p-4 sm:p-5 lg:sticky lg:top-4"
      >
        <div className="grid gap-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Preview")}</p>
            <h2 className="mt-2 text-xl font-semibold text-ink" id="drill-session-queue-heading">
              {t("Session summary")}
            </h2>
          </div>

          <SelectionSummary settings={settings} />

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <PreviewStat label="Questions" value={formatLocaleNumber(settings.questionCount)} />
            <PreviewStat label="Difficulty" value={labelFor(difficultyOptions, settings.difficulty)} />
            <PreviewStat label="Timing" value={labelFor(timeModeOptions, settings.timeMode)} />
            {settings.timeMode === "untimed" ? null : (
              <PreviewStat label="Accommodation" value={timingAccommodationLabel(timingAccommodation)} />
            )}
            <PreviewStat label="Feedback" value={labelFor(feedbackModeOptions, settings.feedbackMode)} />
          </dl>

          {preview.error === undefined ? (
            <div className="grid gap-2" data-testid="drill-question-preview">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Sample question")}</p>
              {previewQuestions.map((question) => (
                <p className="border-s-2 border-teal bg-paper px-3 py-2 text-sm leading-6 text-ink/80" key={question.id}>
                  {question.prompt}
                </p>
              ))}
            </div>
          ) : (
            <UnavailableStartMessage error={preview.error} />
          )}

          {preview.error === undefined ? (
            <Link
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-ink px-4 text-sm font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
              href={startHref}
            >
              {t("Start Selected Drill")}
            </Link>
          ) : (
            <button
              aria-describedby="start-unavailable-reason"
              className="min-h-11 cursor-not-allowed rounded-md bg-ink/20 px-4 text-sm font-semibold text-ink/65"
              disabled
              type="button"
            >
              {t("Start Selected Drill")}
            </button>
          )}

        </div>
      </aside>
    </main>
  );
}

function UnavailableStartMessage({ error }: { error: string }) {
  const { t } = useI18n();

  return (
    <section
      className="grid gap-2 rounded-md border border-coral/20 bg-coral/10 px-3 py-3 text-sm leading-6 text-ink"
      data-testid="start-unavailable-message"
      id="start-unavailable-reason"
    >
      <h3 className="font-semibold text-ink">{t("Why you cannot start yet")}</h3>
      <p>{t(formatUnavailableStartReason(error))}</p>
      <p className="text-ink/70">{t("Detail: {detail}", { detail: error })}</p>
    </section>
  );
}

function SelectionSummary({ settings }: { settings: DrillSettings }) {
  const { t } = useI18n();
  const includesCaseMath = isCaseOnly(settings);

  return (
    <section className="grid gap-3 border-y border-ink/15 py-3" data-testid="drill-selection-summary">
      <h3 className="text-sm font-semibold text-ink">{t("Selected focus")}</h3>
      <dl className="grid gap-2 text-sm">
        <SummaryStat label="Categories" value={formatCategorySelection(settings.categories)} />
        <SummaryStat label="Skills" value={formatSkillSelection(settings.tags)} />
        {includesCaseMath ? (
          <SummaryStat
            label="Case format"
            value={`${settings.caseIndustry === undefined ? "Any industry" : labelFor(caseIndustryOptions, settings.caseIndustry)} / ${settings.caseCalculationStepCount ?? "Any"} steps`}
          />
        ) : null}
        {includesCaseMath ? (
          <SummaryStat
            label="Required"
            value={`${settings.caseRequireEquationSetup === false ? "Answer" : "Equation + answer"}${settings.caseRequireInterpretation === true ? " + interpretation" : ""}`}
          />
        ) : null}
      </dl>
    </section>
  );
}

function SettingsPersistenceNote({
  hasSavedDefaults,
  matchesSavedDefaults,
  status
}: {
  hasSavedDefaults: boolean;
  matchesSavedDefaults: boolean;
  status: SettingsPersistenceStatus;
}) {
  const { t } = useI18n();
  let text = "Built-in defaults loaded. Changes here affect only this drill until you save them as defaults.";

  if (status === "loading") {
    text = "Loading your saved drill defaults...";
  } else if (status === "saving") {
    text = "Saving these settings as your defaults...";
  } else if (status === "error") {
    text = "Could not load or save drill defaults on this device.";
  } else if (status === "saved" && matchesSavedDefaults) {
    text = "Saved as your defaults for future drill setup.";
  } else if (hasSavedDefaults && matchesSavedDefaults) {
    text = "Your saved defaults loaded. Changes here affect only this drill until you save them again.";
  } else if (hasSavedDefaults) {
    text = "This drill differs from your saved defaults. Your defaults have not changed.";
  }

  return (
    <p
      aria-atomic="true"
      aria-live="polite"
      className={[
        "w-fit rounded-md px-3 py-2 text-sm leading-6 text-ink",
        status === "error" ? "bg-coral/10" : "bg-mint/70"
      ].join(" ")}
      role="status"
    >
      {t(text)}
    </p>
  );
}

interface ControlGroupProps {
  children: React.ReactNode;
  title: string;
}

function DisclosureGroup({
  children,
  summary,
  testId,
  title
}: ControlGroupProps & { summary: string; testId: string }) {
  const { t } = useI18n();

  return (
    <details className="group border-t border-ink/10 pt-1" data-testid={testId}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-md px-1 py-3 marker:content-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2">
        <span className="grid min-w-0 gap-1">
          <span className="text-base font-semibold text-ink">{t(title)}</span>
          <span className="truncate text-sm text-ink/65">{t(summary)}</span>
        </span>
        <span aria-hidden="true" className="text-xl font-semibold text-teal group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="space-y-4 pb-2 pt-3">{children}</div>
    </details>
  );
}

function ControlGroup({ children, title }: ControlGroupProps) {
  const { t } = useI18n();

  return (
    <section className="space-y-3 border-t border-ink/10 pt-5 first:border-t-0 first:pt-0">
      <h2 className="text-base font-semibold text-ink">{t(title)}</h2>
      {children}
    </section>
  );
}

interface SegmentedControlProps<TValue extends string> {
  descriptions?: Partial<Record<TValue, string>>;
  onChange: (value: TValue) => void;
  options: DrillOption<TValue>[];
  value: TValue;
}

function SegmentedControl<TValue extends string>({
  descriptions = {},
  onChange,
  options,
  value
}: SegmentedControlProps<TValue>) {
  const { t } = useI18n();

  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {options.map((option) => {
        const active = option.value === value;
        const description = descriptions[option.value];

        return (
          <button
            aria-pressed={active}
            className={[
              "grid min-h-11 gap-1 rounded-md border px-3 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2",
              active ? "border-teal bg-mint text-ink" : "border-ink/15 bg-white text-ink/75 hover:border-ink/30 hover:bg-paper"
            ].join(" ")}
            key={option.value}
            onClick={() => onChange(option.value)}
            type="button"
          >
            <span>{t(option.label)}</span>
            {description !== undefined ? (
              <span className="text-xs font-normal leading-5 text-ink/65">{t(description)}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

interface NumberFieldProps {
  disabled?: boolean;
  label: string;
  max: number;
  min: number;
  onChange: (value: number) => void;
  value: number;
}

function NumberField({ disabled = false, label, max, min, onChange, value }: NumberFieldProps) {
  const { t } = useI18n();

  return (
    <label className="grid max-w-xs gap-2 text-sm font-medium text-ink/80">
      {t(label)}
      <input
        className="h-11 rounded-md border border-ink/50 bg-white px-3 text-sm text-ink"
        disabled={disabled}
        max={max}
        min={min}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        type="number"
        value={value}
      />
    </label>
  );
}

interface PreviewStatProps {
  label: string;
  value: string;
}

function PreviewStat({ label, value }: PreviewStatProps) {
  const { t } = useI18n();

  return (
    <div className="border-s-2 border-ink/15 bg-paper px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t(label)}</dt>
      <dd className="mt-1 font-semibold text-ink">{t(value)}</dd>
    </div>
  );
}

function SummaryStat({ label, value }: PreviewStatProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-1">
      <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t(label)}</dt>
      <dd className="font-semibold leading-6 text-ink">{t(value)}</dd>
    </div>
  );
}

function toggleCategory(
  category: SkillCategory,
  setSettings: React.Dispatch<React.SetStateAction<DrillSettings>>
) {
  setSettings((current) => {
    const removingCaseMath = category === "case_math" && current.categories.includes(category);
    const categories = current.categories.includes(category)
      ? current.categories.filter((selectedCategory) => selectedCategory !== category)
      : [...current.categories, category];
    const nextCategories = categories.length > 0 ? categories : current.categories;
    const compatibleTags = getCompatibleSkillTags(nextCategories);
    const tags = current.tags?.filter((tag) => compatibleTags.has(tag));

    return createDrillSettings({
      ...current,
      ...(removingCaseMath
        ? {
            caseCalculationStepCount: undefined,
            caseIndustry: undefined,
            caseRequireEquationSetup: undefined,
            caseRequireInterpretation: undefined
          }
        : {}),
      categories: nextCategories,
      tags: tags?.length ? tags : undefined
    });
  });
}

function getCompatibleSkillTags(categories: readonly SkillCategory[]): Set<SkillTag> {
  const selectedCategories = new Set(categories);

  return new Set(
    starterQuestionTemplates
      .filter((template) => selectedCategories.has(template.category))
      .flatMap((template) => template.tags)
  );
}

function toggleTag(tag: SkillTag, setSettings: React.Dispatch<React.SetStateAction<DrillSettings>>) {
  setSettings((current) => {
    const selectedTags = new Set(current.tags ?? []);

    if (selectedTags.has(tag)) {
      selectedTags.delete(tag);
    } else {
      selectedTags.add(tag);
    }

    return createDrillSettings({
      ...current,
      tags: selectedTags.size === 0 ? undefined : Array.from(selectedTags)
    });
  });
}

function toggleMixedOperator(
  operator: ArithmeticMixedOperator,
  setSettings: React.Dispatch<React.SetStateAction<DrillSettings>>
) {
  setSettings((current) => {
    const operators = new Set<ArithmeticMixedOperator>(
      current.arithmeticMixedOperators ?? ["addition", "subtraction", "multiplication"]
    );

    if (operators.has(operator)) {
      if (operators.size > 1) {
        operators.delete(operator);
      }
    } else {
      operators.add(operator);
    }

    return createDrillSettings({ ...current, arithmeticMixedOperators: Array.from(operators) });
  });
}

function updateQuestionCount(
  questionCount: number,
  capacity: number,
  setSettings: React.Dispatch<React.SetStateAction<DrillSettings>>
) {
  setSettings((current) =>
    createDrillSettings({
      ...current,
      questionCount: Number.isFinite(questionCount)
        ? Math.min(Math.max(1, capacity), Math.max(1, Math.round(questionCount)))
        : current.questionCount
    })
  );
}

function updateTimeMode(
  timeMode: DrillSettings["timeMode"],
  setSettings: React.Dispatch<React.SetStateAction<DrillSettings>>
) {
  setSettings((current) =>
    createDrillSettings({
      ...current,
      timeMode,
      secondsPerQuestion: timeMode === "per_question" ? current.secondsPerQuestion ?? 30 : undefined,
      totalSessionSeconds: timeMode === "session" ? current.totalSessionSeconds ?? 300 : undefined
    })
  );
}

function createPreview(settings: DrillSettings):
  | { questions: ReturnType<typeof createDrillSession>["questions"]; error?: undefined }
  | { questions?: undefined; error: string } {
  try {
    const created = createDrillSession({
      seed: buildPreviewSeed(settings),
      startedAt: previewStartedAt,
      settings
    });

    return { questions: created.questions };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unable to create a local session preview."
    };
  }
}

function buildPreviewSeed(settings: DrillSettings): string {
  return [
    "preview",
    settings.categories.join("-"),
    settings.tags?.join("-") ?? "all",
    settings.difficulty,
    settings.questionCount,
    settings.timeMode,
    settings.feedbackMode,
    settings.arithmeticTermCount ?? "legacy-terms",
    settings.arithmeticNumberFormat ?? "legacy-format",
    settings.arithmeticOperandSize ?? "legacy-size",
    settings.arithmeticAllowNegatives === undefined ? "legacy-signs" : String(settings.arithmeticAllowNegatives),
    settings.arithmeticMultiplicationStyle ?? "legacy-multiplication",
    settings.arithmeticDivisionMode ?? "legacy-division",
    settings.arithmeticDivisionRounding ?? "legacy-rounding",
    settings.arithmeticMixedOperators?.join("-") ?? "legacy-operators",
    settings.arithmeticUseParentheses === undefined ? "legacy-parentheses" : String(settings.arithmeticUseParentheses),
    settings.caseIndustry ?? "any-case-industry",
    settings.caseCalculationStepCount ?? "any-case-steps",
    settings.caseRequireEquationSetup === false ? "optional-equation" : "required-equation",
    settings.caseRequireInterpretation === true ? "required-interpretation" : "optional-interpretation",
    settings.unitPreference ?? "legacy-unit"
  ].join(":");
}

function createFormDrillSettings(overrides: Partial<DrillSettings> = {}): DrillSettings {
  return createDrillSettings({
    arithmeticAllowNegatives: false,
    arithmeticNumberFormat: "integer",
    arithmeticOperandSize: "medium",
    arithmeticTermCount: 2,
    arithmeticMultiplicationStyle: "difficulty_scaled",
    arithmeticDivisionMode: "exact",
    arithmeticDivisionRounding: "nearest_0_1",
    arithmeticMixedOperators: ["addition", "subtraction", "multiplication"],
    arithmeticUseParentheses: true,
    unitPreference: "none",
    ...overrides
  });
}

function settingsDefaultsSignature(settings: DrillSettings): string {
  return JSON.stringify(createDrillSettings({
    ...settings,
    timingAccommodation: "standard"
  }));
}

function buildPresetHref(
  settings: Parameters<typeof createDrillSettings>[0],
  mode?: "interview",
  source?: string
): string {
  const resolvedSettings = createDrillSettings(settings);
  const suffix = [mode ? `mode=${mode}` : undefined, source ? `source=${source}` : undefined]
    .filter((value): value is string => value !== undefined)
    .join("&");

  return `/drills/session?${buildDrillSettingsQuery(resolvedSettings)}${suffix ? `&${suffix}` : ""}`;
}

function withTimingAccommodation(href: string, accommodation: TimingAccommodation): string {
  const url = new URL(href, "http://localhost");
  url.searchParams.set("timingAccommodation", accommodation);

  return `${url.pathname}?${url.searchParams.toString()}`;
}

function quickFireMeta(accommodation: TimingAccommodation): string {
  const duration = getEffectiveDurationSeconds(20, accommodation);

  return duration === null
    ? "10 questions - untimed practice"
    : `10 questions - ${duration} sec each`;
}

function buildFormSessionHref(settings: DrillSettings): string {
  const launchSettings = settings.timeMode === "untimed"
    ? createDrillSettings({ ...settings, timingAccommodation: "standard" })
    : settings;
  return `/drills/session?${buildDrillSettingsQuery(launchSettings)}`;
}

function isCaseOnly(settings: Pick<DrillSettings, "categories">): boolean {
  return settings.categories.length === 1 && settings.categories[0] === "case_math";
}

function getAvailableCaseIndustries(
  difficulty: Difficulty,
  stepCount: CaseCalculationStepCount | undefined
): CaseIndustry[] {
  return Array.from(
    new Set(
      caseStyleQuestionTemplates
        .filter(
          (template) =>
            template.difficulty.includes(difficulty) &&
            (stepCount === undefined || template.caseStyle.calculationStepCount === stepCount)
        )
        .map((template) => template.caseStyle.industry)
    )
  );
}

function getAvailableCaseStepCounts(
  difficulty: Difficulty,
  industry: CaseIndustry | undefined
): CaseCalculationStepCount[] {
  return Array.from(
    new Set(
      caseStyleQuestionTemplates
        .filter(
          (template) =>
            template.difficulty.includes(difficulty) &&
            (industry === undefined || template.caseStyle.industry === industry)
        )
        .map((template) => template.caseStyle.calculationStepCount)
    )
  );
}

function labelFor<TValue extends string>(options: DrillOption<TValue>[], value: TValue): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function formatCategorySelection(categories: readonly SkillCategory[]): string {
  return categories.map((category) => labelFor(categoryOptions, category)).join(", ");
}

function formatSkillSelection(tags: readonly SkillTag[] | undefined): string {
  if (tags === undefined || tags.length === 0) {
    return "All skills in selected categories";
  }

  return tags.map((tag) => labelFor(skillTagOptions, tag)).join(", ");
}

function formatUnavailableStartReason(error: string): string {
  if (error.includes("No question templates match")) {
    return "No built-in questions match the current category and skill filters. Remove the selected skill filter or add a matching category.";
  }

  if (error.includes("Unable to generate enough unique questions")) {
    return "The current filters are too narrow for the requested question count. Lower the count or broaden the categories and skills.";
  }

  if (error.includes("positive secondsPerQuestion")) {
    return "Set seconds per question to a positive number before starting.";
  }

  if (error.includes("positive totalSessionSeconds")) {
    return "Set total session seconds to a positive number before starting.";
  }

  return "Adjust the highlighted drill settings before starting.";
}

function tagButtonClass(active: boolean): string {
  return [
    "min-h-11 min-w-11 rounded-md border px-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2",
    active ? "border-teal bg-mint text-ink" : "border-ink/15 bg-white text-ink/75 hover:border-ink/30 hover:bg-paper"
  ].join(" ");
}
