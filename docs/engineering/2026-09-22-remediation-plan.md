# Audit remediation development plan

Date: 22 September 2026  
Status: planning deliverable; implementation and acceptance evidence are tracked separately  
Companion: [Technical specification](2026-09-22-remediation-spec.md)

## Objective and execution contract

Resolve all 20 audit findings, implement all four tracked improvements, and explicitly dispose of the audit's additional observations. Work in the order below: protect persisted data first, restore correct behavior and grading next, then improve responsiveness and complete cross-product verification.

This plan has **nine phases and 27 work packages, S00–S26**. Each package has a focused proposed commit and completion gate. Package numbers are stable tracking identifiers, not elapsed-day estimates. No calendar dates are promised before the implementation baseline and available reviewers/devices are known.

The audit exercised source `6604838`; the planning baseline is committed source `a54775d`. Uncommitted work was observed in the question builders, InfoHint, and their tests while preparing this plan. Treat AUD-11, AUD-13, AUD-14, and AUD-19 as **concurrent work observed; verification required**. Inspect and retain that work before implementing overlapping changes. A code change or a passing old test alone does not close an audit item.

Use one continuing implementation branch/isolated checkout when isolation is needed, with the repository's `codex/` prefix. Do not create a permanent branch for every finding. Preserve unrelated working changes. Keep focused commits in execution order and push each relevant, verified increment to GitHub when implementation proceeds under the user's existing incremental-push instruction. Preserve individual commits when integrating to `main`; do not squash the development history. Apply the repository's existing CI and branch protections. This planning task itself does not push, merge, deploy, or tag a release.

Before each package: read its specification, check whether another change already satisfies it, reproduce the remaining failure, and select the existing tests to extend. After each package: run focused checks, record evidence against its audit IDs, and commit only the relevant code/tests/documentation. Run the full integration gate at phase boundaries intended for merging; do not repeatedly run the entire suite after every cosmetic edit.

## Traceability ledger

Every row must finish with an implementation commit or verified-existing-fix reference, test/evidence link, and final status. All rows below begin open unless an existing fix is explicitly identified. IMP items are required work, not an optional backlog.

| Item | Requirement | Primary work package | Prerequisites / closure evidence |
|---|---|---|---|
| AUD-01 | Atomic protection against stale drill writes | S01, S02 | Two-tab draft/completion and exactly-once review tests |
| AUD-02 | Saved input fits backup contracts | S03, S05 | Boundary inputs and recovery of legacy oversized records |
| AUD-03 | No non-finite numeric values in saved answers | S04, S05 | Parser, persistence, and both export paths |
| AUD-04 | Successful network responses survive runtime cache failure | S06 | Cache-fault browser test plus offline/update regression |
| AUD-05 | Pending profile save cannot lose newer edits | S07 | Delayed success/failure and invalidation tests |
| AUD-06 | Feedback and whole-session deadline remain consistent | S08 | Controlled clock plus production-browser timeout journey |
| AUD-07 | Weighted-margin questions state coherent relative sales ratios | S09 | Actual wording and independent answer checks |
| AUD-08 | Displayed exact correct answers remain acceptable | S10 | Precision/locale/rounding tests |
| AUD-09 | Correct unitless Interview Math receives full credit | S11 | Evaluation, error type, recorded score, summary, backup |
| AUD-10 | Generated IDs are unique without breaking old history | S12 | Collision fixture, provenance, old resume/retry/restore |
| AUD-11 | Bulk authoring stays responsive | S13 | Repeated 100/200/500-question measurements; concurrent work to reconcile |
| AUD-12 | Long Fit content stays inside the layout | S14 | Long saved text at narrow/desktop/RTL sizes |
| AUD-13 | Hidden invalid fields become visible and focusable | S15 | Collapsed/nested details, keyboard, invalid-field recovery; concurrent work to reconcile |
| AUD-14 | Authoring hints stay inside viewport | S16 | Every affected/shared caller at narrow widths and RTL; concurrent work to reconcile |
| AUD-15 | Supported backup preparation yields to the UI | S17 | Valid 36 MB fixture, heartbeat/long tasks, cross-browser restore |
| AUD-16 | Accepted questioning weights yield finite scores | S18 | Extreme weights through import and existing stored-pack paths |
| AUD-17 | Accepted brainstorming scoring has an attainable maximum | S19 | Relevant-theme reachability and distractor behavior |
| AUD-18 | Review and generation agree on decimal capacity | S20 | 729-variant fixture and sampling warning |
| AUD-19 | Native authoring ID validation works in all engines | S21 | Invalid and valid IDs in all three fields/engines; concurrent work to reconcile |
| AUD-20 | Personal-data counts represent actual notes | S22 | Undefined/blank/real note, clear, export/restore |
| IMP-01 | Lifetime-history pages remain responsive | S23 | Exact metric equivalence and repeated large-history measurements |
| IMP-02 | Recover one incompatible attempt without resetting all history | S05 | Preview, explicit action, transaction failure, unrelated data preserved |
| IMP-03 | Clarify the negative-values option | S24 | Explicit operand wording, translations, generation unchanged |
| IMP-04 | Add interaction-focused regression coverage | S01–S25 | Each fix's regression plus final integrated interaction matrix |

