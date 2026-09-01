export const generatedAccessibilityRoutes = [
  { pageFile: "src/app/page.tsx", route: "/" },
  { pageFile: "src/app/benchmark/page.tsx", route: "/benchmark" },
  { pageFile: "src/app/benchmark/session/page.tsx", route: "/benchmark/session" },
  { pageFile: "src/app/case-practice/page.tsx", route: "/case-practice" },
  { pageFile: "src/app/case-practice/brainstorming/page.tsx", route: "/case-practice/brainstorming" },
  { pageFile: "src/app/case-practice/fit/page.tsx", route: "/case-practice/fit" },
  { pageFile: "src/app/case-practice/lessons/page.tsx", route: "/case-practice/lessons" },
  { pageFile: "src/app/case-practice/plan/page.tsx", route: "/case-practice/plan" },
  { pageFile: "src/app/case-practice/questioning/page.tsx", route: "/case-practice/questioning" },
  { pageFile: "src/app/case-practice/simulation/page.tsx", route: "/case-practice/simulation" },
  { pageFile: "src/app/case-practice/structuring/page.tsx", route: "/case-practice/structuring" },
  { pageFile: "src/app/case-practice/synthesis/page.tsx", route: "/case-practice/synthesis" },
  { pageFile: "src/app/content-packs/page.tsx", route: "/content-packs" },
  { pageFile: "src/app/content-packs/downloads/page.tsx", route: "/content-packs/downloads" },
  { pageFile: "src/app/drills/page.tsx", route: "/drills" },
  { pageFile: "src/app/drills/session/page.tsx", route: "/drills/session" },
  { pageFile: "src/app/drills/summary/page.tsx", route: "/drills/summary" },
  { pageFile: "src/app/exhibits/page.tsx", route: "/exhibits" },
  { pageFile: "src/app/exhibits/sprint/page.tsx", route: "/exhibits/sprint" },
  { pageFile: "src/app/formulas/page.tsx", route: "/formulas" },
  { pageFile: "src/app/market-sizing/page.tsx", route: "/market-sizing" },
  { pageFile: "src/app/progress/page.tsx", route: "/progress" },
  { pageFile: "src/app/settings/page.tsx", route: "/settings" }
] as const;

export type GeneratedAccessibilityRoute = (typeof generatedAccessibilityRoutes)[number]["route"];

export const accessibilityCriterionScopeIds = [
  "all",
  "chart",
  "data-change",
  "dialog",
  "form",
  "multistep",
  "status",
  "timed",
  "user-content"
] as const;

export type AccessibilityCriterionScope = (typeof accessibilityCriterionScopeIds)[number];
export type AccessibilityStatePhase =
  | "active"
  | "complete"
  | "confirmation"
  | "entry"
  | "error"
  | "feedback"
  | "loading"
  | "offline"
  | "timeout"
  | "validation-error";

export interface AccessibilityCoverageProfile {
  automatedMethods: readonly string[];
  inputMethods: readonly string[];
  locales: readonly string[];
  manualMethods: readonly string[];
  themes: readonly string[];
  viewports: readonly string[];
}

