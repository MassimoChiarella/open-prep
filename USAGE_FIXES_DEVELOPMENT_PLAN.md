# Usage Audit Fixes Development Plan

Created: 2026-09-21

Status: Implementation started; Phase 0 verification is in progress.

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
| 1 | 0 | Establish a reproducible verification and GitHub baseline | Delivery prerequisite | None | In progress |
| 2 | 1 | UX-01: Stale previews can export/install older draft content | P1 | Phase 0 | Not started |
| 3 | 2 | UX-06: Discard/remove actions have no confirmation or recovery | P2 | Phase 1 | Not started |
| 4 | 3 | UX-02: German update-failure status overlaps mobile language selection | P2 | Phase 0 | Not started |
| 5 | 4 | UX-03: Starter labels have insufficient text contrast | P2 | Phase 0 | Not started |
| 6 | 5 | UX-04: Enlarged download buttons escape their cards/viewport | P2 | Phase 0 | Not started |
| 7 | 6 | UX-05: Mobile pie/scatter framing initially hides meaningful data | P2 | Phase 0 | Not started |
| 8 | 7 | Integrated verification and final GitHub evidence | Completion gate | Phases 1-6 | Not started |

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
- [ ] Reconcile the audit artifact's baseline (`0c92484` plus dependency edits) with the dependency-refresh commit observed at planning (`d51c9e1`). Rebuild; do not test a stale audit artifact.
- [x] Fetch and inspect the approved integration base. Use a dedicated `codex/usage-audit-fixes` branch, or a clearly named equivalent if it already exists. Do not silently include unmerged, unrelated branch changes.
- [x] Confirm GitHub authentication and that `origin` is the intended Open Prep repository before publishing.

### 0B. Verify the supported toolchain

- [x] Use the repository-pinned Node 24.19.0 and npm 11.17.0 toolchain; confirm the installed dependency versions against the lockfile.
- [x] Verify matching Playwright browser installations and minimal Chromium, Firefox, and WebKit page creation independently of the app.
- [x] Reproduce or clear the Firefox `_page` startup error without assuming that the app caused it. Do not upgrade unrelated dependencies as an incidental repair.

### 0C. Establish reliable test completion

- [ ] Run a small existing browser suite and require normal runner/browser/server shutdown.
- [ ] If cleanup hangs recur, isolate runner, browser, and server teardown; make any necessary minimal test-tool correction its own documented prerequisite commit.
- [ ] Recheck the slow WebKit cross-window reset test. Profile/split its steps if needed rather than increasing all timeouts or weakening privacy assertions.
- [ ] Preserve bounded execution limits and failing-run evidence. If a platform remains unavailable, record the limitation and leave its gate pending rather than marking the overall repair complete.

### 0D. Freeze useful baselines

- [ ] Build and verify a fresh production export in an isolated location with known source identity.
- [ ] Record current lint/typecheck/unit/build results and affected browser tests, distinguishing unrelated baseline failures.
- [ ] Capture reproducible failing cases for all six findings, including the exact viewport/preferences and representative pack/chart data.

### 0E. Publish the development record

- [ ] Review and commit the audit, this plan, and the active-plan link, excluding ignored evidence files.
- [ ] Push the planning checkpoint to the development branch; record its remote identity and CI outcome.

**Exit:** Source/toolchain/build identity is known; targeted browser checks terminate normally; the repair branch and planning record are available on GitHub. Independent code work may proceed while a tooling issue is investigated, but affected verification gates remain open.

## Phase 1: Current-Draft Preview Integrity (UX-01)

**Goal:** Installation and export can only use the reviewed content represented by the current authoring draft.

**Primary ownership:** `QuestionPackManager.tsx`, `QuestionPackBuilder.tsx`, `QuestioningPackBuilder.tsx`, and their existing unit/component tests.

### 1A. Specify the preview lifecycle

- [ ] Trace numeric-builder, questioning-builder, file-import, and catalog preview paths and every install/download action.
- [ ] Define which draft owns a preview and when its review acknowledgement expires.
- [ ] Choose the smallest existing-pattern implementation. Prefer invalidating the originating preview on edits over adding a generalized draft framework.

### 1B. Add failing state-integrity tests

- [ ] Preview an answer of 50, approve review, edit it to 60, and assert the obsolete payload is no longer exportable/installable as current.
- [ ] Cover title/metadata changes, question edits, duplicate/add/remove/reorder, discard, failed revalidation, and questioning concept/intent edits.
- [ ] Cover two builders on the same page: a new preview replaces its predecessor and an unrelated builder cannot mistakenly clear or approve another preview.
- [ ] Preserve file-import/catalog confirmation and installed-pack replacement semantics.