## Phase 0 — Establish an executable baseline

### S00 — Reconcile current work and freeze the execution baseline

Suggested commit: `docs: specify audit remediation and acceptance gates`  
Size: small; depends on none.

1. Record the actual branch, commit, working changes, Node/npm versions, supported export/database versions, and current Playwright projects. Start from the intended integrated code, not an old `out/` directory.
2. Compare each ledger row with current source and concurrent work. Preserve existing fixes and test them against the specification; do not reapply equivalent patches. Record source/evidence for the already-committed contrast fix.
3. Promote the agreed portable specification/plan from the audit review directory into durable repository documentation, and only necessary synthetic fixtures/probes into normal tests as their repairs are implemented. Do not commit browser profiles, complete raw traces, local paths, or learner records.
4. Capture a quiet production-build performance baseline for the reference fixtures before optimization. Existing parallel-audit timings are evidence of a problem, not a controlled release baseline.
5. Link substantial storage/recovery changes to the project's issue/requirement process before implementation, as required by CONTRIBUTING. These documents supply the concrete scope; avoid creating duplicate issue threads.

**Gate:** cleanly identified source subject, reconciled ledger, runnable failing reproductions, and recorded measurement settings. No audit issue is marked fixed merely because it is already being edited.

## Phase 1 — Protect progress, exportability, and offline access

### S01 — Add the smallest atomic conditional-write capability

Suggested commit: `fix(storage): add atomic conditional mutations`  
Size: large; depends on S00.

1. Extend the existing AppStorage implementations with a narrowly scoped read/modify/write transaction capability sufficient for session revision checks, associated review bookkeeping, and lifecycle generation checks. Do not expose an asynchronous callback that can outlive an IndexedDB transaction.
2. Provide equivalent MemoryAppStorage semantics, abort behavior, close behavior, and typed conflict outcomes. Reads used to decide the writes must happen inside the same transaction as those writes.
3. Add backward-compatible session revision metadata and the internal lifecycle metadata contract specified in the technical document. Keep internal metadata outside learner exports. Add an authentic v9 predecessor fixture for the new migration while preserving existing v7/v8 database and supported export fixtures unchanged; use the actual predecessor if another migration lands first.
4. Verify conflicting connections, thrown callbacks, transaction abort, late writes after reset/restore, and failed migration/reopen. Do not rely on BroadcastChannel delivery for correctness.

**Gate:** an old revision cannot commit, a failed transaction makes no partial writes, and new metadata does not corrupt old imports or leak into exported learner settings.

### S02 — Make drill draft and completion writes conflict-aware

Suggested commit: `fix(drills): preserve completed sessions across tabs`  
Size: large; depends on S01.

1. Carry the expected revision/lifecycle token from draft load through save and completion. Serialize a tab's own saves so stale in-flight results cannot replace its latest token.
2. Check completion and calculate response/mistake/retry updates atomically. Preserve identical completion retries as idempotent; distinguish a conflicting completion instead of silently overwriting it.
3. Add a recoverable conflict state: stop stale autosave, explain that the attempt changed elsewhere, and offer to view the saved attempt or explicitly keep the retained local answers, question snapshots, and actual timing as a separate attempt under a new ID. Do not silently merge answers or discard the conflicting work.
4. Exercise both tab orders, simultaneous completion, delayed draft writes, storage failures, refresh/resume, benchmark callers, and review counters advancing only once.

