# Usage and Authoring UX Audit

Date: 2026-09-21

## Remediation Update: 2026-09-21

The six "Fix First" findings below have independent implementation commits on `codex/usage-audit-fixes`. The original observations remain unchanged as historical evidence. The [repair plan and verification ledger](USAGE_FIXES_DEVELOPMENT_PLAN.md) records current check outcomes, follow-ups, and manual gates; these commits are not a production deployment or release approval.

| Finding | Repair | Implementation commit |
| --- | --- | --- |
| UX-01 | Invalidate only the originating draft's stale preview/review; protect installation snapshots | `909589e` |
| UX-06 | Confirm dirty discard/nonempty removal; preserve cancelled work and recover focus | `23b1fa1` |
| UX-02 | Wrap translated header controls and preserve a usable language-selector width | `65c55af` |
| UX-03 | Use accessible starter-label contrast and cover Create in axe checks | `b0cfac2` |
| UX-04 | Reflow download columns, text and actions without removing resources | `7fe9d0c`, with translated labels in `d05e834` |
| UX-05 | Fit pies/scatterplots to their containers while retaining full data alternatives | `7ae4298` |

The repeated eight-window route audit recorded 282 layouts and 108 axe scans, with no overflow/axe findings or uncaught Chromium page errors. Firefox and WebKit both completed this repeat; the original Firefox startup error was confined to the restricted test environment. Additional regression tests verify exported JSON, cancelled authoring actions, all ten header locales, enlarged text/spacing, all 30 resource destinations, and plotted-mark visibility. Final local suites passed 1,275 unit tests, 267 Chromium cases, and 160 cross-browser cases with normal exits. Application revision `d05e834` passed the complete GitHub workflow. Later test-only correction `6d1c051` passed the complete project check, but its first cross-browser attempt had one Firefox exhibit-save timeout; an unchanged rerun is pending. The repair plan retains failed attempts separately from passing reruns and does not claim final-HEAD CI sign-off.

Remaining scope: the broader authoring-page simplification and successful-preview announcement are not included in this repair batch. NVDA, VoiceOver/Safari, real phones, and hosted-origin validation remain unperformed. Visual inspection also noted a pre-existing 320-pixel chart-header polish issue: side-by-side row/series statistics can compress long headings into awkward mid-word wrapping. Stack those statistics under the title in a later focused chart-header refinement. Dense axis-based exhibits still use deliberate horizontal inspection scrolling; this batch does not replace that behavior with universal chart shrinking.

## Original Audit

Scope: Open Prep's local production build, responsive layouts, accessibility, keyboard workflows, content-pack creation/downloads, local-data safety, and browser compatibility. This is an audit, not a repair or release approval.

Baseline: commit `0c924842b2d929f994ceaece05cbe9aa806adccf`, with the dependency changes already present in the workspace. Those changes were not modified. Node 24.19.0 and the installed Playwright 1.63.0 were used. The finalized static output passed the repository's release-output verification. No application code, dependencies, learner data, or hosted deployment was changed by this audit.

While the audit was running, separate work committed the dependency refresh as `d51c9e1`. The audited artifact's source marker still identifies the baseline above. This report does not claim testing of a newly rebuilt artifact from that later commit.

## Executive Assessment

Core practice workflows held up well in the checks performed. The principal product defects found are in authoring state management and less-common responsive/accessibility states. There is no evidence from this audit of a general scoring or storage failure, but this was not an exhaustive scoring-engine review.

Repair the stale authoring preview first. Then fix the mobile header collision, text contrast, and enlarged-text download layout. Improve mobile chart framing and draft recovery before simplifying the authoring information architecture. Separately repair the browser-test environment so these changes can receive reliable cross-browser sign-off.

## Coverage and Results