### 1C. Implement invalidation and approval reset

- [ ] Clear or disable the originating draft's obsolete preview immediately after a content mutation.
- [ ] Require validation and fresh review for the new payload before installation; do not retain stale approval.
- [ ] Make discard clear its corresponding preview, pending errors, and approval without affecting unrelated imported/installed content.

### 1D. Protect asynchronous boundaries

- [ ] Ensure an in-flight installation uses an immutable, explicitly approved snapshot and cannot become a mixture of old/new content.
- [ ] Prevent edits or safely distinguish the new draft while an install is pending; test success and failure against the chosen behavior.
- [ ] Keep stale async completions from reviving discarded previews or approvals.

### 1E. Verify actual exported content

- [ ] Add a browser regression that downloads the generated JSON and checks its answer/content, not merely the success message.
- [ ] Confirm re-preview exports 60, discard removes the old installable preview, and both builders still produce valid supported files.
- [ ] Run focused pack tests, unsaved-navigation tests, lint/typecheck, and fresh-build import/install/export browser checks.

### 1F. Review, document, and push

- [ ] Review mutation coverage and the unchanged import/pack-format/privacy contracts.
- [ ] Update the ledger, commit as `fix(authoring): invalidate stale draft previews (UX-01)`, and push independently.
- [ ] Verify the remote commit and required CI outcome.

**Exit:** No apparently current preview can export/install an older draft, and no edit/discard can retain approval for outdated content.

## Phase 2: Safe Draft Destruction (UX-06)

**Goal:** An accidental Discard or Remove action cannot silently destroy nonempty author work.

**Dependency:** Integrate Phase 1 first; these changes share builder callbacks and preview ownership.

### 2A. Define the smallest recovery interaction

- [ ] Reuse the project's established native confirmation approach for discarding a dirty draft and removing a nonempty question. Add Undo only if existing UX patterns make it equally small and reliable.
- [ ] Define nonempty/dirty behavior, last-question constraints, the affected draft/question, and translated confirmation text.
- [ ] Keep this repair independent of a new autosave/draft-storage feature.

### 2B. Add safeguards

- [ ] Protect numeric and questioning Discard actions and numeric question removal.
- [ ] Cancellation must preserve content, order, dirty state, preview, and approval exactly as before the action.
- [ ] Confirmed deletion must remove only the intended work and invoke Phase 1 preview invalidation.
- [ ] Return focus to the initiating control after cancellation and a logical surviving control after deletion.

### 2C. Exercise real editing flows

- [ ] Test multi-question packs, first/middle/last removal, dirty/empty drafts, duplicated questions, and both builders.
- [ ] Test keyboard cancellation/confirmation and continued editing at mobile and desktop sizes.
- [ ] Re-run unsaved Back/Forward/link protection and stale-preview regressions together.

### 2D. Review, document, and push

- [ ] Commit as `fix(authoring): protect destructive draft actions (UX-06)` with focused evidence and translated copy.
- [ ] Push this completed fix separately and verify its remote/CI status.

**Exit:** Cancellation loses no work; confirmation affects only the chosen target; outdated previews do not survive destruction.

## Phase 3: Nonoverlapping Mobile Header (UX-02)

**Goal:** Language and connection/update controls remain readable and operable in every supported header state.

**Primary ownership:** `LocalizedAppShell.tsx`, `LanguageSelect` in `I18nProvider.tsx`, and `OfflineStatusIndicator.tsx`.

### 3A. Reproduce translated state collisions

- [ ] Cover checking, online, offline-ready, unreachable, update-ready, and update-failed with Retry.
- [ ] Reproduce the 320-pixel German collision and record each control's rectangle and usable width.

### 3B. Repair layout constraints

- [ ] Let narrow layouts wrap or stack the controls with a usable minimum language-selector width.
- [ ] Preserve status announcements and Retry functionality, including long translations and RTL ordering.
- [ ] Keep normal desktop/tablet navigation compact and avoid unrelated shell redesign.

### 3C. Add responsive and interaction regressions

- [ ] Test every supported locale across status states at 320/390 pixels; inspect representative desktop, short-landscape, and enlarged-text layouts.
- [ ] Assert no intersecting control rectangles, clipping, or document overflow; verify focus visibility, keyboard selection, and Retry.
- [ ] Add focused screenshots for German failure and Arabic/RTL without blindly updating existing baselines.

