# Audit remediation technical specification

Date: 22 September 2026  
Status: proposed implementation contract; completion is tracked separately  
Companion: [Ordered development plan and traceability ledger](2026-09-22-remediation-plan.md)

## 1. Scope and baseline

This specification covers **AUD-01 through AUD-20**, all four additional improvements **IMP-01 through IMP-04**, and the audit's resolved/unconfirmed observations. The companion plan maps every required item to an ordered work package and verification gate.

The audit used production source `6604838`. Committed source `a54775d` is the planning baseline. It includes the question-summary contrast fix; the remaining audited application defects were unchanged at that baseline. Concurrent uncommitted changes were subsequently observed in InfoHint, the Creation Guide, both question builders, and their tests. AUD-11/13/14/19 require reconciliation and acceptance testing before additional implementation; they are not presumed resolved.

These documents are review artifacts alongside `BUG_AUDIT_2026-09-22.md` and its synthetic evidence in the ignored audit directory. They restate the requirements so implementation does not depend on raw browser traces. S00 promotes the agreed, sanitized planning documents and necessary synthetic regressions into the repository's durable documentation/test locations. Source paths below are repository-relative for portability.

### Preserved product contracts

- Generation, parsing, evaluation, scoring, recommendations, and recovery remain deterministic and browser-local. No AI runtime, external practice APIs, server, account, or progress synchronization is introduced.
- Preserve the static Next.js application, strict TypeScript, React, IndexedDB, and installable/offline PWA. Prefer existing helpers, native transactions/CSS, Vitest, and Playwright; no new package is expected.
- Preserve existing approved analytics boundaries. Never transmit learner records, private text, imported packs, recovery files, or performance-fixture contents.
- Historical completed results and question snapshots remain as recorded. Future content/grading corrections must not silently regrade old attempts or alter benchmark comparisons.
- Preserve supported content-pack v2/v3 and progress/complete-backup formats. The designs below do not require a public format bump.
- Do not solve performance defects by reducing the 500-question limit, hiding history, weakening validation, increasing backup limits, or disabling meaningful checks.

## 2. Explicit behavior decisions

| Topic | Required decision |
|---|---|
| Conflicting drill writes | Reject stale writes atomically, retain local work, and offer explicit reload or a separate attempt; never silently merge answers |
| Whole-session time | Continuous wall-clock time including feedback; per-question timing still pauses during recorded feedback |
| Profile save | Lock editable profile controls during saving and allow only one in-flight write |
| New numeric-answer length | 4,096 UTF-16 code units; oversized input receives an editable error, not a wrong-answer record |
| Existing saved strings | Retain the 100,000-code-unit storage/backup envelope and existing tighter field limits; keep previously legal history exportable |
| Invalid history | Diagnose before JSON normalization; offer a lossless local diagnostic archive and explicitly confirmed scoped recovery |
| Weighted-margin content | Describe existing generated values as relative sales ratios, preserving formulas and seed behavior |
| Correct-answer display | Match existing active-feedback precision with the locale formatter and up to 12 fractional digits; retain stored answers/tolerances |
| Generated identity | Forward-only versioned variant encoding, preserving pack namespace and historical snapshot IDs |
| Extreme positive weights | Normalize safely at runtime, preserving accepted installed packs |
| Distractor-only brainstorming themes | Keep them valid but exclude them from attainable coverage's denominator |
| Performance | Authoring starts with stable rendering, then lazy editor bodies with full state validation if needed. Backup/history computation starts with bounded yielding/reuse, then requires a bundled same-origin worker if the measured gate still fails |
| Negative-number wording | “Include negative starting numbers”; help: “Answers may still be negative when this is off.” Keep generation and settings keys unchanged |

These are implementation decisions, not claims that changes have shipped. No unresolved user preference blocks the scoped work. Record any departure and its acceptance evidence in the ledger.

## 3. Persistence and recovery

### AUD-01 — Atomic session consistency and lifecycle protection

**Failure:** A stale tab can replace a completed session with a draft while its response store remains completed. Existing completion checks also read outside the write transaction; a get-then-put guard still races.

**Required design:**