| Area | Work performed | Result |
| --- | --- | --- |
| Production artifact | Verified finalized static output | Passed |
| Existing Chromium workflow/accessibility tests | 98 test cases: navigation, keyboard, axe, preferences, packs, offline practice, sizing, benchmarks, and full-case completion | All 98 printed passing results; the runner did not exit during cleanup and was interrupted. Not a clean suite exit. |
| Additional existing Chromium safety tests | Pack installation; personal-data/all-data clearing across tabs; unsaved-draft Back, Forward, and link navigation | Six passing test results |
| Responsive sweep | 29 URLs at 320x568, 390x844, 640x900, 768x1024, 1024x768, 1440x900, 1920x1080, and 844x390 | No document overflow in the 232 normal-size route/viewport combinations |
| Expanded/preference states | Expanded forms/download sections; 200% root text size plus increased text spacing; dark mode; German and Arabic/RTL | Findings below; no general route crash |
| Broader automated accessibility | 103 axe scans in the main matrix; two normal-browser pack-page confirmations; eight additional exhibit-type scans | Create-page contrast failure; no tagged A/AA axe violations in the eight exhibit scans |
| WebKit | Five mobile route inspections; pack import/install/practice; cross-window personal-data clearing | Pack flow passed. Data-clearing test exceeded 30 seconds once, then passed in 28.4 seconds on an isolated 60-second-budget rerun. |
| Firefox | Standalone context and existing smoke tests | Blocked before page creation by a Playwright error; not an application failure |
| Downloads | All 30 human/optional download URLs; native browser download of starter; import of downloaded file | All 30 returned nonempty HTTP 200 responses; downloaded starter reached valid preview |
| Authoring integrity | Create, preview, edit, download, duplicate, remove, discard | Stale preview/export and unrecoverable destructive actions confirmed |
| Exhibits | Table, bar, line, pie, waterfall, scatterplot, stacked bar, and index chart; representative dark chart and keyboard interaction | Meaningful mobile-framing weakness; text alternatives present; keyboard chart navigation responded |

The main matrix contains 277 recorded layout states. No uncaught page errors were recorded in its Chromium route/preference sweep. Assertions and screenshots are complementary: passing axe or document-width checks alone does not prove usability or accessibility.

### Evidence

Reproduction scripts, machine-readable observations, and screenshots are retained locally in the ignored directory `.dist-verification/usage-audit-2026-09-21/`:

- `audit.mjs` / `results.json`: full layout/preference matrix.
- `followup.mjs` / `followup.json`: normal-browser pack metrics, download checks, builder interactions, and chart screenshots.
- `confirm.mjs` / `confirm.json`: stale export, approved-preview persistence, all exhibit-type axe checks, and controlled header-error reproduction.
- `download-overflow.png`, `header-update-failed.png`, `stale-preview-after-discard.png`, `packs-downloads-1440.png`, and `confirmed-exhibit-*.png`: focused visual evidence.

The broad Chromium matrix disabled service workers to isolate layout; its update-failure indicators are test conditions, not evidence of a production outage. Pack geometry, contrast, downloads, and enlarged-text overflow were confirmed again with service workers enabled. The header finding was then reproduced explicitly using the app's service-worker status event. Browser contexts used only synthetic audit data.

## Ranked Product Findings

### 1. P1: An edited or discarded draft can still export/install an approved old preview

**Confirmed functional defect.** In Create, build a valid question with answer `50`, preview it, and check the review confirmation. Change the editor's answer to `60`, then select `Download .mathdrill.json` in the preview. The downloaded answer remains `50`. The review checkbox stays checked and Install remains enabled. Discarding changes clears the editor but also leaves the old approved preview ready to install.

The two builders own independent draft state, while `QuestionPackManager` retains a separate `pendingPack` snapshot. Draft edits/discards do not invalidate that snapshot or its review approval. Even when snapshots are intentional, the current interface does not distinguish an outdated preview from the current draft. Authors can share an unintended answer key.

**Sources:** `src/features/question-packs/QuestionPackManager.tsx:355`, `src/features/question-packs/QuestionPackManager.tsx:467`, `src/features/question-packs/QuestionPackBuilder.tsx:133`, `src/features/question-packs/QuestioningPackBuilder.tsx:131`.

**Repair:** Invalidate the originating builder's preview and approval on any edit, reorder, removal, or discard; disable install/export until revalidation, or explicitly mark and enforce a stale snapshot. Keep file-import preview behavior independent.