### 3D. Review, document, and push

- [ ] Commit as `fix(layout): prevent mobile header control overlap (UX-02)` and push independently after the fix gate.
- [ ] Verify the remote commit and CI result.

**Exit:** All status text and both controls fit, remain readable, and can be used without obstruction.

## Phase 4: Accessible Starter Labels (UX-03)

**Goal:** All displayed starter identifiers meet the required contrast without changing content or hiding information.

### 4A. Add missing accessibility coverage

- [ ] Add Content Packs Create to the existing entry-state axe tests.
- [ ] Reproduce the 25 light-theme label failures; check current dark-theme behavior separately.

### 4B. Apply a verified text token

- [ ] Replace the failing starter-label color with an existing accessible token where possible.
- [ ] Limit the change to affected labels unless inspection proves a shared-token defect; avoid unrelated palette changes.

### 4C. Verify, document, and push

- [ ] Check Create, Import, Installed, Discover, Resources, and Downloads in light/dark mode with relevant disclosures open and closed.
- [ ] Inspect mobile/desktop readability and run axe without disabling the contrast rule.
- [ ] Commit as `fix(a11y): improve content pack label contrast (UX-03)`, push independently, and record remote/CI evidence.

**Exit:** The affected normal-sized text meets at least 4.5:1 contrast and the new Create-page regression passes.

## Phase 5: Download Reflow and Button Containment (UX-04)

**Goal:** Every download remains readable and reachable with enlarged text, increased spacing, and narrow containers.

**Primary ownership:** `ContentPackDownloadsView.tsx` and focused preference/download tests. Avoid changing all application buttons for a page-specific defect.

### 5A. Build the failure matrix

- [ ] Reproduce the 640-pixel, 200%-text-plus-spacing overflow, including the Questioning example action.
- [ ] Test text resizing alone, spacing alone, and their combination so failures are correctly attributed.
- [ ] Include optional downloads, longest translated labels, and RTL layouts.

### 5B. Make controls and grid content-aware

- [ ] Constrain download actions to their containing item and permit natural wrapping.
- [ ] Prefer a short visible Download command with a descriptive accessible name; keep the complete resource title nearby.
- [ ] Collapse columns when available content width cannot support them; preserve all file destinations and download attributes.

### 5C. Verify layout and files

- [ ] Assert every action remains inside its card and the document at 320, 390, 640, 768, and desktop widths; include increased-text variants and short windows.
- [ ] Check keyboard focus rings and accessible names remain visible and useful.
- [ ] Recheck all 30 download URLs and a native starter download/import round trip; preserve same-origin/offline behavior.
- [ ] Inspect intentionally changed screenshots before updating only affected baselines.

### 5D. Review, document, and push

- [ ] Commit as `fix(layout): keep authoring downloads within containers (UX-04)` and push independently.
- [ ] Verify remote identity and CI results.

**Exit:** No download button escapes its item or viewport in the matrix, with no removed/renamed file or lost download behavior.

## Phase 6: Meaningful Mobile Chart Framing (UX-05)

**Goal:** Users can understand the initial visual at mobile widths without losing exact evidence or full inspection capability.

**Primary ownership:** `ExhibitChartRenderer.tsx`, its unit tests, and exhibit visual/browser tests. Review all callers, including Exhibit Sprint, simulations, and imported exhibits.

### 6A. Define framing per chart type

- [ ] Reproduce the clipped insurance pie and empty initial regional-productivity scatterplot at 320/390 pixels.
- [ ] Separate fit-friendly pies/small scatterplots from dense axis-based charts that legitimately need inspection scrolling.
- [ ] Use existing Recharts responsive sizing with stable container dimensions; add a Fit/Inspect control only if needed after testing the simpler responsive approach.

### 6B. Implement the smallest rendering change

- [ ] Keep the full pie and all scatter points inside the initial visible plot, with margins for labels/axes.
- [ ] Preserve legible labels, units, tooltips, legends, exact value alternatives, and keyboard operation.
- [ ] Make scrolling guidance accurate for the displayed chart; do not reference axes on a pie.
- [ ] Handle resize/orientation changes and initially hidden/revealed containers without blank or zero-sized charts.

### 6C. Protect data meaning and related workflows

- [ ] Verify no chart transformation changes source data, series mapping, question answers, grading, or chart semantics.
- [ ] Test long imported labels and a dense imported example against existing validator limits; do not clip content to make a screenshot fit.
- [ ] Check standalone exhibits, Sprint, and full-case embedding at their actual available widths.