1. Extend existing AppStorage with one narrow conditional read/modify/write operation. Declare stores/keys; read within one IndexedDB readwrite transaction; run a synchronous decision callback; enqueue its mutations before leaving the request callback. Return committed, idempotent/unchanged, or conflict outcomes. Never await timers, hashing, network, or user interaction inside this callback.
2. Store lifecycle generation and per-session revisions in a dedicated internal coordination store, outside exported learner stores and backup inventories. Use database version 10 if no intervening migration has consumed it; otherwise use the next unused version. Add metadata without modifying learner rows. Missing legacy revision means zero; expected-absent is distinct from an existing revision-zero session.
3. Load the session and its revision/generation consistently. Recheck draft key and incomplete state after indexed draft discovery. Every draft/completion transaction compares the expected token and current session before writing.
4. Calculate response, mistake, retry-schedule, and applicable benchmark-result mutations from current rows inside the completion transaction. With a matching lifecycle generation, identical semantic completion retries are idempotent; different completed payloads conflict. Compare actual answers/questions/timing/score, not incidental retry-time persistence timestamps. Review counters advance once per committed review.
5. Serialize each tab's save queue and advance its token only after its own acknowledged write. On conflict, stop autosave and retain local answers. Offer to view the saved attempt or explicitly keep this work as a separate attempt. Do not silently refresh the token to force a stale write through. An explicitly copied timed attempt retains real timing.
6. Carry the editing lifecycle generation through delayed mutations, including callers that later create another storage adapter. Reset, restore, private-data clear, and scoped recovery advance it atomically. Old work either commits before that mutation or fails afterward; it cannot resurrect cleared data. Broadcast invalidation remains prompt UI feedback, not the correctness lock.
7. Preserve coordination metadata through learner-data clearing; remove obsolete session revisions with their sessions; establish fresh tokens on restore. Derive private-data preservation from current rows inside the replacement transaction. LocalStorage preferences cannot share an IndexedDB transaction, so retain explicit error/partial-success handling at that existing boundary.

**Compatibility:** No internal tokens in backups. Old records/exports stay usable. Connections close on versionchange; obsolete code cannot reopen the old schema and bypass protection. Do not automatically merge/regrade history.

**Targets:** `src/lib/storage/appStorageTypes.ts`, `indexedDbAppStorage.ts`, `src/tests/unit/memoryAppStorage.ts`, drill persistence/active session, benchmark persistence, reset/restore callers. Extend storage, drill persistence, invalidation/clear, backup-storage, migration, and real two-tab tests.

**Accept:** Both tab orders; divergent drafts; simultaneous completions; identical retry; two reviews of one mistake; benchmark retry; transaction abort; reset/restore/recovery while a save waits; unavailable invalidation transport; stale UI creating a new adapter; legacy resume. No partial writes, false saved notices, duplicate review advancement, lost acknowledged results, or resurrection.

### AUD-02/AUD-03 — Exportable write boundaries

Use shared pure resource checks rather than a whole-history export validator on each save.

- New numeric answers are capped at 4,096 code units in drill, exhibit, and sizing entry/submission paths. Reject oversized paste/submit with localized feedback and preserve an editable draft. HTML constraints supplement domain validation; do not silently submit a clipped answer.
- Retain the 100,000-code-unit storage/export envelope. Otherwise-valid old answers above the new input cap remain exportable. Other free text uses existing tighter limits or the envelope. Inventory sizing notes, target firms, Fit content, full-case drafts, and direct programmatic writers.
- A successful parser result is finite after division, sign, scale, and percentage transformations. Overflow uses the established invalid-number result. A bounded malformed answer may still be recorded as incorrect, with normalized numeric value absent. Never store Infinity/NaN or substitute null for an optional normalized number.
- Check proposed persisted values for non-finite numbers and resource-limit violations before committing, while preserving allowed undefined optional fields. Do not clamp answers, truncate history, or normalize corrupt data into apparently valid records.
- Diagnose export incompatibility by store, record ID, field path, and reason before JSON conversion erases the original value. Display bounded types/lengths rather than whole private answers. Recommend Complete Backup for Standard capacity overflow; route invalid records to recovery.

**Targets/tests:** Parser, validation, submission, numeric inputs/persistence, shared resource guard, Standard/Complete export, settings. Cover 4,095/4,096/4,097; legacy 99,999/100,000/100,001; UTF-16 lengths; 308 nines plus `b`; signed/fraction overflow; finite scales; direct persistence bypass; both backup formats.