**Acceptance:** Preview 50, edit to 60, and prove that exporting/installing 50 is impossible through an apparently current preview. Re-preview exports 60 and requires fresh review. Discard removes the matching preview. Cover both builders, question reordering/removal, failed revalidation, and switching builders.

### 2. P2: The German update-failure badge overlaps the mobile language selector

**Confirmed responsive defect.** At 320 pixels, select German and display `update-failed`. The language selector shrinks to 26 pixels wide; the status badge overlaps it by 18 pixels. The selected language is unreadable and the control is partly obstructed. Document width still passes, so the existing no-overflow check misses it.

**Sources:** `src/components/LocalizedAppShell.tsx:44`, `src/features/i18n/I18nProvider.tsx:191`, `src/features/offline/OfflineStatusIndicator.tsx:109`.

**Repair:** Allow the header controls to wrap or stack at narrow widths. Give the language control a usable minimum width; allow translated status and Retry content to wrap without overlapping it.

**Acceptance:** At 320 and 390 pixels, all locales and all connection/update states preserve readable language selection, nonoverlapping controls, and keyboard/touch access. Check rectangle intersections, not only document width.

### 3. P2: Create-page technical labels fail minimum text contrast

**Confirmed accessibility defect.** Axe flagged 25 starter-subtype labels in light mode. The 12-pixel text is rendered approximately `#797a79` on white, giving 4.3:1 instead of the 4.5:1 minimum for normal text. Chromium and WebKit reproduced it. [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).

**Source:** `src/features/question-packs/ContentPackStarterLibrary.tsx:328` (`text-ink/60`).

**Repair:** Use a verified accessible text token. Moving schema identifiers into an advanced section improves clarity but does not remove their contrast requirement when displayed.

**Acceptance:** Axe reports no contrast failures in every Content Packs view, collapsed/expanded, light/dark, at mobile and desktop sizes. Add Create explicitly to the entry-state coverage.

### 4. P2: Enlarged text makes download buttons escape their cards and viewport

**Confirmed layout defect under a combined accessibility stress setting.** At 640x900, set root text size to 200%, line height to 1.5, letter spacing to 0.12em, word spacing to 0.16em, and paragraph spacing to 2em. The two-column downloads grid remains in place. `Download Questioning example` becomes wider than its card, and the document overflows by 11 pixels. Neighboring long buttons also cross their card borders.

**Sources:** `src/features/question-packs/ContentPackDownloadsView.tsx:123`, `src/features/question-packs/ContentPackDownloadsView.tsx:137`.

