"use client";

import { useId } from "react";

import { uiInputs, uiText } from "@/components/uiStyles";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  getEffectiveDurationSeconds,
  timingAccommodationIds,
  type TimingAccommodation
} from "@/features/timing/timingAccommodation";

const labels: Record<TimingAccommodation, string> = {
  double_time: "Double time",
  standard: "Standard time",
  time_and_a_half: "Time and a half",
  untimed: "Untimed practice"
};

export function TimingAccommodationControl({
  disabled = false,
  onChange,
  onRememberChange,
  remember,
  standardDurationSeconds,
  value
}: {
  disabled?: boolean;
  onChange: (value: TimingAccommodation) => void;
  onRememberChange: (value: boolean) => void;
  remember: boolean;
  standardDurationSeconds?: number;
  value: TimingAccommodation;
}) {
  const { formatDuration, t } = useI18n();
  const id = useId();
  const effectiveDuration = standardDurationSeconds === undefined
    ? undefined
    : getEffectiveDurationSeconds(standardDurationSeconds, value);

  return (
    <fieldset className="grid min-w-0 gap-3 border-y border-ink/15 py-4" disabled={disabled}>
      <legend className={uiText.controlLabel}>{t("Timing accommodation")}</legend>
      <label className="grid min-w-0 gap-1" htmlFor={`${id}-choice`}>
        <span className={uiText.dense}>{t("Timing choice")}</span>
        <select
          className={uiInputs.compact}
          id={`${id}-choice`}
          onChange={(event) => onChange(event.currentTarget.value as TimingAccommodation)}
          value={value}
        >
          {timingAccommodationIds.map((option) => (
            <option key={option} value={option}>{t(labels[option])}</option>
          ))}
        </select>
      </label>
      {standardDurationSeconds === undefined ? null : (
        <p className={uiText.dense} role="status">
          {effectiveDuration === null
            ? t("The standard limit is {standard}. This attempt will not expire automatically.", {
                standard: formatDuration(standardDurationSeconds)
              })
            : t("The standard limit is {standard}. Your limit will be {effective}.", {
                effective: formatDuration(effectiveDuration ?? standardDurationSeconds),
                standard: formatDuration(standardDurationSeconds)
              })}
        </p>
      )}
      <label className="grid cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2 text-sm leading-6 text-ink/75">
        <input
          checked={remember}
          className="mt-1 h-4 w-4"
          onChange={(event) => onRememberChange(event.currentTarget.checked)}
          type="checkbox"
        />
        <span>{t("Remember this timing choice on this device")}</span>
      </label>
    </fieldset>
  );
}