The legacy no-locale mixed-separator sign observation belongs in the parser change: preserve the extracted sign exactly once during recursion. Verify `$-1.234,56`, `1/-1.234,56`, positive/parenthesized equivalents, and explicit locale policies. This remains a library edge case, not a retrospectively claimed UI defect.

### IMP-02 — Scoped recovery of incompatible records

Add recovery to existing local-data settings, reached from export diagnostics. Flow: diagnose → preview selected attempt and relationship counts → optional original-data download → explicit confirmation → atomic recovery → refresh/retry backup. Cancel changes nothing. Changed targets/generation require a fresh preview and confirmation. Download failure never triggers deletion. Removal without an archive requires an explicit choice acknowledging the loss.

The initial action archives and removes the incompatible attempt and only owned dependents. A selected optional bad note may be removed as a field while preserving its attempt/score. Do not silently regrade, truncate, auto-clean on export, or filter records out of a supposedly complete export.

For session S, the closure is S; responses with `sessionId === S`; benchmark results for S; mistakes owned through S or those response IDs; and schedules for those mistakes. Match stored relationships exactly, never broad ID prefixes. Preserve independent later retries, other attempts, settings, packs, profiles, stories, and unrelated notes. Removing a retry attempt cannot infer how to reverse aggregate notebook counters because the data is not an event log; explain that limitation instead of fabricating a rollback.

Inspect relationships before enabling standalone exhibit/sizing/case-record recovery. Compute/verify the closure in the deletion transaction so concurrent completion cannot create orphan children. Ambiguous ownership gets a diagnostic, not broad deletion. Invalidate prepared exports and summary views after successful commit.

**Recovery file:** Separately identify/version a diagnostic envelope with an unambiguous tagged representation preserving undefined and non-finite values. It is a local cleartext recovery archive, not an ordinary restorable Complete Backup. Normal backup import must not interpret its tags. A quarantine database, universal reimporter, and historical-grade editor are not required.

**Accept:** Actual oversized/Infinity fixtures recover; originals can be archived losslessly; abort preserves every original row; unrelated-store sentinels remain identical; dependency counts match the preview; all remaining records export/restore normally. Residual invalid items are explicit.

### AUD-20 — Actual saved-note semantics

Use one predicate: a string whose trimmed length is nonzero. Omit empty notes on new sizing writes. Read/count legacy absent/undefined/empty/whitespace values consistently while preserving non-empty original text. Reuse the predicate in personal-data counts, backup summaries, and private-data preservation during restore. Clearing may remove every note property while counting only actual private content.

No public migration is needed. Test every note state, with/without private backup scope, clear, and JSON/IndexedDB round trip. Scores and unrelated attempts remain unchanged.

## 4. Offline and practice flows

### AUD-04 — Best-effort runtime caching

In `public/sw.js`, separate fetch success from optional cache open/write failure in cache-first and stale-while-revalidate. Return the successful original response even if caching its clone fails. Catch background errors and keep the fetch event alive where required. Preserve cached-hit preference, cacheability, request boundaries, genuine offline fallback, and all-or-nothing installation.

Extend worker behavior/offline/failed-upgrade tests with temporary fault injection. A network HTTP 200 sample remains HTTP 200 with intact headers/body; a true uncached offline miss retains its intended fallback; failed update installation keeps the previous working app.

### AUD-05 — Single-flight profile save

Disable a native fieldset containing editable profile controls and submit while saving, plus a handler guard against a second submission. Keep roadmap/status readable and mark the form busy. Release the lock on every success/failure path; preserve submitted values on failure; keep existing success normalization. Ignore stale completion after unmount/data invalidation.

Extend `prepPlanView.test.tsx` with deferred storage and verify disabled keyboard/pointer behavior in a browser. Require one write, preserved values on failure, and usable retry. Synthetic events that bypass disabled-control behavior are not the acceptance oracle.

### AUD-06 — Whole-session deadline during feedback

Reuse the absolute session deadline and existing timer helpers. Recompute from actual time on the existing tick; do not count ticks. Session feedback consumes time and the clock remains visible/active while unanswered questions remain. Per-question feedback still pauses its clock; untimed modes never expire.

At expiry, preserve recorded responses and finalize each unanswered question once. During feedback the current-question pointer already refers to the next unseen question, while input state may belong to the previous answer. Unseen timeout responses therefore use blank unit/equation/interpretation selections and zero solve time. A presented unanswered question uses its actual state/time. Final-answer feedback must not create new timeouts or alter completed correct answers.

