# Usage Audit Fixes Development Plan

Created: 2026-09-21

Status: All six fixes and follow-up corrections pushed. Application revision `d05e834` passes the complete GitHub workflow, including cross-browser smoke. Later commit `6d1c051` changes only a header test's readiness wait and the ledger; it passes GitHub's complete project check and both local browser suites (267 Chromium and 160 cross-browser cases). Its first GitHub cross-browser attempt failed one Firefox exhibit-save timeout; an unchanged rerun is pending. Final-HEAD CI and native screen-reader/real-device assessments are not signed off.

Execution baseline: `7a99e5c` on `main`, which includes the reviewed dependency refresh (PR #17). Repair branch: `codex/usage-audit-fixes`. The audit-time Firefox page-creation failure is reproducible inside the restricted sandbox but absent outside it: Chromium 153, Firefox 155, and WebKit 26.6 all passed a fresh page-creation/close preflight with normal process exit. Browser verification will use the unrestricted test environment; no dependency or test-assertion workaround is required.

Source: [Usage and authoring UX audit](USAGE_AUDIT_2026-09-21.md).

## Objective and Scope

Implement the six findings summarized under "Fix First" in the usage audit. Prioritize correct exported content, protection of author work, accessibility, and usable mobile layouts. Preserve existing content, scoring, performance budgets, static deployment, local storage, offline practice, and all supported pack formats.

Do not add dependencies, server services, accounts, AI runtime features, external APIs, or learner-data transmission. Reuse existing components, native browser behavior, deterministic validation, and Recharts. Keep test fixtures synthetic and repository documentation free of personal workstation paths.

This plan does not include the broader pack-page redesign, general translation completion, or the separate preview-announcement recommendation. Translate any strings introduced by these six fixes, and keep focus behavior accessible. Broader improvements remain follow-up work rather than prerequisites that enlarge this repair batch.

## Finding IDs and Delivery Order

IDs match the six items in the user-facing audit summary. Delivery order puts both authoring fixes together because they share files and lifecycle behavior.

| Order | Phase | Finding | Priority | Dependency | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | 0 | Establish a reproducible verification and GitHub baseline | Delivery prerequisite | None | Complete |
| 2 | 1 | UX-01: Stale previews can export/install older draft content | P1 | Phase 0 | Pushed; application CI passed |
| 3 | 2 | UX-06: Discard/remove actions have no confirmation or recovery | P2 | Phase 1 | Pushed; CI passed |
| 4 | 3 | UX-02: German update-failure status overlaps mobile language selection | P2 | Phase 0 | Pushed; application CI passed |
| 5 | 4 | UX-03: Starter labels have insufficient text contrast | P2 | Phase 0 | Pushed; application CI passed |
| 6 | 5 | UX-04: Enlarged download buttons escape their cards/viewport | P2 | Phase 0 | Pushed; application CI passed |
| 7 | 6 | UX-05: Mobile pie/scatter framing initially hides meaningful data | P2 | Phase 0 | Pushed; application CI passed |
| 8 | 7 | Integrated verification and final GitHub evidence | Completion gate | Phases 1-6 | In progress |

## Execution Rules

1. Execute each phase by its slices. Reproduce the failure in a regression test before implementing the repair, then verify the corrected behavior.
2. Keep one completed fix per implementation commit/push. A phase's test and implementation slices may be committed together once green; do not push deliberately failing tests as a finished fix.
3. Update slice checkboxes and the evidence ledger as work progresses. Distinguish implemented, locally verified, pushed, and CI-verified states. A printed passing test list followed by a hung runner is not a successful command.
4. Review the complete staged diff before each push. Include only the relevant fix, its tests, intentional snapshots/translations, and documentation. Never stage unrelated work indiscriminately.
5. Serialize edits to shared files and all build/install/Git operations. Do not allow another build to remove the artifact being tested. Use an isolated checkout/output when concurrent work exists.
6. Do not bypass required checks, reduce assertions, disable accessibility rules, raise performance limits, or accept screenshots without visual inspection to obtain a pass.
7. Preserve local privacy: do not commit ignored audit output, browser profiles, local databases, credentials, absolute personal paths, or generated release artifacts. A small, deliberately reviewed synthetic screenshot can be committed as a regression baseline when appropriate.

## Phase 0: Baseline and Delivery Readiness

**Goal:** Make every subsequent repair reproducible and independently publishable. Audit-time tooling failures must not be mistaken for website defects or clean verification.

### 0A. Confirm source and working-tree ownership

- [x] Inspect the current branch, working tree, remotes, and upstream commits; preserve unrelated work.
- [x] Reconcile the audit artifact's baseline (`0c92484` plus dependency edits) with the dependency-refresh commit observed at planning (`d51c9e1`). Rebuild; do not test a stale audit artifact.
- [x] Fetch and inspect the approved integration base. Use a dedicated `codex/usage-audit-fixes` branch, or a clearly named equivalent if it already exists. Do not silently include unmerged, unrelated branch changes.
- [x] Confirm GitHub authentication and that `origin` is the intended Open Prep repository before publishing.

### 0B. Verify the supported toolchain

- [x] Use the repository-pinned Node 24.19.0 and npm 11.17.0 toolchain; confirm the installed dependency versions against the lockfile.
- [x] Verify matching Playwright browser installations and minimal Chromium, Firefox, and WebKit page creation independently of the app.
- [x] Reproduce or clear the Firefox `_page` startup error without assuming that the app caused it. Do not upgrade unrelated dependencies as an incidental repair.

### 0C. Establish reliable test completion

- [x] Run a small existing browser suite and require normal runner/browser/server shutdown.
- [x] Recheck cleanup: the final full Chromium and cross-browser runners, browsers, and test servers exit normally. No teardown correction was needed.
- [x] Recheck the slow WebKit cross-window reset test: it passes in the complete cross-browser run within the existing limit; no privacy assertions or global timeouts were changed.
- [x] Preserve bounded execution limits and failing-run evidence. Unavailable manual/platform checks remain explicitly pending.

### 0D. Freeze useful baselines

- [x] Build and verify a fresh production export in an isolated location with known source identity.
- [x] Record current lint/typecheck/unit/build results and affected browser tests, distinguishing unrelated baseline failures.
- [x] Capture reproducible failing cases for all six findings, including the exact viewport/preferences and representative pack/chart data.

### 0E. Publish the development record

- [x] Review and commit the audit, this plan, and the active-plan link, excluding ignored evidence files.
- [x] Push the planning checkpoint to the development branch; record its remote identity and CI outcome.

**Exit:** Source/toolchain/build identity is known; targeted browser checks terminate normally; the repair branch and planning record are available on GitHub. Independent code work may proceed while a tooling issue is investigated, but affected verification gates remain open.

## Phase 1: Current-Draft Preview Integrity (UX-01)

**Goal:** Installation and export can only use the reviewed content represented by the current authoring draft.

**Primary ownership:** `QuestionPackManager.tsx`, `QuestionPackBuilder.tsx`, `QuestioningPackBuilder.tsx`, and their existing unit/component tests.

### 1A. Specify the preview lifecycle

- [x] Trace numeric-builder, questioning-builder, file-import, and catalog preview paths and every install/download action.
- [x] Define which draft owns a preview and when its review acknowledgement expires.
- [x] Choose the smallest existing-pattern implementation. Prefer invalidating the originating preview on edits over adding a generalized draft framework.

### 1B. Add failing state-integrity tests

- [x] Preview an answer of 50, approve review, edit it to 60, and assert the obsolete payload is no longer exportable/installable as current.
- [x] Complete extended metadata/intent mutation coverage. Tests cover title/answer/ID/version/language/theme changes, duplicate/add/remove/reorder, discard, invalid concept JSON, builder ownership, file-import ownership, and approval reset.
- [x] Cover two builders on the same page: a new preview replaces its predecessor and an unrelated builder cannot mistakenly clear or approve another preview.
- [x] Preserve file-import/catalog confirmation and installed-pack replacement semantics.

### 1C. Implement invalidation and approval reset

- [x] Clear or disable the originating draft's obsolete preview immediately after a content mutation.
- [x] Require validation and fresh review for the new payload before installation; do not retain stale approval.
- [x] Make discard clear its corresponding preview, pending errors, and approval without affecting unrelated imported/installed content.

### 1D. Protect asynchronous boundaries

- [x] Ensure an in-flight installation uses an immutable, explicitly approved snapshot and cannot become a mixture of old/new content.
- [x] Prevent edits or safely distinguish the new draft while an install is pending; test success and failure against the chosen behavior.
- [x] Keep stale async completions from reviving discarded previews or approvals.

### 1E. Verify actual exported content

- [x] Add a browser regression that downloads the generated JSON and checks its answer/content, not merely the success message.
- [x] Confirm re-preview exports 60, discard removes the old installable preview, and both builders still produce valid supported files.
- [x] Run focused pack tests, unsaved-navigation tests, lint/typecheck, and fresh-build import/install/export browser checks.

### 1F. Review, document, and push

- [x] Review mutation coverage and the unchanged import/pack-format/privacy contracts.
- [x] Update the ledger, commit as `fix(authoring): invalidate stale draft previews (UX-01)`, and push independently.
- [x] Verify the remote commit and required CI outcome; the complete application workflow passes at `d05e834`.

**Exit:** No apparently current preview can export/install an older draft, and no edit/discard can retain approval for outdated content.

## Phase 2: Safe Draft Destruction (UX-06)

**Goal:** An accidental Discard or Remove action cannot silently destroy nonempty author work.

**Dependency:** Integrate Phase 1 first; these changes share builder callbacks and preview ownership.

### 2A. Define the smallest recovery interaction

- [x] Reuse the project's established native confirmation approach for discarding a dirty draft and removing a nonempty question. Add Undo only if existing UX patterns make it equally small and reliable.
- [x] Define nonempty/dirty behavior, last-question constraints, the affected draft/question, and translated confirmation text.
- [x] Keep this repair independent of a new autosave/draft-storage feature.

### 2B. Add safeguards

- [x] Protect numeric and questioning Discard actions and numeric question removal.
- [x] Cancellation must preserve content, order, dirty state, preview, and approval exactly as before the action.
- [x] Confirmed deletion must remove only the intended work and invoke Phase 1 preview invalidation.
- [x] Return focus to the initiating control after cancellation and a logical surviving control after deletion.

### 2C. Exercise real editing flows

- [x] Test multi-question packs, first/middle/last removal, dirty/empty drafts, duplicated questions, and both builders.
- [x] Test keyboard cancellation/confirmation and continued editing at mobile and desktop sizes.
- [x] Re-run unsaved Back/Forward/link protection and stale-preview regressions together.

### 2D. Review, document, and push

- [x] Commit as `fix(authoring): protect destructive draft actions (UX-06)` with focused evidence and translated copy.
- [x] Push this completed fix separately and verify its remote/CI status.

**Exit:** Cancellation loses no work; confirmation affects only the chosen target; outdated previews do not survive destruction.

## Phase 3: Nonoverlapping Mobile Header (UX-02)

**Goal:** Language and connection/update controls remain readable and operable in every supported header state.

**Primary ownership:** `LocalizedAppShell.tsx`, `LanguageSelect` in `I18nProvider.tsx`, and `OfflineStatusIndicator.tsx`.

### 3A. Reproduce translated state collisions

- [x] Cover checking, online, offline-ready, unreachable, update-ready, and update-failed with Retry.
- [x] Reproduce the 320-pixel German collision and record each control's rectangle and usable width.

### 3B. Repair layout constraints

- [x] Let narrow layouts wrap or stack the controls with a usable minimum language-selector width.
- [x] Preserve status announcements and Retry functionality, including long translations and RTL ordering.
- [x] Keep normal desktop/tablet navigation compact and avoid unrelated shell redesign.

### 3C. Add responsive and interaction regressions

- [x] Test every supported locale across status states at 320/390 pixels; inspect representative desktop, short-landscape, and enlarged-text layouts.
- [x] Assert no intersecting control rectangles, clipping, or document overflow; verify focus visibility, keyboard selection, and Retry.
- [x] Add focused screenshots for German failure and Arabic/RTL without blindly updating existing baselines.

### 3D. Review, document, and push

- [x] Commit as `fix(layout): prevent mobile header control overlap (UX-02)` and push independently after the fix gate.
- [x] Verify the remote commit and CI result; the complete application workflow passes at `d05e834`.

**Exit:** All status text and both controls fit, remain readable, and can be used without obstruction.

## Phase 4: Accessible Starter Labels (UX-03)

**Goal:** All displayed starter identifiers meet the required contrast without changing content or hiding information.

### 4A. Add missing accessibility coverage

- [x] Add Content Packs Create to the existing entry-state axe tests.
- [x] Reproduce the 25 light-theme label failures; check current dark-theme behavior separately.

### 4B. Apply a verified text token

- [x] Replace the failing starter-label color with an existing accessible token where possible.
- [x] Limit the change to affected labels unless inspection proves a shared-token defect; avoid unrelated palette changes.

### 4C. Verify, document, and push

- [x] Check Create, Import, Installed, Discover, Resources, and Downloads in light/dark mode with relevant disclosures open and closed.
- [x] Inspect mobile/desktop readability and run axe without disabling the contrast rule.
- [x] Commit as `fix(a11y): improve content pack label contrast (UX-03)` and push independently.
- [x] Record a successful application CI outcome at `d05e834`; the initial run and correction are retained in the ledger.

**Exit:** The affected normal-sized text meets at least 4.5:1 contrast and the new Create-page regression passes.

## Phase 5: Download Reflow and Button Containment (UX-04)

**Goal:** Every download remains readable and reachable with enlarged text, increased spacing, and narrow containers.

**Primary ownership:** `ContentPackDownloadsView.tsx` and focused preference/download tests. Avoid changing all application buttons for a page-specific defect.

### 5A. Build the failure matrix

- [x] Reproduce the 640-pixel, 200%-text-plus-spacing overflow, including the Questioning example action.
- [x] Test text resizing alone, spacing alone, and their combination so failures are correctly attributed.
- [x] Include optional downloads, longest translated labels, and RTL layouts.

### 5B. Make controls and grid content-aware

- [x] Constrain download actions to their containing item and permit natural wrapping.
- [x] Prefer a short visible Download command with a descriptive accessible name; keep the complete resource title nearby.
- [x] Collapse columns when available content width cannot support them; preserve all file destinations and download attributes.

### 5C. Verify layout and files

- [x] Assert every action remains inside its card and the document at 320, 390, 640, 768, and desktop widths; include increased-text variants and short windows.
- [x] Check keyboard focus rings and accessible names remain visible and useful.
- [x] Recheck all 30 download URLs and a native starter download/import round trip; preserve same-origin/offline behavior.
- [x] Inspect intentionally changed screenshots before updating only affected baselines.

### 5D. Review, document, and push

- [x] Commit as `fix(layout): keep authoring downloads within containers (UX-04)` and push independently.
- [x] Verify remote identity and CI results; the complete application workflow passes at `d05e834`.

**Exit:** No download button escapes its item or viewport in the matrix, with no removed/renamed file or lost download behavior.

## Phase 6: Meaningful Mobile Chart Framing (UX-05)

**Goal:** Users can understand the initial visual at mobile widths without losing exact evidence or full inspection capability.

**Primary ownership:** `ExhibitChartRenderer.tsx`, its unit tests, and exhibit visual/browser tests. Review all callers, including Exhibit Sprint, simulations, and imported exhibits.

### 6A. Define framing per chart type

- [x] Reproduce the clipped insurance pie and empty initial regional-productivity scatterplot at 320/390 pixels.
- [x] Separate fit-friendly pies/small scatterplots from dense axis-based charts that legitimately need inspection scrolling.
- [x] Use existing Recharts responsive sizing with stable container dimensions; add a Fit/Inspect control only if needed after testing the simpler responsive approach.

### 6B. Implement the smallest rendering change

- [x] Keep the full pie and all scatter points inside the initial visible plot, with margins for labels/axes.
- [x] Preserve legible labels, units, tooltips, legends, exact value alternatives, and keyboard operation.
- [x] Make scrolling guidance accurate for the displayed chart; do not reference axes on a pie.
- [x] Handle resize/orientation changes and initially hidden/revealed containers without blank or zero-sized charts.

### 6C. Protect data meaning and related workflows

- [x] Verify no chart transformation changes source data, series mapping, question answers, grading, or chart semantics.
- [x] Test long imported labels and a dense imported example against existing validator limits; do not clip content to make a screenshot fit.
- [x] Check standalone exhibits, Sprint, and full-case embedding at their actual available widths.

### 6D. Run chart-specific visual and accessibility checks

- [x] Inspect table, bar, line, pie, waterfall, scatterplot, stacked bar, and index chart at phone/tablet/desktop sizes.
- [x] Assert the intended plotted pie/points are visible inside the plot viewport, not merely that an SVG exists.
- [x] Exercise keyboard, touch-sized emulation, dark mode, forced colors, reduced motion, and RTL; retain complete textual data access.
- [x] Verify production performance budgets and offline loading; review each intentional baseline change.

### 6E. Review, document, and push

- [x] Commit as `fix(exhibits): improve mobile chart framing (UX-05)` and push independently.
- [x] Verify remote identity and required CI results; the complete application workflow passes at `d05e834`.

**Exit:** Mobile charts open with meaningful visible data and all chart types retain their evidence, interactions, and performance contracts.

## Phase 7: Integrated Quality Gate

**Goal:** Prove the independently delivered fixes work together and leave a trustworthy GitHub record.

### 7A. Complete automated verification

- [x] Run `npm run check` and `npm run e2e:cross-browser` from the final implementation with matching browsers and successful exit codes: the complete project check passed on GitHub; the cross-browser suite passed locally. The failed local check and failed GitHub cross-browser attempt remain documented separately below.
- [x] Include all newly added regressions, production artifact validation, offline practice, pack import/export, cross-tab data clearing, and unchanged scoring tests.
- [ ] Obtain a successful integrated GitHub run for final HEAD without weakening assertions or bypassing checks. All application changes passed together at `d05e834`; the later test-only correction is still being rechecked.
- [x] Verify the existing JavaScript, route, and offline-install performance budgets without weakening them.

### 7B. Repeat the affected usage matrix

- [x] Re-run the audit's eight window sizes across core routes and the six repaired scenarios.
- [x] Repeat expanded authoring/downloads, light/dark, German/Arabic, larger text, spacing, and keyboard checks.
- [x] Inspect screenshots for clipping, overlap, useful initial chart framing, and focus visibility, not just geometry assertions.

### 7C. Record manual checks honestly

- [ ] Manually assess changed interactions with NVDA and with VoiceOver/Safari when the corresponding systems are available.
- [ ] Check representative real iOS/Android touch and resizing behavior when devices are available.
- [x] Record each unavailable check as pending; do not equate WebKit automation with real Safari or claim accessibility certification/release readiness.

Pending manual assessment: this run has no interactive NVDA/VoiceOver or physical iOS/Android verification capability. No screen-reader, real Safari, real-device, hosted-origin, or release-certification pass is claimed.

### 7D. Publish the final completion record

- [x] Reconcile all six finding IDs with implementation commits, validation evidence, push results, and CI URLs.
- [x] Update this plan and the audit with dated remediation references while preserving the original audit findings as historical evidence.
- [x] Publish this final documentation checkpoint after the six independent fix pushes; retain their timeline.
- [x] Report remaining CI/manual/platform gates separately from completed code fixes. No merge, tag, or production deployment is included.

## Verification Gate for Every Fix Push

Before publishing a fix as complete:

1. The focused regression reproduces the old failure and passes with the repair.
2. Relevant existing unit/component/browser tests pass, including impacted shared callers.
3. Lint and strict TypeScript pass. Rebuild before browser tests when application/build inputs changed; require clean process completion.
4. Changed visuals are inspected at representative mobile/desktop and preference states, and axe/keyboard checks match the fix's risk.
5. The code diff preserves privacy, content formats, deterministic scoring, offline/static behavior, and performance expectations.
6. The commit includes its finding ID, cause, repair, tests, and any honest limitations. Push it to the dedicated development branch immediately; verify the remote SHA and observe required CI.
7. Failed CI is recorded as failed/pending and addressed before claiming completion. Do not bypass branch protections or force-push shared history.

The GitHub workflow already runs complete verification and cross-browser smoke on pushes and pull requests. A push to `main` can trigger production promotion, so implementation pushes belong on the development branch. Production deployment is a separate action requiring its established review and verification process.

## Parallel Work and Integration

| Workstream | Can run independently after Phase 0? | Integration constraint |
| --- | --- | --- |
| Preview integrity, then destructive author actions | Yes, as one sequential authoring stream | Phase 2 follows Phase 1; one owner for manager/builders |
| Header layout | Yes | Coordinate shared shell/i18n test edits |
| Starter-label contrast | Yes | Serialize changes to shared axe entry-state lists |
| Download reflow | Yes | Keep separate from the broader authoring redesign |
| Chart framing | Yes | One owner for renderer and chart snapshots |
| Combined verification, documentation, GitHub publication | No | Central integration owner reviews and pushes one completed fix at a time |

When using subagents during execution, assign disjoint ownership, require a report of modified files, failing-before/passing-after evidence, limitations, and screenshots, and have the primary agent review every result before integration. Subagents do not push or modify shared generated locale files, lockfiles, build outputs, or the delivery ledger concurrently. No agents are launched merely to create this plan.

Parallel development does not require parallel builds or pushes. Default push order follows the phase table; an independent lower-risk fix may ship earlier when verified, with the change in order recorded and UX-01 still treated as the highest repair priority.

## GitHub Checkpoints and Evidence Ledger

| Checkpoint | Commit subject | Implementation | Local verification | Remote push / CI |
| --- | --- | --- | --- | --- |
| Planning | `docs: plan usage audit fixes and verification` | `cd45638` | Documentation reviewed | Pushed; [CI passed](https://github.com/MassimoChiarella/open-prep/actions/runs/35563710526) |
| Tooling, only if necessary | No change required so far | No application-tooling workaround | Browser preflight and production build exit successfully outside sandbox | Not applicable |
| UX-01 | `fix(authoring): invalidate stale draft previews (UX-01)` | `909589e`; originating-builder invalidation; installation lock | 52 focused tests; 1,263 full-suite tests (serial); lint/typecheck/build; 10 existing Chromium pack/navigation tests; 6 export checks across three browsers | Pushed; [initial CI failed two Firefox checks](https://github.com/MassimoChiarella/open-prep/actions/runs/35564965065); subsequent UX-06 CI passed |
| UX-06 | `fix(authoring): protect destructive draft actions (UX-06)` | `23b1fa1`; native confirmation; localized copy; survivor/title focus | 5 new tests failed before; 57 focused unit tests and 11 browser checks pass; lint/typecheck/build and budgets pass | Pushed; [CI passed](https://github.com/MassimoChiarella/open-prep/actions/runs/35565625639) |
| UX-02 | `fix(layout): prevent mobile header control overlap (UX-02)` | `65c55af`; wrap controls/status; minimum selector width | 40 browser cases: ten locales, four widths, six states; existing shell/locale tests; six unchanged visual baselines; lint/typecheck/build passed | Pushed; [initial CI failed Firefox restore timing](https://github.com/MassimoChiarella/open-prep/actions/runs/35567015256); complete application CI later passed at `d05e834` |
| UX-03 | `fix(a11y): improve content pack label contrast (UX-03)` | `b0cfac2`; existing accessible text token; Create axe coverage | 12 theme/view contrast cases, disclosures open/closed; starter tests; full existing accessibility matrix; mobile/light and desktop/dark screenshots inspected | Pushed; [initial CI exposed header-test initialization race](https://github.com/MassimoChiarella/open-prep/actions/runs/35567199614); corrected in `6d1c051` |
| UX-04 | `fix(layout): keep authoring downloads within containers (UX-04)` | `7fe9d0c`; content-aware grid; short Download action; wrapping badges/text | 15 width/preference cases across English/German/Arabic; 30 URLs and download/import round trip; screenshots reviewed; fresh build/lint/typecheck pass | Pushed; [initial CI found missing Download translations](https://github.com/MassimoChiarella/open-prep/actions/runs/35567293917); corrected in `d05e834` |
| UX-05 | `fix(exhibits): improve mobile chart framing (UX-05)` | `7ae4298`; existing Recharts responsive container for pies/scatter; accurate guidance | 16 browser cases including 500-row import/hide/resize, 320/390/768/1280 framing and seven chart preference checks; renderer/workflow units and Sprint checks; screenshots inspected | Pushed; [initial CI inherited the Download catalog failure](https://github.com/MassimoChiarella/open-prep/actions/runs/35567403003); complete application CI later passed at `d05e834` |
| Verification follow-up | `test: wait for persisted state in offline and backup checks` | `f3067a7`; explicit async storage readiness; additional preview mutation/import-owner coverage | 12 repeated offline/backup cases passed; 21 preview-integrity unit tests passed; lint/typecheck pass | Pushed; [CI inherited the Download catalog failure](https://github.com/MassimoChiarella/open-prep/actions/runs/35567519868) |
| UX-04 localization follow-up | `fix(i18n): translate compact download actions (UX-04)` | `d05e834`; nine translated Download labels and generated catalogs; explicit localized-label assertions | All 1,275 unit tests pass; lint/typecheck/build/budgets pass; all 16 download browser cases pass; refreshed RTL screenshot inspected | Pushed; [complete CI passed](https://github.com/MassimoChiarella/open-prep/actions/runs/35605196830), including cross-browser smoke; [another run of the same revision failed](https://github.com/MassimoChiarella/open-prep/actions/runs/35605194509) |
| Header verification follow-up | `test: wait for header initialization before selecting locale` | `6d1c051`; move the existing ready-state wait before language interaction | All 40 locale/viewport cases pass in the integrated run; unchanged assertions/timeouts | Pushed; [CI attempt 1](https://github.com/MassimoChiarella/open-prep/actions/runs/35605418909/attempts/1) passed the complete project check but failed one Firefox exhibit-save check; unchanged attempt 2 pending |
| Integration | `docs: record usage audit repair verification` | This documentation checkpoint; no additional runtime changes | 1,275 unit tests, 267 Chromium cases, 160 cross-browser cases, 282 audit layouts and 108 axe scans pass; limits and manual gaps recorded | Published separately after the fixes; final-HEAD CI and manual assessments remain pending |

For each checkpoint, record the date, test commands and exit results, relevant screenshots or reviewed baseline paths, commit SHA, remote verification, and CI run URL. Code commits contain their finding IDs and local test evidence; add the resolved SHA/CI result to the next ledger update or the final documentation checkpoint rather than rewriting a published commit to reference itself.

### Execution Notes: 2026-09-21

- Initial `npm run check`: version/actions/authoring/identity, lint and TypeScript passed; 161 test files and 1,238 assertions passed, but one worker exited unexpectedly, so the command failed. A serial rerun completed successfully: all 163 files / 1,263 tests passed. The initial failed command is not recorded as a pass.
- The production build initially paused in catalog validation but completed normally, including all performance budgets. An isolated bounded comparison completed both with and without file watching, so no watcher workaround was retained. The first artifact reproduced the browser failure. A second fresh build included UX-01 and passed the new browser checks.
- UX-01 regression: 10 of 11 tests failed before the repair; all 52 tests across the preview-integrity, manager, and two builder suites pass after it. Native export/invalidation checks pass in Chromium, Firefox, and WebKit (6 tests, normal exit). Existing Chromium import/install and unsaved navigation checks passed (10 tests). Lint, typecheck, and a fresh production build with unchanged performance budgets passed.
- UX-02 regression: the old 320-pixel German layout failed the minimum selector-width assertion. After the repair, 40 cases pass across 320/390/844/1280 pixels, including 200% text on wide/short windows and keyboard Retry. German and Arabic screenshots were inspected. All six existing visual snapshots passed without baseline updates.
- UX-03 regression: the original 25 starter labels failed light-theme contrast. All six Content Packs views now pass in both themes with disclosures closed/open. Tests use the existing reduced-motion approach so axe does not sample a partially transparent entry animation; no contrast rule is disabled. Screenshots show the actual starter identifiers at 390/1280 pixels. Related starter tests and the full accessibility matrix pass.
- UX-04 regression: the original 640-pixel combined text/spacing case failed containment. The broader matrix also exposed narrow file-type badges; natural wrapping fixes both. Fifteen tests cover five widths and three preferences in English/German/Arabic, including optional resources and a short window; a sixteenth verifies all 30 destinations and downloads/imports the real starter. The enlarged RTL screenshot was inspected. No resource files, paths, or download attributes changed.
- UX-05 regression: the old mobile pie/scatter canvases placed plotted marks outside the viewport. All marks now fit at four widths and after repeated resizing. A 500-row imported scatterplot retains every point/text row after hide/resize/reveal. Seven chart types pass dark-theme axe and retain exact data under forced-colors/RTL/reduced motion; renderer/tooltips and related workflow unit tests and four Sprint browser checks pass. Pie/scatter phone and desktop screenshots were inspected. Existing dense axis-based charts retain inspection scrolling. No data, scoring, content, or dependencies changed.
- Independent presentation repairs were developed together in disjoint files, then verified against a fresh combined production build before separate reviewed commits/pushes. The focused matrix passed 135 Chromium cases; related unit suites passed 55 tests, and lint/TypeScript passed. GitHub rebuilds each pushed snapshot independently. This avoids concurrent builds replacing the artifact under test.
- UX-01's first CI run passed its main verification but failed existing Firefox offline-resume and backup-transfer checks. UX-06's subsequent unmodified checks passed. The follow-up test correction waits for the draft write/settings initialization and additionally checks resumed prompt identity; three repetitions across engines passed all 12 cases, without relaxed final assertions or global timeouts.
- The repeated audit matrix completed normally: 282 layout states (29 routes at eight window sizes, expanded/preference states, and five routes in each additional engine), no document/control overflow findings, no axe violations, and no uncaught Chromium page errors. Firefox and WebKit both completed. Evidence is retained only in ignored `.dist-verification/usage-fixes-2026-09-21/`; it is not a public release artifact. The broader matrix supplements, not replaces, targeted state/geometry assertions.
- Integration follow-up: the full catalog-coverage test correctly rejected the new `Download` key because its nine translations were missing. They are now added and generated through the existing locale pipeline; the download matrix also asserts the translated label. The first header CI failed the pre-existing Firefox restore timing path; the contrast CI passed 234 cases but exposed a new header test selecting language before initialization. That test now waits for the existing online state before selection. Published failed runs remain historical failures, not retroactively green results. A later full passing run is required before completion.
- The corrected full local check passed all 163 unit files / 1,275 tests, lint, TypeScript, authoring/identity/catalog/locale checks, and the fresh production build. Its Chromium stage passed 266 cases but one unchanged benchmark case ended with `Target crashed` before navigation; the command is recorded as failed. The exact benchmark test passed three isolated repetitions (normal exit), followed by the complete unchanged browser rerun below.
- The complete unchanged Chromium rerun subsequently passed all 267 cases in 9.2 minutes with normal exit. GitHub's `Verify project` step also passed the entire `npm run check` from clean revision `6d1c051`. This successful clean-checkout result is separate from the failed local command; the latter is not relabeled as passing.
- Reconciliation of GitHub's completed runs confirms the complete application revision `d05e834` passed both `Verify project` and cross-browser smoke in run `35605196830`. Its subsequent commit `6d1c051` changes only the header regression's initialization wait and this ledger, with no application changes. The later failed attempt is still retained and its final-HEAD gate remains pending rather than borrowing the earlier green status.
- The final local `npm run e2e:cross-browser` passed all 160 cases in 5.8 minutes with normal exit, including Firefox/WebKit smoke, offline resume, cross-window clearing, authoring exports, and backup portability. No cleanup hang recurred. The GitHub run's first attempt passed its complete project check but timed out waiting five seconds for the existing Firefox exhibit-answer save. Its retained snapshot shows the correct answer/solution and `Saving...`, not a missed click or incorrect answer. Nine unchanged repetitions across three browsers with two workers passed locally. The failure is not reproduced locally or declared fixed; the same GitHub job is being rerun unchanged, and its gate remains pending.
- Production budgets remain within their existing limits: largest JavaScript chunk 395.2 KiB / 500 KiB; largest Brotli route JavaScript 404.9 KiB / 480 KiB; offline install precache 4,844.7 KiB / 6,144 KiB (189 files). The build finalized 228 files with cache ID `math-drill-offline-v0.1.0-7b32d087c07117db`. No snapshot baselines or budget limits were changed.
- Final chart inspection includes all eight types at phone/tablet/desktop sizes, plus standalone/Sprint/full-case workflow checks and an offline full-case chart. The 320-pixel chart title/statistics header has pre-existing awkward wrapping, recorded as a separate polish follow-up in the audit. It does not undo the repaired pie/scatter framing or remove exact textual evidence.

If a fix must be rolled back, use an ordinary reviewed revert commit, restore its status to open, run the affected checks, and push the revert. Do not reset or overwrite other contributors' history.

## Completion Definition

All six fixes have independent documented GitHub commits, current regression coverage, reviewed responsive/accessibility evidence, and successful required automated checks. The final ledger clearly separates pending real-device/screen-reader checks from code completion. No broader redesign, unrelated dependency change, production deployment, or missing manual assessment is silently included or claimed complete.

UX-06 evidence: populated means any question field differs from its initial defaults, including IDs/settings; untouched empty questions can be removed without a prompt. Dirty-draft discard and nonempty-question removal require confirmation. Unit tests cover cancellation with approval intact, first/middle/last deletion, duplicated questions, last-question protection, reset and focus. Chromium checks cover keyboard cancellation/confirmation at 390/1280 pixels; all three engines pass the export regressions. Existing Back/Forward/link guards remain passing. Native screen-reader review remains pending.