export const accessibilityCoverageProfiles = {
  critical: {
    automatedMethods: [
      "axe-wcag22-a-aa",
      "keyboard-journey",
      "focus-order-visible",
      "status-error-announcement",
      "viewport-reflow",
      "forced-colors",
      "reduced-motion",
      "rtl",
      "text-expansion"
    ],
    inputMethods: ["keyboard", "pointer", "screen-reader"],
    locales: ["en", "de", "ar"],
    manualMethods: [
      "nvda-chrome-windows",
      "voiceover-safari-macos",
      "zoom-reflow",
      "text-spacing",
      "forced-colors",
      "reduced-motion"
    ],
    themes: ["light", "dark", "forced-colors"],
    viewports: ["1280x720", "320x568", "200%-zoom"]
  },
  interactive: {
    automatedMethods: ["axe-wcag22-a-aa", "keyboard-journey", "focus-order-visible", "status-error-announcement"],
    inputMethods: ["keyboard", "pointer", "screen-reader"],
    locales: ["en", "ar"],
    manualMethods: ["nvda-chrome-windows", "voiceover-safari-macos", "zoom-reflow"],
    themes: ["light", "dark"],
    viewports: ["1280x720", "320x568", "200%-zoom"]
  },
  route: {
    automatedMethods: ["axe-wcag22-a-aa", "keyboard-smoke"],
    inputMethods: ["keyboard", "pointer", "screen-reader"],
    locales: ["en"],
    manualMethods: ["nvda-chrome-windows", "voiceover-safari-macos"],
    themes: ["light"],
    viewports: ["1280x720"]
  },
  timed: {
    automatedMethods: [
      "axe-wcag22-a-aa",
      "keyboard-journey",
      "focus-order-visible",
      "status-error-announcement",
      "fake-clock-timeout",
      "reduced-motion"
    ],
    inputMethods: ["keyboard", "pointer", "screen-reader"],
    locales: ["en", "de", "ar"],
    manualMethods: [
      "nvda-chrome-windows",
      "voiceover-safari-macos",
      "timer-comprehension",
      "zoom-reflow",
      "reduced-motion"
    ],
    themes: ["light", "dark", "forced-colors"],
    viewports: ["1280x720", "320x568", "200%-zoom"]
  },
  visual: {
    automatedMethods: [
      "axe-wcag22-a-aa",
      "keyboard-journey",
      "focus-order-visible",
      "viewport-reflow",
      "forced-colors",
      "rtl"
    ],
    inputMethods: ["keyboard", "pointer", "screen-reader"],
    locales: ["en", "de", "ar"],
    manualMethods: [
      "nvda-chrome-windows",
      "voiceover-safari-macos",
      "chart-table-equivalence",
      "zoom-reflow",
      "text-spacing",
      "forced-colors"
    ],
    themes: ["light", "dark", "forced-colors"],
    viewports: ["1280x720", "320x568", "200%-zoom"]
  }
} as const satisfies Record<string, AccessibilityCoverageProfile>;

export type AccessibilityCoverageProfileId = keyof typeof accessibilityCoverageProfiles;

export interface AccessibilityRouteState {
  coverage: AccessibilityCoverageProfileId;
  expectedHeading: string;
  id: string;
  phase: AccessibilityStatePhase;
  process: string;
  route: GeneratedAccessibilityRoute | "*";
  scopes: readonly AccessibilityCriterionScope[];
  setup: string;
  url: string;
}