Next/Retry Similar checks use fresh time; resume/backgrounding catches up to the same deadline. Announce expiry meaningfully without announcing every display tick. Explain that total-session time includes feedback.

Test just-before/exactly-at/after deadline, accommodations, instant/retry/end feedback, final feedback, submit/expiry races, untimed/per-question modes, resume, saved summary, and the original production-browser five-second case.

## 5. Content, numeric display, scoring, and identity

### AUD-07 — Coherent relative sales weights

Change `weighted_average_beginner_003` and `_010` in `businessTemplates.ts` to describe sales ratios `{shareA}:{shareB}` and `{shareA}:{shareB}:{shareC}`. Margins remain percentages. Explain dividing the weighted margin sum by total relative sales weight. Keep IDs, variable keys/order/distribution, units, tolerances, formulas, and seeded generation.

The 60:75 and 40:50:30 examples are then coherent. Do not introduce dependent-variable support just to fix these prompts. Old saved snapshots remain unchanged. Enumerate the small relevant weight domains and independently verify answers and min/max-margin bounds; actual prompt/explanation text must not call relative weights percentages of one sales total.

### AUD-08 — Precise localized summary answers

Use the existing locale formatter with `maximumFractionDigits: 12` in every numeric branch of summary answer-with-unit formatting, matching active feedback. Preserve currency/percentage/unit handling, localized digits/grouping, and no gratuitous trailing zeros. Do not change stored answers, grading tolerance, or the summary schema.

Render the actual displayed value and grade it against the original specification for `252907.321234`, small/negative decimals, currency/percentage, integers, and en/de/fr/ar/hi. Test the complete text, not a substring. If another supported case still fails display-to-validator round trip, fix that shared formatting/scaling boundary before closure; no arbitrary-precision library is prescribed.

### AUD-09 — Explicit unitless compatibility

After rejecting conflicting typed/selected units, expected `none` plus explicitly selected `none` is compatible. An omitted choice remains omitted; `none` does not satisfy a dimensional unit. Preserve ordinary-drill permissiveness and existing scale/percentage conventions.

Fix unit status in `validateAnswer`, then test Interview Math evaluation → submission → generic score → session total. Do not remove the generic incorrect/`none` early-return guard just to award the faulty 85/100 evaluation. The audited fully correct imported question gets 100 evaluation and recorded points. Wrong/missing dimensional units retain intended penalties and meaningful errors. No historical regrading.

### AUD-10 — Unambiguous deterministic variant IDs

For new generated questions use `<templateId>:v2:<JSON of sorted [variableName, numericValue] pairs>`. Sort keys by deterministic code-unit ordering; encode tuples rather than ambiguous hyphen fragments. Equivalent −0/0 represents one numeric variant. Retain `question-pack:<packId>:` because provenance depends on that prefix. Do not double-namespace standalone packs, hide the prefix behind a global hash, add a registry, or apply authored-ID form regexes to internal IDs.

Keep old snapshot IDs, question/response references, notebook IDs, and schedule links unchanged. Old drafts/retries use their stored snapshots; no alias migration is needed.

Try Similar must exclude equivalent content across the entire queued Question list as well as IDs: a resumed old-format queue can otherwise duplicate a new-format question under another ID. Reuse current content-comparison logic; do not deduplicate with ambiguous legacy aliases.

Test the `a-x-1`/`a` collision; strict/permissive capacity; key insertion-order independence; signs/decimals; repeated seeds; pack provenance; old resume/review/schedules; mixed-ID queues; and old/new backup round trips. Preserve authentic legacy fixtures rather than regenerating them with the new encoder.

### AUD-16 — Finite weighted questioning scores

Divide each positive finite intent weight by the maximum weight before accumulating earned/possible coverage. Use the same normalized numerator/denominator and existing score scaling. Reject non-finite direct-runtime weights through the prompt validator. Keep accepted large-weight installed packs/backups usable; do not add an arbitrary incompatible weight cap.

Test full/partial/no coverage for two `1e308` weights, tiny positives, unequal extremes, ordinary ratios, duplicate recognition, and direct NaN/Infinity/zero/negative inputs. Scores stay finite/bounded. Existing stored scores remain historical; invalid stored values use recovery.

### AUD-17 — Attainable brainstorming coverage

