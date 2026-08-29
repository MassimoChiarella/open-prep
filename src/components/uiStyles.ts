export type ButtonTone = "danger" | "primary" | "secondary";
export type PanelTone = "danger" | "default" | "highlight" | "subtle";
export type StatusTone = "error" | "neutral" | "success" | "warning";

export function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

export const uiPanels = {
  base: "min-w-0 border p-5 sm:p-6",
  tone: {
    danger: "border-coral/30 border-t-2 border-t-coral bg-white",
    default: "border-ink/15 bg-white",
    highlight: "border-teal/25 border-t-2 border-t-teal bg-mint/40",
    subtle: "border-ink/15 bg-paper"
  } satisfies Record<PanelTone, string>
};

export const uiButtons = {
  base: "inline-flex min-h-11 w-fit items-center justify-center rounded-md px-4 text-sm font-semibold transition duration-200 ease-out motion-reduce:transform-none enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  tone: {
    danger: "bg-coral text-white enabled:hover:bg-coral/85 disabled:bg-ink/30",
    primary: "bg-ink text-white enabled:hover:bg-ink/85",
    secondary: "border border-ink/50 bg-transparent text-ink enabled:hover:bg-mint"
  } satisfies Record<ButtonTone, string>
};

export const uiInputs = {
  base: "h-11 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 text-base text-ink outline-none transition-colors duration-200 placeholder:text-ink/65 focus:border-ink",
  compact:
    "h-11 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 text-sm font-medium text-ink outline-none transition-colors duration-200 focus:border-ink",
  textarea:
    "min-h-28 w-full min-w-0 rounded-md border border-ink/50 bg-white px-3 py-2 text-base text-ink outline-none transition-colors duration-200 placeholder:text-ink/65 focus:border-ink"
};

export const uiBadges = {
  base: "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.05em]",
  tone: {
    error: "bg-coral/10 text-coral",
    neutral: "bg-paper text-ink/65",
    success: "bg-mint text-teal",
    warning: "bg-saffron/20 text-ink"
  } satisfies Record<StatusTone, string>
};

export const uiStatusDots = {
  error: "bg-coral",
  neutral: "bg-ink/35",
  success: "bg-teal",
  warning: "bg-saffron"
} satisfies Record<StatusTone, string>;

export const uiStatusMessages = {
  base: "border px-3 py-2",
  tone: {
    error: "border-coral/30 bg-coral/10",
    neutral: "border-ink/10 bg-paper",
    success: "border-teal/20 bg-mint/70",
    warning: "border-saffron/40 bg-saffron/10"
  } satisfies Record<StatusTone, string>
};

export const uiText = {
  body: "text-sm leading-6 text-ink/70",
  bodyStrong: "text-sm leading-6 text-ink",
  controlLabel: "text-sm font-medium text-ink/80",
  dense: "text-xs leading-5 text-ink/65",
  eyebrow: "text-xs font-semibold uppercase tracking-[0.06em]",
  metric: "font-mono text-2xl font-semibold text-ink",
  pageDescription: "max-w-2xl text-base leading-7 text-ink/70",
  pageTitle: "text-4xl font-semibold leading-none tracking-[-0.045em] text-ink sm:text-5xl",
  sectionTitle: "min-w-0 break-words text-xl font-semibold leading-7 tracking-[-0.02em] text-ink [overflow-wrap:anywhere]",
  subsectionTitle: "min-w-0 break-words text-base font-semibold tracking-[-0.01em] text-ink [overflow-wrap:anywhere]"
};

export function panelClass(tone: PanelTone = "default", extra?: string): string {
  return cx(uiPanels.base, uiPanels.tone[tone], extra);
}

export function buttonClass(tone: ButtonTone = "primary", extra?: string): string {
  return cx(uiButtons.base, uiButtons.tone[tone], extra);
}

export function badgeClass(tone: StatusTone = "neutral", extra?: string): string {
  return cx(uiBadges.base, uiBadges.tone[tone], extra);
}

export function statusMessageClass(tone: StatusTone = "success", extra?: string): string {
  return cx(uiStatusMessages.base, uiStatusMessages.tone[tone], extra);
}