**Gate:** AUD-01 reproduction preserves the completed result and coherent dependent stores, with a usable recovery path in the stale tab.

### S03 — Align persisted text with backup limits

Suggested commit: `fix(storage): align saved input and backup limits`  
Size: medium; depends on S02.

1. Centralize the existing 100,000-code-unit persisted-string ceiling without weakening import/export limits. Add a separate 4,096-code-unit cap for new numeric answers across drill, exhibit, and sizing paths. Inventory numeric-answer, market-sizing-note, and preparation-profile writers plus direct submission callers.
2. Reject over-limit writes with clear localized feedback before advancing/saving the attempt. Apply browser input constraints and domain-boundary checks; do not depend on HTML attributes alone or silently truncate stored content.
3. Keep allowed boundary-length data exportable and preserve existing smaller field-specific constraints. Do not lower the compatibility limit for existing valid histories merely to make the UI faster.
4. Test 4,095/4,096/4,097 for new answers and legacy 99,999/100,000/100,001 for storage/export, paste/programmatic input, multi-code-unit text, and ordinary invalid numeric answers that should still be recorded as bounded incorrect responses.

**Gate:** new ordinary app records cannot reproduce AUD-02, and valid records still pass both backup formats. Existing bad records are handled by S05.

### S04 — Close numeric overflow and legacy-sign gaps

Suggested commit: `fix(parser): reject non-finite normalized answers`  
Size: medium; depends on S03.

1. Validate the result after scaling, signed/mixed-separator recursion, and division using the shared parser's existing invalid-answer contract.
2. Guard saved response/score numeric fields so a direct caller cannot persist Infinity or NaN. Preserve the existing representation for an invalid numeric answer rather than inventing a score for it.
3. Reproduce the no-locale legacy sign observation in a focused library test. If reproduced, fix the sign-preservation path in this same parser change; record that UI reachability was not established by the audit.
4. Cover positive/negative overflow, overflow fractions, valid finite boundaries, supported locales, and ordinary negative currency/fraction inputs. Complete/save/export a generated attempt through production functions.

**Gate:** AUD-03 cannot poison new history; legacy sign disposition is recorded; no accepted finite parsing behavior regresses.

### S05 — Recover individual incompatible history records

Suggested commit: `feat(settings): recover incompatible practice records`  
Size: large; depends on S01–S04.

1. Diagnose backup-incompatible records without modifying them. Identify the affected attempt, failure category, directly owned dependent records, and any related summary/review consequences.
2. Provide a bounded, local recovery preview and an optional lossless diagnostic download clearly identified as a recovery record, not an ordinary restorable progress backup. Preserve non-finite values explicitly in that diagnostic representation.
3. Require an explicit user action after the preview for repair/removal. Remove only the selected attempt and demonstrably owned dependents in one conflict-checked transaction; stop and re-preview if the underlying data changed. Preserve unrelated attempts, notes, Fit stories, settings, and packs.
4. Refresh derived views and broadcast invalidation only after commit. Rebuild affected derived values where supported; never clear the entire mistake/retry history as a shortcut.
5. Cover the actual oversized-answer and Infinity fixtures, cancel, download failure, failed transaction, orphan/ambiguous references, simultaneous save, and subsequent successful standard/complete backup.

**Gate:** AUD-02/03 legacy fixtures have a non-global recovery route and IMP-02 is complete, with no silent record omission or automatic data deletion.

### S06 — Preserve successful fetches when runtime caching fails

Suggested commit: `fix(pwa): tolerate optional cache write failures`  
Size: small; depends on S00; integrate after S05.

1. Separate network success from best-effort runtime cache updates in both worker strategies. Return the successful original response even if caching its clone fails.
2. Ensure background revalidation rejection is handled and does not create an unhandled rejection. Retain current install/activation atomicity and same-origin policy.
3. Test quota/write/open failures as applicable, warm hits, successful uncached downloads, real network failures, offline fallback, and failed-update retention.

**Phase gate:** focused storage/parser/backup/worker checks pass; clean build and full check pass before integrating this data-safety phase. Preserve an upgrade/recovery evidence set.

## Phase 2 — Restore predictable saving and timing

### S07 — Make preparation-profile saving single-flight