Count only themes containing relevant selectable ideas in possible coverage. Distractor-only themes remain legal. Preserve relevance penalties, priorities, selection limits, and maximum score. The correction applies to existing installed packs without a stricter import schema.

Test the Energy/People fixture reaching 10/10, several distractor-only themes, full correct choices/priorities, off-brief choices, duplicates/unknown IDs, and invalid all-irrelevant content. Cover the shared full-case scorer. Old 9/10 results stay unchanged.

### AUD-18 — Decimal review capacity

Use `rangeStepCount(min, max, step) + 1` from `src/lib/math/steppedRange.ts`; the helper counts intervals, so include the extra endpoint. Preserve default steps, explicit arrays, and safe multiplication bounds.

Six 0.1–0.3-by-0.1 ranges must report 729 and show the above-256 sampling warning. Test exactly/above 256, single-value/integer/non-divisible ranges, and generator/capacity agreement. Keep the bounded sampling policy itself.

## 6. Authoring, responsive layout, and guidance

### AUD-11 — Responsive bulk numeric authoring

First retain unchanged draft references, memoize unchanged editors, and pass stable key-based callbacks. Check the whole callback chain through QuestionPackManager. Preserve current values in move/remove/duplicate handlers and correctly invalidate previous previews. Avoid clearing all row errors on every keystroke. Use stable draft keys, not positions/editable IDs.

Keep mounted native controls if this meets the budget. If not, mount expensive bodies only while open, retaining complete draft state outside the bodies. That fallback must ship with AUD-13's state-based validation and post-mount focus for every required field. No virtualization dependency or reduced limit by default.

Test editing item 500, opening/closing, reorder/duplicate/remove, all fields, unique IDs, preview/export, locale changes, focus, dirty navigation guards, and item limits. DOM/render counts aid diagnosis but do not replace interaction evidence.

### AUD-12 — Long Fit stories

Constrain intrinsic grid widths and wrap unbroken saved text without silently hiding content. Cover saved/edit/rehearsal states with allowed 80-character titles, long URL results, paragraphs, and mixed-language text.

At 320/375/390/768/1280/1440px and enlarged text, document width stays within viewport +1px rounding, panels do not overlap, and all text/controls remain reachable. Include German/Arabic and keyboard use. Extend existing Fit/maximum-content coverage.

### AUD-13/AUD-19 — Reliable authoring validation

Reveal every ancestor disclosure of an invalid field, including Advanced details, and focus the first actionable error. Preserve duplicate-ID and tolerance feedback. If controls are lazily unmounted, validate all draft state before preview, open/render the target editor, and focus after mount. Hidden/unmounted inputs cannot bypass required validation.

Correct literal hyphen escaping for native HTML patterns in numeric Pack ID, numeric Question ID, and questioning Pack ID. Grammar remains lowercase letter/digit first, followed by lowercase letters/digits/underscore/hyphen, with existing required/length constraints. Keep downstream pack validation.

In Chromium/Firefox/WebKit: valid IDs pass; uppercase/space/slash/punctuation fails native validity; empty fails required; no pattern syntax errors. Test real submit/focus in nested/collapsed sections; jsdom alone is insufficient. Reconcile concurrent patches.

### AUD-14 — Contained mobile help

Preserve shared InfoHint start/end/center semantics. End-align all five Creation Guide hints in its trailing-trigger mobile cards and retain current per-index desktop placement. Prefer a guide-only responsive override or small optional mobile alignment to globally redefining start alignment.

Keep width ≤256px and ≤viewport−32px, with wrapping. If actual edge cases remain, clamp the existing popup horizontally on opening/resize; preserve center/RTL transforms. Do not add a popup framework. Preserve focus opening, Escape, outside dismissal, hover-content access, and touch pinning.

Require all guide hints at 320/390/768/1280px, landscape, enlarged text, and RTL to fit without page overflow. Also test shared left-edge/start and right-edge/end placements in LTR/RTL. Combine geometry, keyboard/state, and accessibility evidence.

### IMP-03 — Negative starting-number wording

Use the decision-table wording for visible/accessibility text and all ten locales. Keep `arithmeticAllowNegatives`, URL/preset/settings encoding, and generator behavior. A positive-starting-number subtraction example with a negative answer must agree with the help text. Run locale synchronization/checks and narrow localized settings tests.

