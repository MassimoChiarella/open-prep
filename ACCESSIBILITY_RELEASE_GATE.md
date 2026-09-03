# Accessibility Release Gate

## Purpose

Open Prep targets WCAG 2.2 Level A and AA for every supported generated page and every page in each complete practice, content-pack, and local-data process. This ledger records the evidence required for an accessibility release decision. It follows the WCAG full-page and complete-process conformance model described by the [W3C WCAG 2.2 Recommendation](https://www.w3.org/TR/WCAG22/).

Automated checks are local regression evidence only. Passing automation is not legal certification, is not an accessibility conformance claim, and does not replace qualified human evaluation. The app and test suite must not send page data or learner data to an external scanner.

Manual evidence must be recorded only after it is performed. Each assistive-technology matrix is tracked independently, so completed Windows/NVDA evidence may be recorded while VoiceOver/Safari remains pending. Dependent criterion and route/state rows remain `Partial` and `Blocked` until all of their required evidence exists. The table values below are authoritative; automated rehearsal does not advance manual evidence.

## Release Rules

1. Evaluate full generated pages, including content outside the main workflow, and every page/state in each complete process.
2. Run axe with the applicable WCAG 2.2 A/AA tags and fail on every tagged violation regardless of impact. Do not broadly suppress rules.
3. A narrow exception must name one criterion and state, explain why it is valid, identify an owner and review/expiry condition, and include manual evidence.
4. `Pass` and an approved `Not applicable` are the only acceptable final criterion results. `Not run`, `Partial`, or `Fail` is release-blocking.
5. A row is `Ready` only when its result is acceptable and its owner, dated evidence, browser/OS or tool version, and known limitations are recorded.
6. Record each assistive-technology matrix independently. A completed NVDA matrix may be `Pass` and `Ready` while VoiceOver/Safari remains `Not run` and `Blocked`; rows requiring both matrices remain `Partial` and `Blocked` in that state.
7. The release is blocked unless every criterion row and route/state row is `Ready`, both assistive-technology matrices are `Pass` and `Ready`, and the accessibility lead and release manager sign.
8. Imported or authored content is evaluated in representative valid, maximum-length, mixed-language, RTL, chart/table, validation-error, and unsafe-input states. Validation does not prove content quality or accessibility.

## Result Model

| Result | Meaning | Allowed release status |
| --- | --- | --- |
| `Not run` | Required evidence has not been collected. | `Blocked` only |
| `Partial` | Some required evidence has been collected, but at least one required environment or review remains pending. | `Blocked` only |
| `Fail` | A criterion or required state does not pass. | `Blocked` only |
| `Pass` | Required automated and manual evidence passes. | `Ready` only with complete evidence fields |
| `Not applicable` | A reviewer approved a criterion-specific N/A rationale for this release candidate. | `Ready` only with dated evidence and owner |

## Coverage Profiles

The TypeScript manifest `src/tests/fixtures/accessibilityRouteStates.ts` assigns one profile to every state. These definitions avoid copying setup prose into future Playwright tests.

| Profile | Locales | Themes | Viewports | Input methods | Automated coverage | Manual coverage |
| --- | --- | --- | --- | --- | --- | --- |
| `route` | English (`en`) | Light | 1280x720 | Keyboard, pointer, screen reader | WCAG 2.2 A/AA axe; keyboard smoke | NVDA with Chrome on Windows; VoiceOver with Safari on macOS |
| `interactive` | English (`en`), Arabic (`ar`) | Light, dark | 1280x720; 320x568; 200% zoom/reflow | Keyboard, pointer, screen reader | Axe; keyboard journey; visible focus/order; status/error announcements | NVDA/Chrome/Windows; VoiceOver/Safari/macOS; zoom/reflow |
| `critical` | English (`en`), German (`de`), Arabic (`ar`) | Light, dark, forced colors | 1280x720; 320x568; 200% zoom/reflow | Keyboard, pointer, screen reader | Axe; complete keyboard journey; visible focus/order; announcements; reflow; forced colors; reduced motion; RTL; text expansion | NVDA/Chrome/Windows; VoiceOver/Safari/macOS; zoom/reflow; WCAG text spacing; forced colors; reduced motion |
| `visual` | English (`en`), German (`de`), Arabic (`ar`) | Light, dark, forced colors | 1280x720; 320x568; 200% zoom/reflow | Keyboard, pointer, screen reader | Axe; keyboard; visible focus/order; reflow; forced colors; RTL | Both AT matrices; chart/table equivalence; zoom/reflow; text spacing; forced colors |
| `timed` | English (`en`), German (`de`), Arabic (`ar`) | Light, dark, forced colors | 1280x720; 320x568; 200% zoom/reflow | Keyboard, pointer, screen reader | Axe; keyboard; visible focus/order; announcements; deterministic fake-clock timeout; reduced motion | Both AT matrices; timer comprehension and control; zoom/reflow; reduced motion |

`200% zoom/reflow` means browser zoom at 200% with no loss of content or function and no two-dimensional scrolling except where WCAG permits it for content such as data tables. The 320x568 run, German expansion, Arabic RTL, and the WCAG text-spacing override are separate checks, not substitutes for 200% zoom.

## Criterion Scope Codes

| Scope | Route/state selection |
| --- | --- |
| `ALL` | Every state in the TypeScript manifest, including not-found behavior. |
| `CHART` | States tagged `chart`: exhibits, Exhibit Sprint, and full-case exhibit/calculation stages. |
| `DATA-CHANGE` | States tagged `data-change`: pack install/replacement/removal and Settings export/import/reset. |
| `DIALOG` | States tagged `dialog`: confirmation or modal behavior and focus return. |
| `FORM` | States tagged `form`: setup, answer, authoring, import, and personal-text controls. |
| `MULTISTEP` | States tagged `multistep`: market sizing, case modules, lessons, and prep planning. |
| `STATUS` | States tagged `status`: loading, validation, feedback, save, timeout, offline, and completion messages. |
| `TIMED` | States tagged `timed`: timed drill, benchmark, Exhibit Sprint, and Fit rehearsal states. |
| `USER-CONTENT` | States tagged `user-content`: imported prompts, authored packs, prep profile, and Fit story text. |

## WCAG 2.2 A/AA Criterion Ledger

Every row must be re-evaluated for the release candidate. `N/A` below is an applicability decision to verify, not a completed result.

| Criterion | Level | Name | Route/state scope | Applicability or N/A rationale | Automated method | Manual method | Evidence owner | Evidence | Date | Result | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `1.1.1` | A | Non-text Content | `ALL`, especially `CHART` | Applies to icons, status marks, install artwork, and chart/table alternatives. | Axe plus image/SVG accessible-name inventory. | Verify equivalent chart values and useful names with both AT matrices. | Content accessibility reviewer | TBD | TBD | Not run | Blocked |
| `1.2.1` | A | Audio-only and Video-only (Prerecorded) | `ALL` | N/A candidate: no prerecorded audio-only or video-only media is shipped. Recheck asset inventory. | Static media-element and asset scan. | Confirm no qualifying media in every route/process. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `1.2.2` | A | Captions (Prerecorded) | `ALL` | N/A candidate: no prerecorded synchronized media is shipped. | Static media-element and asset scan. | Confirm no qualifying media. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `1.2.3` | A | Audio Description or Media Alternative (Prerecorded) | `ALL` | N/A candidate: no prerecorded synchronized media is shipped. | Static media-element and asset scan. | Confirm no qualifying media. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `1.2.4` | AA | Captions (Live) | `ALL` | N/A candidate: Open Prep has no live media. | Network/runtime boundary and media-element scan. | Confirm no live media workflow. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `1.2.5` | AA | Audio Description (Prerecorded) | `ALL` | N/A candidate: no prerecorded video is shipped. | Static media-element and asset scan. | Confirm no qualifying video. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `1.3.1` | A | Info and Relationships | `ALL` | Applies to landmarks, headings, lists, forms, tables, progress, feedback, and grouped controls. | Axe and DOM relationship assertions. | Navigate structure and controls with both AT matrices. | Accessibility automation owner | TBD | TBD | Not run | Blocked |
| `1.3.2` | A | Meaningful Sequence | `ALL` | Applies to DOM/visual order and every multistep workflow. | DOM order and keyboard-order assertions. | Read each critical state linearly with both AT matrices. | Accessibility manual reviewer | TBD | TBD | Not run | Blocked |
| `1.3.3` | A | Sensory Characteristics | `ALL`, especially `CHART` and `FORM` | Applies to instructions, correct/incorrect state, chart legends, and control references. | Text/ARIA assertions and color-state checks. | Confirm instructions do not rely only on shape, location, sound, or color. | Content accessibility reviewer | TBD | TBD | Not run | Blocked |
| `1.3.4` | AA | Orientation | `ALL` | Applies; workflows must operate in portrait and landscape without an orientation lock. | Portrait/landscape viewport runs. | Rotate a supported mobile browser through critical states. | Geometry reviewer | TBD | TBD | Not run | Blocked |
| `1.3.5` | AA | Identify Input Purpose | `FORM` | N/A candidate: current forms do not collect inputs covered by the WCAG personal-data autocomplete taxonomy. Reassess when profile fields change. | Input type/autocomplete inventory. | Verify the N/A decision against every form. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `1.4.1` | A | Use of Color | `ALL`, especially `CHART` and `STATUS` | Applies to focus, validation, correct/incorrect, selection, progress, and charts. | Forced-color and state-marker assertions. | Confirm meaning remains without color in both themes and forced colors. | Visual accessibility reviewer | TBD | TBD | Not run | Blocked |
| `1.4.2` | A | Audio Control | `ALL` | N/A candidate: the app does not play audio. | Audio/media API scan. | Confirm no automatic audio. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `1.4.3` | AA | Contrast (Minimum) | `ALL` | Applies to all text and text-like controls in light/dark themes and state variants. | Contrast tests and axe. | Inspect forced colors and content not covered by computed checks. | Visual accessibility reviewer | TBD | TBD | Not run | Blocked |
| `1.4.4` | AA | Resize Text | `ALL` | Applies; text must resize to 200% without loss of content or function. | 200% zoom/reflow Playwright assertions. | Inspect every critical process at 200%. | Geometry reviewer | TBD | TBD | Not run | Blocked |
| `1.4.5` | AA | Images of Text | `ALL` | N/A candidate: workflow content uses live text rather than images of text. Recheck generated and imported examples. | Asset and rendered-image inventory. | Confirm no essential images of text. | Content accessibility reviewer | TBD | TBD | Not run | Blocked |
| `1.4.10` | AA | Reflow | `ALL` | Applies at 320 CSS px equivalent; data tables may use their permitted two-dimensional exception without hiding controls. | 320x568 and 200% overflow/loss assertions. | Inspect reading order, tables, charts, and sticky/fixed content. | Geometry reviewer | TBD | TBD | Not run | Blocked |
| `1.4.11` | AA | Non-text Contrast | `ALL`, especially `CHART`, `FORM`, and `STATUS` | Applies to controls, focus indicators, chart marks, selections, and validation boundaries. | Contrast and forced-color assertions. | Inspect all state and focus indicators. | Visual accessibility reviewer | TBD | TBD | Not run | Blocked |
| `1.4.12` | AA | Text Spacing | `ALL` | Applies to all visible text, imported text, buttons, fields, tables, and long translations. | WCAG text-spacing stylesheet with clipping/overlap assertions. | Inspect critical states after override. | Geometry reviewer | TBD | TBD | Not run | Blocked |
| `1.4.13` | AA | Content on Hover or Focus | `ALL` | Applies to tooltips, details, menus, and any hover/focus-disclosed content. | Keyboard/hover persistence and dismissal assertions. | Verify dismissible, hoverable, persistent behavior where present. | Accessibility manual reviewer | TBD | TBD | Not run | Blocked |
| `2.1.1` | A | Keyboard | `ALL` | Applies to every control and complete process. | Complete keyboard Playwright journeys. | Repeat critical journeys without a pointer in both AT matrices. | Keyboard journey owner | TBD | TBD | Not run | Blocked |
| `2.1.2` | A | No Keyboard Trap | `ALL`, especially `DIALOG` | Applies to navigation, details, file controls, confirmations, and active sessions. | Tab/Shift+Tab traversal and focus-return assertions. | Verify no trap with both AT matrices. | Keyboard journey owner | TBD | TBD | Not run | Blocked |
| `2.1.4` | A | Character Key Shortcuts | `ALL` | N/A candidate: no single-character keyboard shortcut handler is implemented. Recheck source and runtime. | Keyboard-handler source scan. | Confirm ordinary typing cannot trigger unrelated actions. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `2.2.1` | A | Timing Adjustable | `TIMED` | Applies to countdowns and content-imposed session limits. Timing accommodation evidence is required before release. | Fake-clock policy, expiry, and untimed tests. | Verify pre-start choices, active timer, warnings, and completion. | Timing accessibility owner | TBD | TBD | Not run | Blocked |
| `2.2.2` | A | Pause, Stop, Hide | `TIMED` | Applies to visible auto-updating timers unless a documented essential exception is valid. | Fake-clock and update-frequency assertions. | Confirm controls/alternatives and understandable announcements. | Timing accessibility owner | TBD | TBD | Not run | Blocked |
| `2.3.1` | A | Three Flashes or Below Threshold | `ALL` | Applies; no state transition or animation may flash above the threshold. | Animation/style inventory and reduced-motion run. | Inspect animated transitions and feedback. | Visual accessibility reviewer | TBD | TBD | Not run | Blocked |
| `2.4.1` | A | Bypass Blocks | `ALL` | Applies to the repeated app shell and navigation. | Skip-link focus-target assertion. | Verify skip behavior with keyboard and both AT matrices. | Keyboard journey owner | TBD | TBD | Not run | Blocked |
| `2.4.2` | A | Page Titled | `ALL` | Applies to every generated route and not-found behavior. | Route-title inventory assertion. | Confirm titles identify page purpose and dynamic content context. | Accessibility automation owner | TBD | TBD | Not run | Blocked |
| `2.4.3` | A | Focus Order | `ALL`, especially `MULTISTEP` and `DIALOG` | Applies to shell, workflows, validation, stage changes, and focus return. | Focus-sequence assertions. | Verify logical order and stage-change focus with both AT matrices. | Keyboard journey owner | TBD | TBD | Not run | Blocked |
| `2.4.4` | A | Link Purpose (In Context) | `ALL` | Applies to navigation, recommendations, resources, packs, and recovery links. | Accessible-name/link inventory. | Confirm repeated labels have sufficient context. | Content accessibility reviewer | TBD | TBD | Not run | Blocked |
| `2.4.5` | AA | Multiple Ways | `ALL` | Applies to generated pages; app navigation, dashboard, hub links, and direct URLs provide more than one route where required. | Route/navigation reachability assertions. | Verify pages are locatable without relying on one path. | Accessibility manual reviewer | TBD | TBD | Not run | Blocked |
| `2.4.6` | AA | Headings and Labels | `ALL` | Applies to every page, step, field, error, chart/table, and action. | Heading hierarchy and accessible-name assertions. | Verify labels describe topic or purpose in all release locales. | Content accessibility reviewer | TBD | TBD | Not run | Blocked |
| `2.4.7` | AA | Focus Visible | `ALL` | Applies to every keyboard-focusable element in all themes and forced colors. | Focus-visible screenshot/style assertions. | Tab through complete processes and inspect every focus indicator. | Visual accessibility reviewer | TBD | TBD | Not run | Blocked |
| `2.4.11` | AA | Focus Not Obscured (Minimum) | `ALL` | WCAG 2.2: applies to shell navigation, sticky/fixed content, dialogs, long pages, and narrow/zoomed layouts. | Focus bounding-box and viewport intersection assertions. | Verify focused controls are not entirely hidden at desktop, narrow width, and 200% zoom. | Geometry reviewer | TBD | TBD | Not run | Blocked |
| `2.5.1` | A | Pointer Gestures | `ALL` | N/A candidate: no multipoint or path-based gesture is required. Tables/charts use ordinary scrolling and controls. | Pointer-handler inventory. | Confirm no workflow depends on a complex gesture. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `2.5.2` | A | Pointer Cancellation | `ALL` | Applies to all pointer-operated controls. | Pointer down/up/cancel behavior checks for custom controls. | Verify activation occurs safely and can be aborted where required. | Interaction reviewer | TBD | TBD | Not run | Blocked |
| `2.5.3` | A | Label in Name | `ALL` | Applies to visible control and link labels, including icon-plus-text actions. | Accessible-name/visible-text assertions. | Voice-control style comparison of visible and accessible names. | Accessibility automation owner | TBD | TBD | Not run | Blocked |
| `2.5.4` | A | Motion Actuation | `ALL` | N/A candidate: no device-motion or user-motion input exists. | Sensor/event API source scan. | Confirm no motion-only control. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `2.5.7` | AA | Dragging Movements | `ALL`, especially authoring and questioning reorder controls | WCAG 2.2 N/A candidate: no drag-only interaction exists; reorder actions use discrete move controls. Recheck runtime. | Drag/drop and pointer-handler source scan; keyboard reorder tests. | Confirm every apparent reorder or movement has a single-pointer and keyboard alternative. | Interaction reviewer | TBD | TBD | Not run | Blocked |
| `2.5.8` | AA | Target Size (Minimum) | `ALL` | WCAG 2.2: applies to interactive targets; document spacing, equivalent-control, inline, or user-agent exceptions individually. | 24x24 CSS px target geometry/spacing assertions. | Inspect dense tables, tabs, choices, icon buttons, and narrow layouts. | Geometry reviewer | TBD | TBD | Not run | Blocked |
| `3.1.1` | A | Language of Page | `ALL` | Applies to every locale and not-found behavior. | Root `lang`/`dir` assertions across locales. | Verify AT pronunciation after locale changes and offline reload. | Localization accessibility reviewer | TBD | TBD | Not run | Blocked |
| `3.1.2` | AA | Language of Parts | `USER-CONTENT` and mixed-language states | Applies to authored/imported content with known language metadata and mixed interface/content language. | `lang`/`dir` DOM assertions for fixtures. | Verify pronunciation and direction with both AT matrices. | Localization accessibility reviewer | TBD | TBD | Not run | Blocked |
| `3.2.1` | A | On Focus | `ALL` | Applies; focus alone must not trigger an unexpected context change. | Focus traversal/navigation assertions. | Verify menus, details, fields, and links with both AT matrices. | Keyboard journey owner | TBD | TBD | Not run | Blocked |
| `3.2.2` | A | On Input | `FORM` | Applies to settings, answers, filters, builders, imports, and multistep choices. | Input/change assertions and URL/state checks. | Confirm context changes are expected or explained before input. | Interaction reviewer | TBD | TBD | Not run | Blocked |
| `3.2.3` | AA | Consistent Navigation | `ALL` | Applies to repeated app navigation and active-session exit navigation. | Cross-route nav order/name assertions. | Verify desktop/mobile and active-task variants are predictable. | Accessibility manual reviewer | TBD | TBD | Not run | Blocked |
| `3.2.4` | AA | Consistent Identification | `ALL` | Applies to repeated actions, statuses, destinations, and icon controls. | Accessible-name consistency inventory. | Verify equivalent controls are identified consistently. | Content accessibility reviewer | TBD | TBD | Not run | Blocked |
| `3.2.6` | A | Consistent Help | `ALL` | WCAG 2.2 N/A candidate: no repeated human-contact, self-help, or automated-contact mechanism is currently placed across pages. Ordinary resource links are not a repeated help mechanism. Reassess if help is added. | Help/contact mechanism inventory. | Confirm the N/A decision across generated routes. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `3.3.1` | A | Error Identification | `FORM` and `STATUS` | Applies to invalid answers, authoring, imports, storage failures, and incomplete multistep states. | Error-role, association, and focus assertions. | Verify errors are described in text with both AT matrices. | Form accessibility reviewer | TBD | TBD | Not run | Blocked |
| `3.3.2` | A | Labels or Instructions | `FORM` | Applies to every answer, setup, authoring, file, profile, story, and confirmation control. | Label/description and required-state assertions. | Verify instructions are available before input and remain understandable. | Form accessibility reviewer | TBD | TBD | Not run | Blocked |
| `3.3.3` | AA | Error Suggestion | `FORM` and `STATUS` | Applies where a correction can be identified safely. | Validation-message content assertions. | Confirm suggestions are specific and do not expose or invent private data. | Form accessibility reviewer | TBD | TBD | Not run | Blocked |
| `3.3.4` | AA | Error Prevention (Legal, Financial, Data) | `DATA-CHANGE` | Applies to replacing/removing locally stored packs and progress and to destructive reset. Export itself is non-destructive. | Preview, confirmation, atomic-failure, and recovery assertions. | Verify review/cancel/confirm and focus return for each data change. | Data safety reviewer | TBD | TBD | Not run | Blocked |
| `3.3.7` | A | Redundant Entry | `MULTISTEP`, `DATA-CHANGE` | WCAG 2.2: applies when information entered earlier in one process would otherwise be requested again; preserve or offer selection unless essential/security exceptions apply. | Complete-process state/value retention assertions. | Complete every multistep process and note repeated-entry requests. | Form accessibility reviewer | TBD | TBD | Not run | Blocked |
| `3.3.8` | AA | Accessible Authentication (Minimum) | `ALL` | WCAG 2.2 N/A: Open Prep has no accounts, authentication, CAPTCHA, or re-authentication by project constraint. Any future authentication would invalidate this rationale. | Network/auth dependency and route scan. | Confirm no authentication step in any complete process. | Accessibility lead | TBD | TBD | Not run | Blocked |
| `4.1.2` | A | Name, Role, Value | `ALL` | Applies to all native/custom controls, charts, tabs, details, progress, dialogs, and statuses. | Axe plus role/name/state assertions. | Operate controls with both AT matrices and verify changes are exposed. | Accessibility automation owner | TBD | TBD | Not run | Blocked |
| `4.1.3` | AA | Status Messages | `STATUS` | Applies to loading, validation, feedback, save, timeout, offline, install/import, and completion messages. | Live-region/status/alert assertions without focus movement. | Verify timely, non-repetitive announcements with both AT matrices. | Screen-reader reviewer | TBD | TBD | Not run | Blocked |

WCAG 2.2 removed obsolete criterion 4.1.1 Parsing, so it is not an A/AA target row in this WCAG 2.2 ledger.

## Generated Route And Complete-Process State Ledger

The state IDs, URLs, setup tokens, expected headings, phases, criterion tags, and exact profile assignment are authoritative in `src/tests/fixtures/accessibilityRouteStates.ts`. A grouped row is not `Ready` until every listed state has individual evidence for its assigned profile.

| Generated route | Required state IDs | Coverage profiles present | Evidence owner | Evidence | Date | Result | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `dashboard:first-run`, `dashboard:loading`, `dashboard:returning`, `dashboard:storage-error` | `critical`, `route`, `interactive` | Dashboard accessibility owner | TBD | TBD | Not run | Blocked |
| `/benchmark` | `benchmark:selection-empty`, `benchmark:selection-history`, `benchmark:selection-confirmation` | `critical`, `interactive` | Benchmark accessibility owner | TBD | TBD | Not run | Blocked |
| `/benchmark/session` | `benchmark:session-active`, `benchmark:session-validation-error`, `benchmark:session-timeout`, `benchmark:session-complete`, `benchmark:session-invalid` | `timed`, `critical` | Benchmark accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice` | `case-hub:default`, `case-hub:installed-pack`, `case-hub:pack-error` | `route`, `interactive`, `critical` | Case accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice/brainstorming` | `brainstorming:entry`, `brainstorming:validation-error`, `brainstorming:complete` | `interactive`, `critical` | Case accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice/fit` | `fit:story-entry`, `fit:story-validation-error`, `fit:rehearsal-active`, `fit:rehearsal-timeout`, `fit:self-review-complete`, `fit:save-error` | `critical`, `timed` | Fit/privacy accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice/lessons` | `lessons:entry`, `lessons:answer-feedback`, `lessons:complete`, `lessons:load-error` | `interactive`, `critical` | Case accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice/plan` | `prep-plan:entry`, `prep-plan:active`, `prep-plan:complete`, `prep-plan:error` | `critical`, `interactive` | Plan accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice/questioning` | `questioning:entry`, `questioning:validation-error`, `questioning:complete` | `critical` | Case accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice/simulation` | `full-case:questioning`, `full-case:structure`, `full-case:calculation`, `full-case:brainstorming`, `full-case:synthesis`, `full-case:validation-error`, `full-case:complete`, `full-case:save-error` | `critical`, `visual` | Full-case accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice/structuring` | `structuring:entry`, `structuring:validation-error`, `structuring:complete` | `critical` | Case accessibility owner | TBD | TBD | Not run | Blocked |
| `/case-practice/synthesis` | `synthesis:entry`, `synthesis:validation-error`, `synthesis:complete`, `synthesis:load-error` | `critical` | Case accessibility owner | TBD | TBD | Not run | Blocked |
| `/content-packs` | `content-packs:discover-empty`, `content-packs:discover-offline`, `content-packs:installed-empty`, `content-packs:installed-list`, `content-packs:remove-confirmation`, `content-packs:remove-complete`, `content-packs:remove-error`, `content-packs:import-entry`, `content-packs:import-invalid`, `content-packs:import-review`, `content-packs:import-conflict`, `content-packs:import-complete`, `content-packs:import-error`, `content-packs:create-entry`, `content-packs:create-dirty`, `content-packs:create-validation-error`, `content-packs:create-complete`, `content-packs:resources` | `critical`, `interactive`, `route` | Content-pack accessibility owner | TBD | TBD | Not run | Blocked |
| `/content-packs/downloads` | `content-pack-downloads:default`, `content-pack-downloads:optional-expanded` | `route`, `interactive` | Authoring accessibility owner | TBD | TBD | Not run | Blocked |
| `/drills` | `drill:setup-default`, `drill:setup-validation-error` | `critical` | Drill accessibility owner | TBD | TBD | Not run | Blocked |
| `/drills/session` | `drill:session-loading`, `drill:session-active`, `drill:session-validation-error`, `drill:session-feedback`, `drill:session-timeout`, `drill:session-offline` | `route`, `critical`, `timed` | Drill accessibility owner | TBD | TBD | Not run | Blocked |
| `/drills/summary` | `drill:summary-complete`, `drill:summary-empty`, `drill:summary-load-error` | `critical`, `interactive` | Drill accessibility owner | TBD | TBD | Not run | Blocked |
| `/exhibits` | `exhibit:active`, `exhibit:validation-error`, `exhibit:feedback`, `exhibit:save-error`, `exhibit:complete` | `visual` | Exhibit accessibility owner | TBD | TBD | Not run | Blocked |
| `/exhibits/sprint` | `exhibit-sprint:setup`, `exhibit-sprint:active`, `exhibit-sprint:timeout-feedback`, `exhibit-sprint:complete` | `visual`, `timed` | Exhibit accessibility owner | TBD | TBD | Not run | Blocked |
| `/formulas` | `formulas:library`, `formulas:filtered-detail` | `route`, `interactive` | Formula accessibility owner | TBD | TBD | Not run | Blocked |
| `/privacy` | `privacy:disclosure` | `route` | Privacy accessibility owner | TBD | TBD | Not run | Blocked |
| `/market-sizing` | `market-sizing:assumptions`, `market-sizing:calculation`, `market-sizing:final-answer`, `market-sizing:sense-check`, `market-sizing:validation-error`, `market-sizing:complete`, `market-sizing:save-error` | `critical` | Market-sizing accessibility owner | TBD | TBD | Not run | Blocked |
| `/progress` | `progress:empty`, `progress:populated`, `progress:load-error` | `critical`, `interactive` | Progress accessibility owner | TBD | TBD | Not run | Blocked |
| `/settings` | `settings:default`, `settings:local-data-expanded`, `settings:export-entry`, `settings:export-complete`, `settings:export-error`, `settings:import-entry`, `settings:import-invalid`, `settings:import-confirmation`, `settings:import-complete`, `settings:import-error`, `settings:reset-entry`, `settings:reset-confirmation`, `settings:reset-complete`, `settings:reset-error` | `critical` | Settings/data accessibility owner | TBD | TBD | Not run | Blocked |
| Not found (`*`) | `not-found:unknown-route` | `critical` | Shell accessibility owner | TBD | TBD | Not run | Blocked |

The static route inventory covers every `src/app/**/page.tsx` file plus the app-level not-found state. Adding, removing, or moving a page must fail the unit gate until this ledger and the TypeScript manifest are updated together.

## Manual Assistive-Technology Records

Record actual version numbers; `latest`, `current`, and empty version fields are not acceptable release evidence. Attach issue, trace, screenshot, or dated checklist paths in Evidence. Personal learner text must not appear in evidence artifacts.

| Matrix | OS and version | Browser and version | AT and version | Route/state IDs tested | Keyboard/focus | Landmarks/headings/names | Instructions/errors/status/timers | Tables/charts | Focus recovery | Known limitations | Evidence | Reviewer | Date | Result | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NVDA reference | Windows: TBD | Chrome: TBD | NVDA: TBD | TBD | Not run | Not run | Not run | Not run | Not run | Human listening and interaction review required. | TBD | TBD | TBD | Not run | Blocked |
| VoiceOver reference | macOS: TBD | Safari: TBD | VoiceOver: TBD | TBD | Not run | Not run | Not run | Not run | Not run | TBD | TBD | TBD | TBD | Not run | Blocked |

## Exception Register

Broad rule suppression is prohibited. `None` means no exception is approved, not that a failing rule may be ignored.

| Criterion | Route/state | Exact exception and reason | Manual evidence | Owner | Review or expiry condition | Date approved | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| None | None | No accessibility exceptions are approved. | N/A | Accessibility lead | Re-evaluate for every release candidate. | TBD | Blocked |

## Release Sign-off

| Required field | Value | Owner | Date | Status |
| --- | --- | --- | --- | --- |
| Release candidate/version | TBD | Release manager | TBD | Blocked |
| Source revision | TBD | Release manager | TBD | Blocked |
| Built artifact/provenance ID | TBD | Release manager | TBD | Blocked |
| Automated axe/semantic evidence | TBD | Accessibility automation owner | TBD | Blocked |
| Keyboard complete-process evidence | TBD | Keyboard journey owner | TBD | Blocked |
| Geometry/theme/preference evidence | TBD | Geometry and visual reviewers | TBD | Blocked |
| NVDA/Chrome/Windows record | TBD | Screen-reader reviewer | TBD | Blocked |
| VoiceOver/Safari/macOS record | TBD | Screen-reader reviewer | TBD | Blocked |
| Criterion-specific N/A approvals | TBD | Accessibility lead | TBD | Blocked |
| Known limitations and remediation links | TBD | Accessibility lead | TBD | Blocked |
| Accessibility release decision | Blocked - evidence not run | Accessibility lead | TBD | Blocked |
| Final release approval | Not approved | Release manager | TBD | Blocked |