export const accessibilityRouteStates = [
  state("dashboard:first-run", "/", "/", "dashboard", "entry", "fresh-storage", "Dashboard", "critical", ["all"]),
  state("dashboard:loading", "/", "/", "dashboard", "loading", "delayed-storage", "Dashboard", "route", ["all", "status"]),
  state("dashboard:returning", "/", "/", "dashboard", "active", "seeded-progress", "Dashboard", "interactive", ["all", "status"]),
  state("dashboard:storage-error", "/", "/", "dashboard", "error", "storage-failure", "Dashboard", "critical", ["all", "status"]),

  state("benchmark:selection-empty", "/benchmark", "/benchmark", "benchmark", "entry", "fresh-storage", "Benchmark your performance", "critical", ["all", "form"]),
  state("benchmark:selection-history", "/benchmark", "/benchmark", "benchmark", "active", "seeded-benchmark-history", "Benchmark your performance", "interactive", ["all", "status"]),
  state("benchmark:selection-confirmation", "/benchmark", "/benchmark?benchmark=beginner", "benchmark", "confirmation", "default-content", "Benchmark your performance", "critical", ["all", "form"]),
  state("benchmark:session-active", "/benchmark/session", "/benchmark/session?benchmark=beginner", "benchmark", "active", "default-content", "Beginner Benchmark", "timed", ["all", "form", "timed"]),
  state("benchmark:session-validation-error", "/benchmark/session", "/benchmark/session?benchmark=beginner", "benchmark", "validation-error", "blank-submit", "Beginner Benchmark", "timed", ["all", "form", "status", "timed"]),
  state("benchmark:session-timeout", "/benchmark/session", "/benchmark/session?benchmark=beginner", "benchmark", "timeout", "fake-timer-expiry", "Beginner Benchmark", "timed", ["all", "status", "timed"]),
  state("benchmark:session-complete", "/benchmark/session", "/benchmark/session?benchmark=beginner", "benchmark", "complete", "complete-valid-flow", "Beginner Benchmark", "timed", ["all", "status", "timed"]),
  state("benchmark:session-invalid", "/benchmark/session", "/benchmark/session?benchmark=missing", "benchmark", "error", "default-content", "Benchmark Session", "critical", ["all", "status"]),

  state("case-hub:default", "/case-practice", "/case-practice", "case-hub", "entry", "default-content", "Case Practice", "route", ["all"]),
  state("case-hub:installed-pack", "/case-practice", "/case-practice?pack=fixture-case-pack", "case-hub", "active", "installed-case-pack", "Fixture Case Pack", "interactive", ["all", "user-content"]),
  state("case-hub:pack-error", "/case-practice", "/case-practice?pack=missing", "case-hub", "error", "default-content", "Content Pack", "critical", ["all", "status"]),

  state("brainstorming:entry", "/case-practice/brainstorming", "/case-practice/brainstorming", "case-brainstorming", "entry", "default-content", "Structured Brainstorming", "interactive", ["all", "form", "multistep"]),
  state("brainstorming:validation-error", "/case-practice/brainstorming", "/case-practice/brainstorming", "case-brainstorming", "validation-error", "blank-submit", "Structured Brainstorming", "critical", ["all", "form", "status", "multistep"]),
  state("brainstorming:complete", "/case-practice/brainstorming", "/case-practice/brainstorming", "case-brainstorming", "complete", "complete-valid-flow", "Structured Brainstorming", "critical", ["all", "status", "multistep"]),

  state("fit:story-entry", "/case-practice/fit", "/case-practice/fit", "fit", "entry", "fresh-storage", "Fit and Behavioral Practice", "critical", ["all", "form", "user-content"]),
  state("fit:story-validation-error", "/case-practice/fit", "/case-practice/fit", "fit", "validation-error", "blank-submit", "Fit and Behavioral Practice", "critical", ["all", "form", "status", "user-content"]),
  state("fit:rehearsal-active", "/case-practice/fit", "/case-practice/fit", "fit", "active", "seeded-fit-story", "Fit and Behavioral Practice", "timed", ["all", "form", "timed", "user-content"]),
  state("fit:rehearsal-timeout", "/case-practice/fit", "/case-practice/fit", "fit", "timeout", "fake-timer-expiry", "Fit and Behavioral Practice", "timed", ["all", "status", "timed", "user-content"]),
  state("fit:self-review-complete", "/case-practice/fit", "/case-practice/fit", "fit", "complete", "complete-valid-flow", "Fit and Behavioral Practice", "critical", ["all", "status", "user-content"]),
  state("fit:save-error", "/case-practice/fit", "/case-practice/fit", "fit", "error", "save-failure", "Fit and Behavioral Practice", "critical", ["all", "form", "status", "user-content"]),

  state("lessons:entry", "/case-practice/lessons", "/case-practice/lessons", "case-lessons", "entry", "fresh-storage", "Concept Lessons", "interactive", ["all", "multistep"]),
  state("lessons:answer-feedback", "/case-practice/lessons", "/case-practice/lessons", "case-lessons", "feedback", "complete-valid-flow", "Concept Lessons", "critical", ["all", "form", "status", "multistep"]),
  state("lessons:complete", "/case-practice/lessons", "/case-practice/lessons", "case-lessons", "complete", "seeded-lesson-progress", "Concept Lessons", "interactive", ["all", "status", "multistep"]),
  state("lessons:load-error", "/case-practice/lessons", "/case-practice/lessons", "case-lessons", "error", "load-failure", "Concept Lessons", "critical", ["all", "status"]),

  state("prep-plan:entry", "/case-practice/plan", "/case-practice/plan", "prep-plan", "entry", "fresh-storage", "Weekly Prep Plan", "critical", ["all", "form", "multistep", "user-content"]),
  state("prep-plan:active", "/case-practice/plan", "/case-practice/plan", "prep-plan", "active", "seeded-progress", "Weekly Prep Plan", "interactive", ["all", "form", "multistep", "user-content"]),
  state("prep-plan:complete", "/case-practice/plan", "/case-practice/plan", "prep-plan", "complete", "complete-valid-flow", "Weekly Prep Plan", "critical", ["all", "form", "status", "multistep", "user-content"]),
  state("prep-plan:error", "/case-practice/plan", "/case-practice/plan", "prep-plan", "error", "storage-failure", "Weekly Prep Plan", "critical", ["all", "status", "user-content"]),

  state("questioning:entry", "/case-practice/questioning", "/case-practice/questioning", "case-questioning", "entry", "default-content", "Questioning practice", "critical", ["all", "form", "multistep", "user-content"]),
  state("questioning:validation-error", "/case-practice/questioning", "/case-practice/questioning", "case-questioning", "validation-error", "blank-submit", "Questioning practice", "critical", ["all", "form", "status", "multistep", "user-content"]),
  state("questioning:complete", "/case-practice/questioning", "/case-practice/questioning", "case-questioning", "complete", "complete-valid-flow", "Questioning practice", "critical", ["all", "status", "multistep", "user-content"]),

  state("full-case:questioning", "/case-practice/simulation", "/case-practice/simulation", "full-case", "entry", "default-content", "Full Case Simulation", "critical", ["all", "form", "multistep"]),
  state("full-case:structure", "/case-practice/simulation", "/case-practice/simulation", "full-case", "active", "full-case-structure", "Full Case Simulation", "critical", ["all", "form", "multistep"]),
  state("full-case:calculation", "/case-practice/simulation", "/case-practice/simulation", "full-case", "active", "full-case-calculation", "Full Case Simulation", "visual", ["all", "chart", "form", "multistep"]),
  state("full-case:brainstorming", "/case-practice/simulation", "/case-practice/simulation", "full-case", "active", "full-case-brainstorming", "Full Case Simulation", "critical", ["all", "form", "multistep"]),
  state("full-case:synthesis", "/case-practice/simulation", "/case-practice/simulation", "full-case", "active", "full-case-synthesis", "Full Case Simulation", "critical", ["all", "form", "multistep"]),
  state("full-case:validation-error", "/case-practice/simulation", "/case-practice/simulation", "full-case", "validation-error", "blank-submit", "Full Case Simulation", "critical", ["all", "form", "status", "multistep"]),
  state("full-case:complete", "/case-practice/simulation", "/case-practice/simulation", "full-case", "complete", "complete-valid-flow", "Full Case Simulation", "critical", ["all", "status", "multistep"]),
  state("full-case:save-error", "/case-practice/simulation", "/case-practice/simulation", "full-case", "error", "save-failure", "Full Case Simulation", "critical", ["all", "status", "multistep"]),

  state("structuring:entry", "/case-practice/structuring", "/case-practice/structuring", "case-structuring", "entry", "default-content", "Case structuring", "critical", ["all", "form", "multistep"]),
  state("structuring:validation-error", "/case-practice/structuring", "/case-practice/structuring", "case-structuring", "validation-error", "blank-submit", "Case structuring", "critical", ["all", "form", "status", "multistep"]),
  state("structuring:complete", "/case-practice/structuring", "/case-practice/structuring", "case-structuring", "complete", "complete-valid-flow", "Case structuring", "critical", ["all", "status", "multistep"]),

  state("synthesis:entry", "/case-practice/synthesis", "/case-practice/synthesis", "case-synthesis", "entry", "default-content", "Synthesis and Recommendation", "critical", ["all", "form", "multistep"]),
  state("synthesis:validation-error", "/case-practice/synthesis", "/case-practice/synthesis", "case-synthesis", "validation-error", "blank-submit", "Synthesis and Recommendation", "critical", ["all", "form", "status", "multistep"]),
  state("synthesis:complete", "/case-practice/synthesis", "/case-practice/synthesis", "case-synthesis", "complete", "complete-valid-flow", "Synthesis and Recommendation", "critical", ["all", "status", "multistep"]),
  state("synthesis:load-error", "/case-practice/synthesis", "/case-practice/synthesis", "case-synthesis", "error", "load-failure", "Synthesis and Recommendation", "critical", ["all", "status"]),

  state("content-packs:discover-empty", "/content-packs", "/content-packs?view=discover", "content-pack-discover", "entry", "default-content", "Content Packs", "critical", ["all", "status"]),
  state("content-packs:discover-offline", "/content-packs", "/content-packs?view=discover", "content-pack-discover", "offline", "offline-uncached", "Content Packs", "critical", ["all", "status"]),
  state("content-packs:installed-empty", "/content-packs", "/content-packs?view=installed", "content-pack-manage", "entry", "fresh-storage", "Content Packs", "interactive", ["all", "data-change"]),
  state("content-packs:installed-list", "/content-packs", "/content-packs?view=installed", "content-pack-manage", "active", "installed-pack", "Content Packs", "critical", ["all", "data-change", "user-content"]),
  state("content-packs:remove-confirmation", "/content-packs", "/content-packs?view=installed", "content-pack-manage", "confirmation", "installed-pack", "Content Packs", "critical", ["all", "data-change", "dialog"]),
  state("content-packs:remove-complete", "/content-packs", "/content-packs?view=installed", "content-pack-manage", "complete", "complete-valid-flow", "Content Packs", "critical", ["all", "data-change", "status"]),
  state("content-packs:remove-error", "/content-packs", "/content-packs?view=installed", "content-pack-manage", "error", "storage-failure", "Content Packs", "critical", ["all", "data-change", "status"]),
  state("content-packs:import-entry", "/content-packs", "/content-packs?view=import", "content-pack-import", "entry", "fresh-storage", "Content Packs", "critical", ["all", "data-change", "form", "user-content"]),
  state("content-packs:import-invalid", "/content-packs", "/content-packs?view=import", "content-pack-import", "validation-error", "invalid-pack", "Content Packs", "critical", ["all", "data-change", "form", "status", "user-content"]),
  state("content-packs:import-review", "/content-packs", "/content-packs?view=import", "content-pack-import", "confirmation", "valid-pack", "Content Packs", "critical", ["all", "data-change", "form", "user-content"]),
  state("content-packs:import-conflict", "/content-packs", "/content-packs?view=import", "content-pack-import", "confirmation", "replacement-conflict", "Content Packs", "critical", ["all", "data-change", "form", "user-content"]),
  state("content-packs:import-complete", "/content-packs", "/content-packs?view=import", "content-pack-import", "complete", "complete-valid-flow", "Content Packs", "critical", ["all", "data-change", "status", "user-content"]),
  state("content-packs:import-error", "/content-packs", "/content-packs?view=import", "content-pack-import", "error", "storage-failure", "Content Packs", "critical", ["all", "data-change", "form", "status", "user-content"]),
  state("content-packs:create-entry", "/content-packs", "/content-packs?view=create", "content-pack-author", "entry", "default-content", "Content Packs", "critical", ["all", "form", "user-content"]),
  state("content-packs:create-dirty", "/content-packs", "/content-packs?view=create", "content-pack-author", "active", "dirty-builder", "Content Packs", "critical", ["all", "form", "user-content"]),
  state("content-packs:create-validation-error", "/content-packs", "/content-packs?view=create", "content-pack-author", "validation-error", "invalid-pack", "Content Packs", "critical", ["all", "form", "status", "user-content"]),
  state("content-packs:create-complete", "/content-packs", "/content-packs?view=create", "content-pack-author", "complete", "valid-pack", "Content Packs", "critical", ["all", "form", "status", "user-content"]),
  state("content-packs:resources", "/content-packs", "/content-packs?view=resources", "content-pack-resources", "entry", "default-content", "Content Packs", "route", ["all"]),

  state("content-pack-downloads:default", "/content-packs/downloads", "/content-packs/downloads", "content-pack-downloads", "entry", "default-content", "Download authoring resources", "route", ["all"]),
  state("content-pack-downloads:optional-expanded", "/content-packs/downloads", "/content-packs/downloads", "content-pack-downloads", "active", "expanded-details", "Download authoring resources", "interactive", ["all"]),

  state("drill:setup-default", "/drills", "/drills", "drill", "entry", "default-content", "Drill Selection", "critical", ["all", "form"]),
  state("drill:setup-validation-error", "/drills", "/drills", "drill", "validation-error", "invalid-drill-settings", "Drill Selection", "critical", ["all", "form", "status"]),
  state("drill:session-loading", "/drills/session", "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=instant", "drill", "loading", "delayed-storage", "Active Drill Session", "route", ["all", "status"]),
  state("drill:session-active", "/drills/session", "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=instant", "drill", "active", "default-content", "Active Drill Session", "critical", ["all", "form"]),
  state("drill:session-validation-error", "/drills/session", "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=retry_first", "drill", "validation-error", "invalid-numeric-submit", "Active Drill Session", "critical", ["all", "form", "status"]),
  state("drill:session-feedback", "/drills/session", "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=instant", "drill", "feedback", "incorrect-submit", "Active Drill Session", "critical", ["all", "form", "status"]),
  state("drill:session-timeout", "/drills/session", "/drills/session?categories=arithmetic&tags=addition&count=1&timingMode=per_question&secondsPerQuestion=20", "drill", "timeout", "fake-timer-expiry", "Active Drill Session", "timed", ["all", "status", "timed"]),
  state("drill:session-offline", "/drills/session", "/drills/session?categories=arithmetic&tags=addition&count=1&feedbackMode=instant", "drill", "offline", "offline-warmed", "Active Drill Session", "critical", ["all", "form", "status"]),
  state("drill:summary-complete", "/drills/summary", "/drills/summary", "drill", "complete", "seeded-completed-drill", "Session Summary", "critical", ["all", "status"]),
  state("drill:summary-empty", "/drills/summary", "/drills/summary", "drill", "error", "fresh-storage", "Session Summary", "interactive", ["all", "status"]),
  state("drill:summary-load-error", "/drills/summary", "/drills/summary", "drill", "error", "storage-failure", "Session Summary", "critical", ["all", "status"]),

  state("exhibit:active", "/exhibits", "/exhibits", "exhibit", "entry", "default-content", "Exhibit Drills", "visual", ["all", "chart", "form"]),
  state("exhibit:validation-error", "/exhibits", "/exhibits", "exhibit", "validation-error", "blank-submit", "Exhibit Drills", "visual", ["all", "chart", "form", "status"]),
  state("exhibit:feedback", "/exhibits", "/exhibits", "exhibit", "feedback", "complete-valid-flow", "Exhibit Drills", "visual", ["all", "chart", "form", "status"]),
  state("exhibit:save-error", "/exhibits", "/exhibits", "exhibit", "error", "save-failure", "Exhibit Drills", "visual", ["all", "chart", "status"]),
  state("exhibit:complete", "/exhibits", "/exhibits", "exhibit", "complete", "complete-valid-flow", "Exhibit Drills", "visual", ["all", "chart", "status"]),

  state("exhibit-sprint:setup", "/exhibits/sprint", "/exhibits/sprint", "exhibit-sprint", "entry", "default-content", "Exhibit Sprint", "visual", ["all", "chart", "form", "timed"]),
  state("exhibit-sprint:active", "/exhibits/sprint", "/exhibits/sprint", "exhibit-sprint", "active", "sprint-started", "Exhibit Sprint", "timed", ["all", "chart", "form", "timed"]),
  state("exhibit-sprint:timeout-feedback", "/exhibits/sprint", "/exhibits/sprint", "exhibit-sprint", "timeout", "fake-timer-expiry", "Exhibit Sprint", "timed", ["all", "chart", "status", "timed"]),
  state("exhibit-sprint:complete", "/exhibits/sprint", "/exhibits/sprint", "exhibit-sprint", "complete", "complete-valid-flow", "Exhibit Sprint", "visual", ["all", "chart", "status", "timed"]),

  state("formulas:library", "/formulas", "/formulas", "formulas", "entry", "default-content", "Formula Library", "route", ["all"]),
  state("formulas:filtered-detail", "/formulas", "/formulas", "formulas", "active", "filtered-formulas", "Formula Library", "interactive", ["all", "form"]),

  state("market-sizing:assumptions", "/market-sizing", "/market-sizing", "market-sizing", "entry", "default-content", "Guided Market Sizing", "critical", ["all", "form", "multistep"]),
  state("market-sizing:calculation", "/market-sizing", "/market-sizing", "market-sizing", "active", "market-calculation", "Guided Market Sizing", "critical", ["all", "form", "multistep"]),
  state("market-sizing:final-answer", "/market-sizing", "/market-sizing", "market-sizing", "active", "market-final-answer", "Guided Market Sizing", "critical", ["all", "form", "multistep"]),
  state("market-sizing:sense-check", "/market-sizing", "/market-sizing", "market-sizing", "active", "market-sense-check", "Guided Market Sizing", "critical", ["all", "form", "multistep", "user-content"]),
  state("market-sizing:validation-error", "/market-sizing", "/market-sizing", "market-sizing", "validation-error", "blank-submit", "Guided Market Sizing", "critical", ["all", "form", "status", "multistep"]),
  state("market-sizing:complete", "/market-sizing", "/market-sizing", "market-sizing", "complete", "complete-valid-flow", "Guided Market Sizing", "critical", ["all", "form", "status", "multistep"]),
  state("market-sizing:save-error", "/market-sizing", "/market-sizing", "market-sizing", "error", "save-failure", "Guided Market Sizing", "critical", ["all", "form", "status", "multistep"]),

  state("progress:empty", "/progress", "/progress", "progress", "entry", "fresh-storage", "Progress Dashboard", "critical", ["all"]),
  state("progress:populated", "/progress", "/progress", "progress", "active", "seeded-progress", "Progress Dashboard", "interactive", ["all", "status"]),
  state("progress:load-error", "/progress", "/progress", "progress", "error", "storage-failure", "Progress Dashboard", "critical", ["all", "status"]),

  state("settings:default", "/settings", "/settings", "settings", "entry", "default-content", "Local App Settings", "critical", ["all", "form"]),
  state("settings:local-data-expanded", "/settings", "/settings", "settings", "active", "expanded-local-data", "Local App Settings", "critical", ["all", "data-change", "form"]),
  state("settings:export-entry", "/settings", "/settings", "settings-export", "entry", "expanded-local-data", "Local App Settings", "critical", ["all", "data-change", "form"]),
  state("settings:export-complete", "/settings", "/settings", "settings-export", "complete", "complete-valid-flow", "Local App Settings", "critical", ["all", "data-change", "status"]),
  state("settings:export-error", "/settings", "/settings", "settings-export", "error", "storage-failure", "Local App Settings", "critical", ["all", "data-change", "status"]),
  state("settings:import-entry", "/settings", "/settings", "settings-import", "entry", "expanded-local-data", "Local App Settings", "critical", ["all", "data-change", "form"]),
  state("settings:import-invalid", "/settings", "/settings", "settings-import", "validation-error", "invalid-progress-import", "Local App Settings", "critical", ["all", "data-change", "form", "status"]),
  state("settings:import-confirmation", "/settings", "/settings", "settings-import", "confirmation", "valid-progress-import", "Local App Settings", "critical", ["all", "data-change", "form"]),
  state("settings:import-complete", "/settings", "/settings", "settings-import", "complete", "complete-valid-flow", "Local App Settings", "critical", ["all", "data-change", "status"]),
  state("settings:import-error", "/settings", "/settings", "settings-import", "error", "storage-failure", "Local App Settings", "critical", ["all", "data-change", "form", "status"]),
  state("settings:reset-entry", "/settings", "/settings", "settings-reset", "entry", "expanded-reset", "Local App Settings", "critical", ["all", "data-change", "form"]),
  state("settings:reset-confirmation", "/settings", "/settings", "settings-reset", "confirmation", "expanded-reset", "Local App Settings", "critical", ["all", "data-change", "form"]),
  state("settings:reset-complete", "/settings", "/settings", "settings-reset", "complete", "complete-valid-flow", "Local App Settings", "critical", ["all", "data-change", "status"]),
  state("settings:reset-error", "/settings", "/settings", "settings-reset", "error", "storage-failure", "Local App Settings", "critical", ["all", "data-change", "status"]),

  state("not-found:unknown-route", "*", "/missing-accessibility-route", "not-found", "error", "default-content", "Page not found", "critical", ["all", "status"])
] as const satisfies readonly AccessibilityRouteState[];