## 7. Performance targets and implementation gates

### Measurement protocol

Use clean production output from a recorded revision, pinned toolchain, recorded browser/OS/hardware, and synthetic isolated profiles. Stop other heavy suites. Run a warm-up and at least five measured trials at native and 4× Chromium CPU slowdown. Record medians, relevant p95 interaction/heartbeat latency, longest task, total blocking time, elapsed time, fixture size, and environment. Five trials are a bounded engineering sample, not a universal-device guarantee.

Keep functional CI assertions separate from dedicated reproducible timing probes. Compare with a fresh same-machine baseline, not the original parallel-load audit timings. The following are initial reference-environment acceptance budgets; changes require explicit measurement-based rationale in the ledger.

| Workload | Acceptance |
|---|---|
| Builder, 100/200 questions | Median 20-character entry with requested 20ms spacing at 4× CPU ≤2s; p95 per-key interaction ≤200ms |
| Builder, 500 questions | Same entry ≤3s; p95 per-key interaction ≤200ms; no typing/add/move/duplicate/remove operation causes a ≥1s UI task |
| Backup, 1,000 sessions/20,000 responses | Busy status and interaction/cancellation processed within 250ms native/500ms throttled; attributable UI tasks ≤200ms native/500ms throttled; no multi-second frame gap |
| Backup elapsed cost | Median normal-fixture time ≤120% of fresh baseline; output/scopes/checksums remain valid and restorable |
| History, 5,000 sessions/100,000 responses | UI tasks ≤200ms native/500ms throttled; total blocking time reduced ≥50%; median readiness ≤110% of baseline; exact summary parity |
| Small histories | Investigate median readiness regression >10% before acceptance, with sufficient repetitions to separate noise |

Near-limit supported backup sets and single large valid records must remain responsive/intact, without an arbitrary short wall-clock guarantee. Do not meet a budget by changing the fixture, weakening validation, or reducing supported limits.

### AUD-15 — Responsive backup preparation

Take a consistent store snapshot. Yield between bounded batches/parts; about 8ms work plus a record cap is an initial tuning point. Microtask-only yielding does not permit painting. Reuse prepared serialized files/Blobs, filenames, sizes, and summaries through bounds checks, React preview, and download; do not repeatedly serialize every part during rendering.

Retain canonical checksums, deterministic ordering, privacy scopes, intact records, 40 MiB/file, 128 MiB/set, 64 parts, and atomic restore. Scope changes, invalidation, navigation, and superseding preparation invalidate old output/confirmation; ignore late results. Provide busy/cancel/error/retry states without changing learner data.

If indivisible JSON/canonicalization/validation still misses the gate, use a bundled same-origin worker following the existing worker approach. It can read a consistent IndexedDB snapshot and run shared pure logic, returning Blobs/small summaries rather than copying full history through the UI thread. Pass only selected scopes/allowlisted preferences; verify lifecycle generation before preview; terminate canceled/superseded work. Include worker assets in offline inventory and retain CSP/bundle/privacy contracts. No duplicate handwritten validators or external service.

Extend backup/Set/Storage units, scope invalidation/cancellation/error tests, cross-engine restore, and worker/offline startup if used. Use the supported approximately 36 MB fixture, a near-limit set, and a large record. Explicitly capture >128 MiB capacity errors. Missing/duplicate/mixed/corrupted parts still fail before restore writes.

### IMP-01 — Lifetime-history responsiveness

Preserve exact lifetime/category/skill/error metrics, response deduplication, best-score tie-breaks, time-zone streaks, review counts, and accommodation eligibility. Never cap history or approximate totals.

Profile reads/transfer, deduplication, repeated passes/sorts, bests, and React delivery separately. Reuse paging/scan/accumulators where beneficial and yield bounded computation outside active database transactions. Detect mutations during independently paged reads and discard/restart, or retain a consistent-read strategy.

If transfer/aggregation still misses the UI budget, run existing pure aggregation in a same-origin worker and return needed summaries. Reuse a small existing transport approach, not a generic job framework. Persistent incremental summaries are a last resort requiring invalidation/rebuild on every save/import/reset/recovery/schema/time-zone change before use.

Compare deeply with the correct reference on homogeneous and heterogeneous fixtures, embedded/separate duplicates, legacy records/IDs, reviews, benchmark accommodations, and DST/time-zone boundaries. Ignore stale results after mutation/unmount. Profiling alone does not complete IMP-01; record measured improvement.