Suggested commit: `fix(prep): protect profile edits during saving`  
Size: small; depends on S00.

1. Disable the native fieldset containing profile inputs while a save is pending, and prevent a second save from starting.
2. Retain the submitted draft on error; re-enable editing with actionable feedback. Guard completion after unmount, private-data clearing, or lifecycle invalidation.
3. Extend the delayed-storage component reproduction to verify disabled input behavior, success, failure/retry, and no stale completion after reset.

**Gate:** AUD-05 cannot discard newer editable input or report an unsaved draft as saved.

### S08 — Keep the whole-session clock active through feedback

Suggested commit: `fix(drills): enforce session deadlines during feedback`  
Size: medium; depends on S02.

1. Keep the existing absolute whole-session deadline and displayed countdown active during feedback. Preserve per-question feedback pause behavior and timing accommodations.
2. Finalize unanswered questions exactly once at expiry. Do not overwrite the submitted answer or apply its unit/equation/interpretation and solve time to the next unseen question.
3. Handle deadline/submit races, tab backgrounding, resume, Next at expiry, untimed mode, delayed feedback, and benchmark restrictions.

**Phase gate:** controlled-clock tests and a real browser journey agree on displayed time, timeout status, score, and saved summary.

## Phase 3 — Correct content, grading, and identity

### S09 — State weighted-average sales ratios accurately

Suggested commit: `fix(content): describe relative sales weights accurately`  
Size: medium; depends on S00.

1. Rewrite the two affected prompts to describe relative sales ratios rather than percentages of the same total. Preserve existing independent variables, formulas, and seeded generation; no dependent-variable framework is needed.
2. Explain the normalized weighted calculation accurately, retaining IDs, variable order, units, tolerances, and old saved snapshots.
3. Cover actual wording/explanations with independent answer checks, small relevant weight domains, deterministic seeds, and margin bounds.

**Gate:** every generated question states coherent relative weights and the accepted answer matches it without implying impossible sales-share percentages.

### S10 — Preserve correct-answer precision in summaries

Suggested commit: `fix(review): preserve exact answer precision`  
Size: small; depends on S04.

1. Use the existing locale formatter with maximumFractionDigits: 12 in each summary numeric/unit branch, matching active feedback while retaining canonical values, the snapshot schema, and existing rounding/tolerance policy.
2. Update summary formatting without changing the saved answer or widening grading tolerances.
3. Test long decimals, small values, large finite values, signs, supported representative locales, and re-entry of the displayed answer.

**Gate:** AUD-08's displayed exact answer grades correctly when copied back into an equivalent question.

### S11 — Correct unitless Interview Math scoring

Suggested commit: `fix(scoring): accept required unitless answers`  
Size: medium; depends on S04.

1. Distinguish an explicitly correct unitless answer from omission of a required dimensional unit.
2. Keep validation, Interview Math evaluation, error classification, generic response score, and session totals consistent. Do not globally bypass unit penalties.
3. Test a validated unitless imported pack end-to-end plus missing/incompatible dimensional units, wrong numeric answers, partial credit, summary, and backup/restore.

**Gate:** the exact AUD-09 fixture receives full evaluation and recorded credit without weakening dimensional grading.

### S12 — Replace ambiguous generated-variant identity

Suggested commit: `fix(questions): encode generated variant identities`  
Size: medium; depends on S02, S09.

1. Use the specification's versioned, unambiguous deterministic encoding while retaining the required imported-pack namespace prefix.
2. Apply it consistently to capacity/deduplication and newly generated questions; do not rewrite historical snapshot IDs.
3. Pass queued Question objects to Try Similar and exclude equivalent question content across the whole queue as well as IDs, preventing duplicate content when legacy/new identity formats coexist.
4. Verify the collision fixture, variable-order stability, imported-pack provenance, generated pool selection, mixed-ID Try Similar queues, old draft resume, mistake retries/schedules, and old/new mixed-history backup round trips.

**Phase gate:** all numeric/content regressions and catalog/authoring checks pass. Record any new-question identity or bundled-content changes in the compatibility notes.

## Phase 4 — Make authoring and responsive interactions reliable

### S13 — Reduce bulk-authoring work per keystroke

Suggested commit: `perf(authoring): avoid rerendering unchanged editors`  
Size: medium; depends on S00; reconcile concurrent work first.

