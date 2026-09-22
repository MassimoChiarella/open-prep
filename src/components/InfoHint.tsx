"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { cx } from "@/components/uiStyles";

type InfoHintAlignment = "center" | "end" | "start";

const alignmentClasses: Record<InfoHintAlignment, string> = {
  center: "start-1/2 -translate-x-1/2 rtl:translate-x-1/2",
  end: "end-0",
  start: "start-0"
};

export function InfoHint({
  align = "start",
  children,
  label
}: {
  align?: InfoHintAlignment;
  children: ReactNode;
  label: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const pinned = useRef(false);
  const tooltipId = useId();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeFromOutside(event: PointerEvent) {
      if (containerRef.current?.contains(event.target as Node)) return;
      pinned.current = false;
      setOpen(false);
    }

    function closeFromEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      pinned.current = false;
      setOpen(false);
    }

    document.addEventListener("pointerdown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("pointerdown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [open]);

  return (
    <span
      className="relative inline-flex shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned.current && !containerRef.current?.contains(document.activeElement)) setOpen(false);
      }}
      ref={containerRef}
    >
      <button
        aria-controls={open ? tooltipId : undefined}
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-11 w-11 items-center justify-center rounded-md text-teal transition-colors hover:bg-mint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
        onBlur={() => {
          if (!pinned.current) setOpen(false);
        }}
        onClick={() => {
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}
        onFocus={() => setOpen(true)}
        type="button"
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-teal text-xs font-semibold leading-none"
        >
          i
        </span>
      </button>

      {open ? (
        <span
          className={cx(
            "absolute top-full z-20 mt-1 w-64 max-w-[calc(100vw-2rem)] border border-ink/20 bg-ink px-3 py-2 text-start text-xs font-normal leading-5 text-white shadow-sm",
            alignmentClasses[align]
          )}
          id={tooltipId}
          role="tooltip"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