**Repair:** Let the grid collapse according to available content width, constrain controls to their container, and use a short visible `Download` command with a descriptive accessible name. Preserve readable text instead of clipping it. This audit combined text resizing and spacing; test each independently as well before making a formal conformance claim. [Text-spacing guidance](https://www.w3.org/WAI/WCAG22/Understanding/text-spacing.html), [reflow guidance](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html).

**Acceptance:** No button/card escape or document overflow with enlarged text, increased spacing, and their combination. Check both default and optional download sections and translated labels.

### 5. P2: Several mobile charts initially hide the information needed to understand them

**Confirmed usability defect, not an asserted WCAG failure.** At 390 pixels, the chart viewport is 322 pixels wide but the canvas is always 720 pixels wide. The insurance pie initially shows only an edge of the circle; the regional-productivity scatterplot initially shows axes with no data points. The sideways-scroll message is also inaccurate for pie charts because it refers to axis labels.

The horizontal scrolling is deliberate, and the complete text-value alternatives are a strength. However, the initial visual state is particularly poor for a tool intended to practise recognizing chart relationships. Keyboard interaction responded, so this is not being reported as a keyboard trap.

**Source:** `src/features/exhibits/ExhibitChartRenderer.tsx:35`, `src/features/exhibits/ExhibitChartRenderer.tsx:67`.

**Repair:** Fit pies and small scatterplots to the available width, and consider an explicit Fit/Inspect choice for denser axis-based charts. Preserve legible labels and full-size inspection where needed. Do not apply a universal tiny scale transform to every chart.

**Acceptance:** Every chart type opens with meaningful data visible at 320/390 pixels, including the full pie and the plotted scatter points. Keep accessible values, dark/forced-color treatment, touch scrolling where necessary, and keyboard operation.

### 6. P2: Draft deletion has no confirmation or recovery

**Confirmed data-loss usability risk.** `Discard changes` immediately resets the entire numeric draft, with no confirmation or Undo. Removing a question also deletes it immediately. The questioning builder uses the same direct-reset pattern. Existing navigation guards protect leaving the page, but not these actions inside it.

**Sources:** `src/features/question-packs/QuestionPackBuilder.tsx:92`, `src/features/question-packs/QuestionPackBuilder.tsx:133`, `src/features/question-packs/QuestioningPackBuilder.tsx:131`.

**Repair:** Confirm discarding nonempty work, or provide an accessible Undo. Local draft persistence is a useful later enhancement, but a small confirmation/Undo fix need not wait for it.

**Acceptance:** Cancel preserves every field and focus returns correctly. Confirm deletes only the intended draft/question. An Undo, if offered, restores ordering and all content. Also exercise this alongside preview invalidation.

### 7. P3: Successful preview has no explicit focus or status announcement

**Code-backed accessibility risk requiring assistive-technology confirmation.** After Preview Pack, focus remains on that button. The new ready-preview container is an ordinary `div`, its ready label is a paragraph, and `QuestionPackImportNotice` returns no notice for `ready`. A screen-reader user may receive no concise confirmation that validation succeeded or where to review the result.

**Sources:** `src/features/question-packs/QuestionPackManager.tsx:390`, `src/features/question-packs/QuestionPackManager.tsx:706`.

**Repair:** Announce a short successful-validation status or deliberately move focus to a labeled preview heading. Avoid placing the entire potentially large JSON/content preview in a live region.

**Acceptance:** Keyboard focus order is predictable, and NVDA plus VoiceOver announce successful validation and offer a clear route into the preview. This audit did not run either screen reader.

## Test Infrastructure Findings

### Restore dependable browser-test completion before release sign-off

- Firefox failed before any application page opened with `browserContext.newPage: Cannot read properties of undefined (reading '_page')`. The same error occurred in the standalone audit and both Firefox smoke attempts. Check the installed Playwright/browser pairing and a minimal empty-page launch before diagnosing website behavior. Firefox compatibility remains unverified here.
- The 98-case run, the additional safety run, and the isolated WebKit rerun printed their case outcomes but did not terminate normally during cleanup. Each was interrupted after waiting. This resembles the previously addressed cleanup problem, but its cause was not established; do not claim a fresh regression in application code. Inspect runner/browser/server teardown and preserve a bounded global timeout.
- The WebKit multi-tab personal-data-clearing case timed out once at the local 30-second budget. An isolated rerun with a 60-second budget passed in 28.4 seconds. The observed evidence supports a timing/test-stability concern, not a confirmed privacy leak. Profile the slow steps before simply extending every timeout.
- Existing route axe coverage includes Discover and Downloads but not Create; enlarged-text coverage only exercises Drills. Add the newly failing states to routine regression coverage. See `src/tests/e2e/accessibility.spec.ts:12`, `src/tests/e2e/accessibility-preferences.spec.ts:23`, and `playwright.config.ts:19`.

## Content-Pack Simplification Proposal

### Observed Friction

The current pages expose working capabilities but ask users to understand too much of the file format before starting:

| Measurement | 320-pixel width | 1440-pixel width |
| --- | ---: | ---: |
| Create page height, builders closed | 7,148 px | 3,585 px |
| Downloads page height, optional tools closed | 6,456 px | 2,839 px |
| First actual download link on Downloads | 2,599 px below document top | 1,343 px below document top |

Create exposes 29 download links, with several subtype choices downloading the same cookbook/example. Downloads exposes 16 files initially and 14 more behind Optional tools. Before its first file, it displays a large heading panel, seven instructional steps, another navigation group, and warnings. At 390 pixels, the first numeric builder is only beginning to appear near the bottom of the initial 900-pixel screenshot.

### Recommended User Journey

**Choose a practice type -> Build or download a starter -> Preview and review -> Install or export.**

1. **Make Create the primary authoring workspace.** Present a compact heading and a labeled practice-type selector: Math, Exhibits, Market sizing, Benchmark, and Case/behavioral. Show only the relevant subtype choices after selection.
2. **Offer one obvious next action for each type.** Fixed numeric and questioning exercises can open their existing builder. Other types offer one recommended editable starter plus one optional worked example. Be explicit about which types still require editing a JSON file.
3. **Keep an All downloads reference view.** Use a filterable list with file purpose, format, and a short Download control. Put filenames and schema versions in secondary details. Preserve all current assets and deep links.
4. **Move the seven-step guide out of the way.** Offer a collapsed Authoring checklist near the work area. Keep critical rights/privacy and human-review requirements at the action where they matter, especially install/export and optional external-tool handoff. Do not remove these safeguards.
5. **Unify duplicated destinations.** Make Resources the help/reference area and Downloads its focused file index. Avoid making users bounce between Create, Resources, a separate explanatory downloads page, and Import just to understand the starting point.
6. **Reduce jargon in the primary view.** Show names such as Bar chart and Clarifying questions first. Reveal identifiers such as `questioningPrompts:clarifying`, schema versions, and canonical validation terminology only when needed. The questioning builder still requires concept/intent JSON editing; label that advanced requirement honestly.
7. **Make authoring state explicit.** Distinguish Editing, Needs validation, Ready for review, and Ready to export. Add one consistent place for validation errors and a current preview. A question outline and collapsed noncurrent questions would make larger packs easier to edit.
8. **Preserve local-only operation.** Draft recovery, filtering, validation, and export can all remain local and deterministic. This proposal does not require accounts, a backend, telemetry, or AI runtime features.

### Acceptance Targets for the Redesign

- At 390x844 and 1440x900, a first-time author can identify a practice type and reach the primary builder/starter action in the first viewport, without reading the full guide.
- Downloading the appropriate starter takes at most two deliberate choices after opening Create.
- Every existing asset remains discoverable; no content, schema capability, offline behavior, or safety review is removed.
- Nontechnical authors can explain the difference between a starter and an example without understanding v2/v3 or internal field names.
- Large-text, long-translation, RTL, keyboard, and screen-reader checks cover both the choice screen and the full authoring flow.
- Validate the proposal with students, experienced candidates, and a coach/pack author. These are proposed targets, not usability-test results from real participants.

## Other Useful Optimizations

- Reduce the large introductory panels on repeated-use practice and authoring screens; prioritize the prompt, chart, or next action in short windows. The present design often uses much of the first mobile screen for headings and supporting copy.
- Complete high-frequency navigation/workflow translations before calling the experience fully localized. Arabic/RTL rendered without overflow in this audit, but Create/Discover/Installed/Resources and several introductory phrases remained English. Treat this as completion work, not a failure of the existing fallback mechanism.
- Expand touch-target assessment beyond Drills, especially text links in the starter library. Small link height alone is not sufficient to assert a WCAG failure because spacing and inline exceptions matter.
- Keep the existing exact text-value alternatives for exhibits, keyboard confirmation behavior, local backup workflow, and explicit review acknowledgement. These are useful strengths to preserve during simplification.

## Suggested Repair Sequence

1. Fix stale previews and irreversible draft actions together; add state-integrity regression tests.
2. Independently fix the header overlap, starter contrast, and download reflow; add focused responsive/a11y tests.
3. Improve pie/scatter mobile framing and verify all eight exhibit types.
4. Simplify authoring navigation and file presentation without removing formats or safeguards.
5. Close preview-announcement and high-frequency translation gaps.
6. Resolve test-runner/Firefox setup issues, rerun the combined matrix, then complete real-device and screen-reader validation.

The small visual fixes can be developed independently of authoring state work. The broader authoring redesign should follow the state-integrity fixes, since it touches the same controls and preview lifecycle.

## Limits

This was a local-production-build audit on Windows. WebKit automation is not Safari on a real Mac or iPhone; viewport emulation does not reproduce an on-screen keyboard, OS text scaling, touch hardware, or PWA installation behavior. NVDA, VoiceOver, real iOS/Android devices, branded browser manual review, and the live HTTPS deployment were not tested. No claim of complete WCAG conformance or release readiness is made. Application fixes, commits, pushes, and deployments were intentionally not performed.