1. Start with memoized editors, stable key-based callbacks, retained references for unchanged drafts, and narrowly updated error state. Check the parent manager's callback identity too.
2. Re-run 100/200/500-question typing and add/move/duplicate/remove measurements with production output and fixed CPU settings.
3. Only if memoization misses the acceptance budget, mount fewer editor bodies. Before doing that, complete S15's state-based validation/reveal/focus requirements so unmounted required inputs cannot bypass validation.
4. Check preview invalidation, dirty-state prompts, reordering identity, locale changes, input focus, and 500-question limits after optimization.

**Gate:** performance targets in the specification pass in repeated runs with the same field correctness and authoring behavior. A lower DOM count alone is not acceptance.

### S14 — Contain long saved Fit content

Suggested commit: `fix(fit): contain long saved story text`  
Size: small; depends on S00.

1. Constrain intrinsic grid widths and wrap long saved titles/results without hiding meaningful text.
2. Test valid maximum titles and URL-like results in saved, editing, empty, and rehearsal states.
3. Verify narrow/mobile, tablet, desktop, enlarged text, German, and Arabic layouts with keyboard access intact.

**Gate:** AUD-12 no longer widens the document or overlaps adjacent panels.

### S15 — Reveal and focus all invalid builder fields

Suggested commit: `fix(authoring): reveal hidden invalid controls`  
Size: small/medium; depends on S00; coordinate with S13 and concurrent work.

1. Open every containing collapsed section for an invalid field, including Advanced pack details, then focus the first invalid field in document order.
2. If S13 unmounts editor controls, validate the complete draft in state, render the target editor, and focus after it mounts. Avoid timers that race React rendering.
3. Test Pack ID, question ID, required explanation/value fields, duplicate IDs, tolerance bounds, and multiple hidden errors by keyboard and pointer.

**Gate:** Preview never appears inert because its invalid control is hidden; native and semantic errors remain discoverable.

### S16 — Keep help hints inside every supported layout

Suggested commit: `fix(ui): contain authoring help popups`  
Size: small; depends on S00; reconcile concurrent work first.

1. Prefer guide-specific responsive alignment where sufficient. If the shared InfoHint changes, preserve its caller contract and check all left-/right-edge trigger placements.
2. Verify all five guide hints at 320/390/768/1280px, landscape, enlarged text, and RTL; include keyboard open/Escape/focus and touch activation.
3. Preserve readable wrapping, tooltip relationships, and focus visibility. Do not add a popup-positioning dependency for this bounded layout problem.

**Phase gate:** targeted browser, axe, and visual checks pass. Any lazily mounted editor path also passes the full S15 validation contract before this phase closes.

## Phase 5 — Make backup preparation responsive

### S17 — Bound synchronous backup work and avoid repeated serialization

Suggested commit: `perf(backup): yield during large backup preparation`  
Size: large; depends on S03–S05.

1. Yield between bounded record batches and parts; retain a consistent snapshot. Reuse calculated serialized data/byte sizes through bounds checks, preview, and download instead of serializing the same parts during every render.
2. Preserve canonical checksum semantics, scope rules, record boundaries, file/set limits, ordering, and all-or-nothing restore. Handle navigation, invalidation, errors, and a second preparation attempt without stale preview output.
3. Measure the valid 1,000-session/20,000-response fixture on a quiet machine; record heartbeat gaps, longest tasks, total preparation time, output sizes, and repeatability.
4. Add explicit expected-error coverage beyond 128 MiB, rather than waiting only for a success preview. Restore every produced part in the supported engines.
5. If a remaining indivisible serialization/validation operation prevents the budget, move that bounded work to a bundled same-origin worker only after profiling; include its offline inventory and fallback tests. Do not relax validation or limits to meet a performance target.

**Phase gate:** AUD-15 meets responsiveness and integrity criteria; capacity errors remain truthful and actionable.

## Phase 6 — Close remaining validation and privacy-accuracy defects

### S18 — Make questioning scores safe for accepted weights

Suggested commit: `fix(scoring): normalize questioning weights safely`  
Size: small; depends on S11.

1. Normalize positive finite weights by their largest weight before summing; use the same normalized denominator and numerator.
2. Keep ordinary relative weighting unchanged and handle existing installed extreme-weight packs, not only newly imported ones.
3. Test the two-`1e308` fixture, unequal extreme weights, no recognized questions, and ordinary fixtures with bounded finite totals.

