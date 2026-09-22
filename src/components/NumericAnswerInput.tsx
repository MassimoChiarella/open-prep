"use client";

import { forwardRef, useEffect, useId, useImperativeHandle, useRef, type InputHTMLAttributes } from "react";
import { useI18n } from "@/features/i18n/I18nProvider";
import { maxNumericInputLength, numericInputLimitMessage } from "@/lib/validation/inputLimits";

/** Keep oversized pasted text editable and explain the limit instead of silently truncating it. */
export const NumericAnswerInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function NumericAnswerInput({ onChange, value, ...props }, forwardedRef) {
    const { t } = useI18n();
    const inputRef = useRef<HTMLInputElement>(null);
    const errorId = useId();
    const tooLong = String(value ?? "").length > maxNumericInputLength;
    const message = tooLong ? t(numericInputLimitMessage) : "";
    useImperativeHandle(forwardedRef, () => inputRef.current as HTMLInputElement);
    useEffect(() => { inputRef.current?.setCustomValidity(message); }, [message]);

    return <>
      <input
        {...props}
        aria-describedby={[props["aria-describedby"], tooLong ? errorId : undefined].filter(Boolean).join(" ") || undefined}
        aria-invalid={tooLong || props["aria-invalid"]}
        onChange={(event) => {
          event.currentTarget.setCustomValidity(event.currentTarget.value.length > maxNumericInputLength ? t(numericInputLimitMessage) : "");
          onChange?.(event);
        }}
        ref={inputRef}
        value={value}
      />
      {tooLong ? <span className="text-sm font-medium text-ink" id={errorId} role="alert">{message}</span> : null}
    </>;
  }
);