export const completeProcessPhaseRequirements = {
  benchmark: ["entry", "active", "validation-error", "timeout", "complete", "error"],
  "case-brainstorming": ["entry", "validation-error", "complete"],
  "case-lessons": ["entry", "feedback", "complete", "error"],
  "case-questioning": ["entry", "validation-error", "complete"],
  "case-structuring": ["entry", "validation-error", "complete"],
  "case-synthesis": ["entry", "validation-error", "complete", "error"],
  "content-pack-author": ["entry", "active", "validation-error", "complete"],
  "content-pack-import": ["entry", "validation-error", "confirmation", "complete", "error"],
  "content-pack-manage": ["entry", "active", "confirmation", "complete", "error"],
  drill: ["entry", "active", "validation-error", "feedback", "timeout", "complete", "error", "offline"],
  exhibit: ["entry", "validation-error", "feedback", "complete", "error"],
  "exhibit-sprint": ["entry", "active", "timeout", "complete"],
  fit: ["entry", "active", "validation-error", "timeout", "complete", "error"],
  "full-case": ["entry", "active", "validation-error", "complete", "error"],
  "market-sizing": ["entry", "active", "validation-error", "complete", "error"],
  "prep-plan": ["entry", "active", "complete", "error"],
  "settings-export": ["entry", "complete", "error"],
  "settings-import": ["entry", "validation-error", "confirmation", "complete", "error"],
  "settings-reset": ["entry", "confirmation", "complete", "error"]
} as const satisfies Record<string, readonly AccessibilityStatePhase[]>;