**Gate:** accepted and already-installed valid weights always yield finite bounded scores.

### S19 — Make brainstorming coverage attainable

Suggested commit: `fix(scoring): exclude unreachable brainstorming themes`  
Size: small; depends on S18.

1. Count themes with relevant selectable ideas in the coverage denominator; distractor-only themes must not cost an unattainable point.
2. Keep selection limits, relevance penalties, and priority scoring unchanged. Apply behavior to installed packs as well as new previews.
3. Test the reported fixture, ordinary bundled prompts, duplicate themes/choices, distractor selections, and a maximum-score witness for accepted examples.

**Gate:** every supported accepted prompt can attain its intended maximum with permitted correct selections.

### S20 — Use one decimal range-cardinality calculation

Suggested commit: `fix(authoring): align decimal variant counts`  
Size: small; depends on S12.

1. Reuse the existing floating-point-safe range count helper in authoring review.
2. Preserve the bounded sampling policy and show its warning at the correct threshold.
3. Test the 729-versus-64 fixture, boundary-step values, single-value ranges, and agreement with generation/capacity.

**Gate:** AUD-18's count and sampling warning are correct without changing the documented generation contract.

### S21 — Restore native ID format validation

Suggested commit: `fix(authoring): correct browser ID validation patterns`  
Size: small; depends on S15; reconcile concurrent work first.

1. Correct the Unicode-set-compatible HTML pattern at numeric Pack ID, numeric Question ID, and questioning Pack ID.
2. Retain semantic/import validation; test native validity and actual submit behavior in Chromium, Firefox, and WebKit.
3. Cover uppercase, spaces, punctuation, empty IDs, and valid lowercase/digit/hyphen/underscore IDs with no console pattern errors.

**Gate:** AUD-19 is closed in all three engines; a jsdom-only test is insufficient evidence.

### S22 — Count actual private notes consistently

Suggested commit: `fix(privacy): count only saved note content`  
Size: small; depends on S05.

1. Omit empty notes on new writes and treat absent/undefined/blank legacy values consistently when counting.
2. Keep private-data clearing and backup scopes consistent with that definition.
3. Verify no-note/whitespace/real-note saves, clear, JSON round trip, and IndexedDB behavior.

**Phase gate:** targeted scoring/import/privacy tests pass; no compatibility or scope regression is introduced.

## Phase 7 — Complete the remaining optimizations and wording improvements

### S23 — Improve lifetime-history responsiveness without approximating metrics

Suggested commit: `perf(progress): yield during lifetime aggregation`  
Size: large; depends on S02, S05, S12, S17.

1. Profile reads, response deduplication, sorting, aggregation, and rendering separately using 0/1,000/5,000-session fixtures plus heterogeneous benchmark/review/case records.
2. Reuse existing indexed paging/scan APIs and bound/yield long computation where it improves observed stalls. Avoid duplicate full-history work and preserve stable ordering and exact totals.
3. If bounded/yielding work still misses the gate, move the existing pure aggregation to a bundled same-origin worker and return only UI-required summaries; verify cancellation, mutation consistency, offline assets, and stale-result suppression.
4. Consider persistent incremental summaries only if measured evidence shows the preceding approaches cannot meet the gate. If needed, specify rebuilding and invalidation for every write/import/reset/restore/recovery/schema/time-zone path before relying on a cache.
5. Compare all metrics/recommendations with the original pure aggregation on fixed fixtures, then repeat responsiveness measurements on the same machine/settings.

**Gate:** IMP-01's measured target passes with exact metrics and no stale results after mutation or restore; do not close the item with profiling alone.

### S24 — Clarify arithmetic negative-value controls

Suggested commit: `fix(copy): clarify negative operand settings`  
Size: small; depends on S09.

1. Label the option as controlling negative operands and explain that subtraction/mixed expressions may still produce negative results.
2. Update every locale through the repository's translation pipeline, help text, and affected accessible names/screenshots.
3. Keep generation, saved settings keys, and historical behavior unchanged; verify representative integer/decimal/mixed examples match the wording.

**Gate:** IMP-03 is understandable and translated, with no unintended scoring or settings migration.