### 6D. Run chart-specific visual and accessibility checks

- [ ] Inspect table, bar, line, pie, waterfall, scatterplot, stacked bar, and index chart at phone/tablet/desktop sizes.
- [ ] Assert the intended plotted pie/points are visible inside the plot viewport, not merely that an SVG exists.
- [ ] Exercise keyboard, touch-sized emulation, dark mode, forced colors, reduced motion, and RTL; retain complete textual data access.
- [ ] Verify production performance budgets and offline loading; review each intentional baseline change.

### 6E. Review, document, and push

- [ ] Commit as `fix(exhibits): improve mobile chart framing (UX-05)` and push independently.
- [ ] Verify remote identity and required CI results.

**Exit:** Mobile charts open with meaningful visible data and all chart types retain their evidence, interactions, and performance contracts.

## Phase 7: Integrated Quality Gate

**Goal:** Prove the independently delivered fixes work together and leave a trustworthy GitHub record.

### 7A. Complete automated verification

- [ ] From the final implementation commit, run `npm run check` and `npm run e2e:cross-browser` with matching installed browsers; require successful exit codes.
- [ ] Include all newly added regressions, production artifact validation, offline practice, pack import/export, cross-tab data clearing, and unchanged scoring tests.
- [ ] Verify the existing JavaScript, route, and offline-install performance budgets without weakening them.

### 7B. Repeat the affected usage matrix

- [ ] Re-run the audit's eight window sizes across core routes and the six repaired scenarios.
- [ ] Repeat expanded authoring/downloads, light/dark, German/Arabic, larger text, spacing, and keyboard checks.
- [ ] Inspect screenshots for clipping, overlap, useful initial chart framing, and focus visibility, not just geometry assertions.

### 7C. Record manual checks honestly

- [ ] Manually assess changed interactions with NVDA and with VoiceOver/Safari when the corresponding systems are available.
- [ ] Check representative real iOS/Android touch and resizing behavior when devices are available.
- [ ] Record each unavailable check as pending; do not equate WebKit automation with real Safari or claim accessibility certification/release readiness.

### 7D. Publish the final completion record

- [ ] Reconcile all six finding IDs with implementation commits, validation evidence, push results, and CI URLs.
- [ ] Update this plan and the audit with dated remediation references while preserving the original audit findings as historical evidence.
- [ ] Push a final documentation checkpoint after the six independent fix pushes; do not squash away their timeline.
- [ ] Report remaining manual/platform blockers separately from completed code fixes. Do not merge, tag, or deploy to production as an incidental part of this plan.

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
| Planning | `docs: plan usage audit fixes and verification` | Documents prepared | Documentation checks only | Not pushed |
| Tooling, only if necessary | `test: restore reliable browser verification` | Not started | Pending | Pending |
| UX-01 | `fix(authoring): invalidate stale draft previews (UX-01)` | Not started | Pending | Pending |
| UX-06 | `fix(authoring): protect destructive draft actions (UX-06)` | Not started | Pending | Pending |
| UX-02 | `fix(layout): prevent mobile header control overlap (UX-02)` | Not started | Pending | Pending |
| UX-03 | `fix(a11y): improve content pack label contrast (UX-03)` | Not started | Pending | Pending |
| UX-04 | `fix(layout): keep authoring downloads within containers (UX-04)` | Not started | Pending | Pending |
| UX-05 | `fix(exhibits): improve mobile chart framing (UX-05)` | Not started | Pending | Pending |
| Integration | `docs: record usage audit repair verification` | Not started | Pending | Pending |

For each checkpoint, record the date, test commands and exit results, relevant screenshots or reviewed baseline paths, commit SHA, remote verification, and CI run URL. Code commits contain their finding IDs and local test evidence; add the resolved SHA/CI result to the next ledger update or the final documentation checkpoint rather than rewriting a published commit to reference itself.

If a fix must be rolled back, use an ordinary reviewed revert commit, restore its status to open, run the affected checks, and push the revert. Do not reset or overwrite other contributors' history.

## Completion Definition

All six fixes have independent documented GitHub commits, current regression coverage, reviewed responsive/accessibility evidence, and successful required automated checks. The final ledger clearly separates pending real-device/screen-reader checks from code completion. No broader redesign, unrelated dependency change, production deployment, or missing manual assessment is silently included or claimed complete.