export const wcag22LevelAAndAaCriteria = [
  ["1.1.1", "A"],
  ["1.2.1", "A"],
  ["1.2.2", "A"],
  ["1.2.3", "A"],
  ["1.2.4", "AA"],
  ["1.2.5", "AA"],
  ["1.3.1", "A"],
  ["1.3.2", "A"],
  ["1.3.3", "A"],
  ["1.3.4", "AA"],
  ["1.3.5", "AA"],
  ["1.4.1", "A"],
  ["1.4.2", "A"],
  ["1.4.3", "AA"],
  ["1.4.4", "AA"],
  ["1.4.5", "AA"],
  ["1.4.10", "AA"],
  ["1.4.11", "AA"],
  ["1.4.12", "AA"],
  ["1.4.13", "AA"],
  ["2.1.1", "A"],
  ["2.1.2", "A"],
  ["2.1.4", "A"],
  ["2.2.1", "A"],
  ["2.2.2", "A"],
  ["2.3.1", "A"],
  ["2.4.1", "A"],
  ["2.4.2", "A"],
  ["2.4.3", "A"],
  ["2.4.4", "A"],
  ["2.4.5", "AA"],
  ["2.4.6", "AA"],
  ["2.4.7", "AA"],
  ["2.4.11", "AA"],
  ["2.5.1", "A"],
  ["2.5.2", "A"],
  ["2.5.3", "A"],
  ["2.5.4", "A"],
  ["2.5.7", "AA"],
  ["2.5.8", "AA"],
  ["3.1.1", "A"],
  ["3.1.2", "AA"],
  ["3.2.1", "A"],
  ["3.2.2", "A"],
  ["3.2.3", "AA"],
  ["3.2.4", "AA"],
  ["3.2.6", "A"],
  ["3.3.1", "A"],
  ["3.3.2", "A"],
  ["3.3.3", "AA"],
  ["3.3.4", "AA"],
  ["3.3.7", "A"],
  ["3.3.8", "AA"],
  ["4.1.2", "A"],
  ["4.1.3", "AA"]
] as const;

export interface AccessibilityEvidenceRow {
  date: string;
  evidence: string;
  owner: string;
  result: "fail" | "not_applicable" | "not_run" | "pass";
  status: "release_blocking" | "ready";
}

export function isAccessibilityReleaseReady(rows: readonly AccessibilityEvidenceRow[]): boolean {
  return rows.length > 0 && rows.every((row) =>
    (row.result === "pass" || row.result === "not_applicable") &&
    row.status === "ready" &&
    row.owner.trim().length > 0 &&
    row.evidence.trim().length > 0 &&
    /^\d{4}-\d{2}-\d{2}$/.test(row.date)
  );
}

function state(
  id: string,
  route: GeneratedAccessibilityRoute | "*",
  url: string,
  process: string,
  phase: AccessibilityStatePhase,
  setup: string,
  expectedHeading: string,
  coverage: AccessibilityCoverageProfileId,
  scopes: readonly AccessibilityCriterionScope[]
): AccessibilityRouteState {
  return { coverage, expectedHeading, id, phase, process, route, scopes, setup, url };
}