## Phase 8 — Verify the combined result and preserve the development record

### S25 — Complete interaction, compatibility, and accessibility verification

Suggested commit: `test: cover audit remediation journeys`  
Size: medium; depends on S01–S24.

1. Ensure each finding has its corrected-behavior regression in the normal suites. Convert audit reproductions that asserted the bug; do not retain assertions that only prove the old failure still exists.
2. Run the integrated sequence: create/import a pack, practice/timeout/resume, review/retry, observe progress, back up, restore to another engine, continue offline, exercise private-data clear and explicit record recovery.
3. Repeat route/reflow coverage and populated/open/error states, including long saved content, nested validation, hints, dark mode, all header locales, RTL, keyboard, and timing accommodations. Recheck the existing contrast fix against the actual new build.
4. Run full `npm run check`, `npm run e2e:cross-browser`, and the three controlled performance fixtures. Keep the current split backup-portability projects and distinguish a test deadline from a product failure.
5. Complete the existing browser/accessibility/PWA manual matrices on available required hardware and assistive technology. Record missing real-device evidence as not run; automated engines and enlarged CSS text are not substitutes for Safari/iOS, screen readers, OS install, or true zoom.
6. Dispose of every observation in the technical specification: legacy parser sign, negative wording, formula sampling, waterfall semantics, offline prefetch, oversized backup capacity, prior contrast, prior test timeout, and build interference.

**Gate:** all 24 required ledger rows have evidence; known limitations are explicit; no waived failure is hidden inside an overall pass count.

### S26 — Integrate verified commits and close the remediation ledger

Suggested commit: `docs: record audit remediation verification`  
Size: small; depends on S25.

1. Update each item with final commit(s), test/evidence paths, compatibility impact, and status. Any remaining item needs a concrete reason and stays open; do not relabel an unimplemented optimization as complete.
2. Review the full diff for unrelated changes, new runtime dependencies/services, learner-data transmission, generated/private artifacts, and accidental reversions of concurrent work.
3. Integrate verified increments while retaining their individual history; push the resulting commits under the existing authorized workflow. Check the CI results for the actual integrated commit.
4. Record the final clean build/cache identity and tested source revision. If deployment is part of that integration workflow, run the existing hosted smoke and offline checks on the resulting origin. Do not call a preview or branch build an official release or create an unrelated release tag.
5. Close the remediation work only when the specified automated requirements are satisfied and manual evidence/remaining release gates are truthfully recorded. A later official release must separately meet RELEASE_CHECKLIST.

**Gate:** a clear commit timeline, complete requirements-to-evidence ledger, reproducible verification, and no silently dropped finding or improvement.

## Dependency and parallel-work rules

- S01 → S02 → S03/S04 → S05 is the data-integrity critical path. S06 is independent in code but belongs in the first reliability milestone.
- S07 and S09 can be developed independently of storage work; integrate them only after their own tests pass. S08 requires the final persistence behavior for its saved timeout assertions.
- S10–S12 share numeric fixtures; keep their commits separate and coordinate validator/scorer edits. S12 must finish before judging mixed old/new history in S23.
- S13 and S15 share the builder. Assign them to one owner or make serial edits; lazy mounting requires S15 first. S21 also edits that area and must reconcile concurrent fixes.
- S14/S16 are independently implementable if their shared UI contracts are respected. S17 must not race source/build changes during performance measurement.
- S23 depends on stable mutation/invalidation semantics. Do not build a persistent metric cache before those semantics are settled.
- Never run builds/tests that mutate the same export directory in parallel. Separate checkouts/output paths or serialize build ownership. Run performance measurements without other audit loads.

## Evidence and status conventions

Use `Open`, `In progress`, `Implemented; verification required`, `Verified`, and `Not applicable with evidence`. A confirmed AUD/required IMP item cannot become Not applicable merely because it is inconvenient. For each completed package record source commit, command/fixture, browser/tool versions, result, and relevant screenshot/trace or numeric measurement. Use synthetic data only. Keep raw local artifacts ignored; commit small reproducible regression tests and a concise sanitized evidence summary.

Performance thresholds and reference conditions are in the technical specification. Missed targets trigger the bounded fallback already described, or an explicitly recorded unresolved item; they must not be made to pass by increasing the threshold after the fact without a reviewed measurement-based reason.