## 8. Compatibility, regression coverage, and rollout

| Surface | Required compatibility |
|---|---|
| IndexedDB v9 → next version | Add coordination metadata; preserve learner rows/indexes; recover from blocked/interrupted upgrade; close old connections |
| Historical fixtures | Retain authentic supported database/export migration fixtures; do not regenerate old fixtures with new code |
| Backups | No public format bump for internal tokens; preserve standard/complete capacity and private scope behavior |
| New input vs old data | 4,096 applies to new submissions; otherwise-valid existing strings through 100,000 remain exportable |
| Generated IDs | New IDs for new questions only; old snapshots/references remain opaque and usable |
| Content/scoring corrections | Correct future attempts; do not silently rewrite completed results |
| Installed qualitative packs | Preserve large finite weights and distractor-only themes through scorer corrections |
| Offline update | Optional runtime caching changes do not weaken install atomicity; any new worker works offline |
| Rollback | Prefer tested forward fixes; do not deploy v9-expecting code after a newer schema opens. Test any restore-based recovery; never delete the database as rollback |

### IMP-04 — Regression coverage ships with each fix

Add focused tests to changed parser/scorer/generator/validator/recommendation/storage paths as required by AGENTS. Promote minimal synthetic audit repros into existing suites and assert corrected behavior; do not retain tests that pass only because the bug still occurs.

The integrated browser set includes two-tab conflicts, pending/failed saves, feedback expiry, long saved text, open hints, hidden validation, populated bulk authoring, invalid-history recovery, backup/restore, reset invalidation, and offline continuation. Reuse stable fixtures across functional/keyboard/axe/geometry tests where useful.

Run `npm run check` against the actual build and `npm run e2e:cross-browser` with the current split portability projects. Preserve authoring/catalog/i18n checks and budgets: 500 KiB largest JS chunk, 480 KiB Brotli route JS, 6 MiB install precache. Inspect intentional visual changes before updating baselines.

Follow existing BROWSER_SUPPORT, ACCESSIBILITY_RELEASE_GATE, and RELEASE_CHECKLIST for real touch/keyboards, true zoom/text spacing/forced colors, screen readers, OS suspend/install, and deployed-origin offline/update behavior. Record unavailable evidence as not run. Axe success is not WCAG conformance certification.

### Rollout and completion

Use the companion's focused commits and dependencies, preserving concurrent work and exclusive build-output ownership. Preserve incremental GitHub history when implementation begins. These planning artifacts do not constitute a release or deployment.

Each required item needs behavior, compatibility, and applicable performance/accessibility evidence on the integrated revision. Merging several items into one change cannot erase their IDs. Track unresolved manual release evidence separately from implemented product fixes.

## 9. Disposition of remaining audit observations

| Observation | Required disposition |
|---|---|
| Collapsed-question contrast | Existing `a54775d` fix; verify actual built light/dark/collapsed/expanded/hover/focus states in S00/S25; no duplicate implementation |
| Initial cross-browser backup timeout | Audit rerun passed; retain split target-browser projects and rerun in S25; do not call it backup corruption |
| Root build/export interference | Superseded by isolated build; S00/S25 serialize ownership of output |
| No-locale mixed-separator sign | Focused library regression/fix in S04 if reproduced; do not invent UI reachability |
| Negative-values ambiguity | Required IMP-03/S24; preserve generation and clarify starting numbers versus answers |
| Bounded formula sampling | Retain documented bound/runtime handling; fix AUD-18 warning in S20; verify rather than introduce exhaustive validation |
| Waterfall running-total semantics | Preserve documented v2 contract and author guidance; check representative samples in S25 |
| Flattened offline-prefetch anomaly | No user-visible failure confirmed; verify normal offline links in S25; investigate only if reproduced |
| 5,000-session backup harness timeout | Estimated export exceeded supported capacity; S17 captures the expected capacity error |
| Physical devices, assistive technology, hosting | S25 uses existing manual matrices and records exact gaps; Playwright is not physical-device evidence |
| Dependency advisory result | Audit reported zero at its execution time; retain final integration security checks without unrelated dependency churn |

All 20 findings and four improvements are mandatory ledger rows. Other observations have explicit correction, verification, or retain-as-designed outcomes; none is silently dropped.
