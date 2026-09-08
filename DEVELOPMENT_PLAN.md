# Audit remediation development plan

Baseline: `9d25cbe`. Development branch: `codex/audit-remediation`.

Implement all 30 findings and six improvements in [BUG_AUDIT.md](BUG_AUDIT.md), preserve deterministic browser-only behavior and local privacy, and record tested increments in Git history. No runtime services or new dependencies are planned. Audit reproduction scripts are evidence, not regression tests: new tests must assert the intended correct behavior.

## Delivery sequence

Independent implementation can run in parallel. Each completed batch is reviewed, tested, committed with its audit IDs, and pushed separately. Shared-file work is serialized. The ledger below records completion and validation; commit messages provide the immutable timeline.

| Step | Scope | Status |
|---|---|---|
| 01 | Publish the portable audit and this plan | Complete |
| 02 | Safe imports, private-data scope, reset/restore invalidation | Complete |
| 03 | Fit Story editing, save consistency, rehearsal timing | Complete |
| 04 | Numeric parser, units, formula grammar and precedence | Complete |
| 05 | Offline upgrade readiness and complete asset precaching | Pending |
| 06 | Drill completion recovery, per-answer timing and resumed deadlines | Complete |
| 07 | Exhibit evidence, answer precision, scoring and stale-save protection | Complete |
| 08 | Question generation, content units, formula links and ROI wording | Complete |
| 09 | Recoverable large backups, pack-version drafts and storage failure recovery | Pending |
| 10 | Difficulty-correct personal bests and duplicate-question scoring | Pending |
| 11 | Save-only retries, full-case local resume, prep-plan clarification | Pending |
| 12 | Independent invariant tests and smaller browser smoke journeys | Pending |
| 13 | Integrated verification, visual review and final repair ledger | Pending |

### 01 — Establish the development record

- Make the audit suitable for GitHub by replacing workstation-specific paths with repository links.
- Record every bug/improvement against a delivery step, with explicit acceptance criteria.
- Push the planning commit before implementation commits.

### 02 — Protect local data during replacement (BUG-01, 02, 09, 10, 27)

- Bind import validation and confirmation to the selected file; reject stale async results/errors and prevent replacement during a restore.
- Preserve private records/fields excluded by a standard export, including matching notes.
- Bind prepared backup content and download confirmation to the currently selected scopes.
- Use atomic reset mutations, invalidate stale tabs/views after successful reset/restore, and refresh clear-data inventories.
- Exercise slow reads, out-of-order file completion, scope changes, failed transactions, and stale writers.

### 03 — Repair Fit practice (BUG-04, 12, 17)

- Stabilize textarea component identity and preserve keyboard focus/caret while typing.
- Protect newer edits from completion of an older save.
- Derive rehearsal duration/deadlines from elapsed wall time, including background/sleep and manual finish.
- Verify standard/accommodated/untimed behavior and save failures.

### 04 — Repair shared numeric contracts (BUG-14, 21, 22, 28)

- Accept the monetary scale syntax actually requested by Interview Math without accepting incompatible units.
- Round-trip supported locale digits, grouping and numeric direction marks while retaining malformed-input rejection.
- Enforce operand/operator grammar and nonempty parentheses in formula compilation.
- Correct unary-minus/exponent precedence, including negative exponents and chained powers.
- Cover imported template validation and other callers of the shared evaluator.

### 05 — Preserve offline readiness across updates (BUG-03)

- Generate the required route dependency inventory from the static build, including lazy practice assets.
- Cache the complete runnable generation before marking it ready; delete earlier caches only after the new generation is usable.
- Preserve same-origin caching, fail-closed installation and existing waiting-worker update behavior.
- Reconcile performance budgets with the actual complete offline payload using measured output.
- Exercise two generations, failure during installation, and offline reopen with hydrated controls/answer saving.

### 06 — Make drill progress and timing recoverable (BUG-05, 13, 16)

- Restore a fully answered draft into a recoverable completion path.
- Separate the session deadline from each question's solve time for submit, skip and timeout.
- Persist active question timing and restore the appropriate deadline without granting fresh time.
- Keep legacy drafts readable; verify just-before/after-expiry reload and final-answer reload.
- Check completion-save retry bookkeeping for idempotence after a later save stage fails.

### 07 — Make exhibit and sizing feedback trustworthy (BUG-06, 08, 15, 23, 24)

- Show all figures required to solve chart questions, using existing table/value components.
- Correct the conversion-gap answer to whole percentage points and validate it independently from its answer key.
- Preserve required precision in source evidence and solutions while retaining compact chart axes.
- Ignore stale persistence completions after switching questions; examine sibling practice flows with the same pattern.
- Keep fractional market-sizing scores within their declared maxima and preserve perfect-work credit.
- Review responsive/RTL/dark layouts and accessibility after the evidence changes.

### 08 — Correct generated practice and reference links (BUG-07, 20, 25, 26, 29; IMP-01)

- Apply one precision contract across decimal arithmetic, instructions, grading and explanations.
- Deduplicate custom questions by meaningful expression identity and align generation capacity.
- Resolve stepped decimal endpoints consistently in generation, capacity and validation.
- Correct beginner percentage-point answer units.
- Route CAGR/Rule of 72 links into existing matching templates and verify generated skills.
- Clarify total proceeds versus net gain in ROI material without an unintended numerical change.

### 09 — Keep backups and installed content recoverable (BUG-11, 18)

- Provide a supported self-restorable path for history beyond current record limits; retain bounded untrusted-input validation and avoid silently deleting history.
- Reject an export that cannot be restored before describing the download as successful; explain any supported partitioning/recovery behavior.
- Scope direct-pack drafts by content version/import identity, including replacement at the same version.
- Verify adapter cleanup after failed opens and reopening after version changes.
- Verify partial clearing still invalidates stale writers when preference cleanup fails.

### 10 — Align progress with actual work (BUG-19, 30)

- Attribute skill/category bests to each question's difficulty in mixed sessions, with a defensible legacy fallback.
- Detect exact duplicate questioning text before intent-recognition filtering.
- Verify Daily Workout/review mixes and both standalone/full-case questioning scoring.

### 11 — Improve recovery and clarify intent (IMP-02, 03, 06)

- Preserve completed attempt snapshots/IDs across save failures and offer a save-only retry in affected case modules.
- Add optional IndexedDB resume for long full-case sessions, with explicit resume/discard behavior, content identity, draft validation, and appropriate privacy/export/clear handling.
- Ensure draft storage never changes completed-history counts or transmits data.
- Explain that prep-plan target firms are reference notes rather than inputs to prioritization.
- Keep translations and the local-data inventory consistent with any new UI/storage behavior.

### 12 — Close the testing gaps (IMP-04, 05)

- Add independent mathematical/content expectations, displayed-answer round trips, visible evidence assertions, locale coverage, clock jumps and async-order checks alongside each repair.
- Split long multi-route smoke tests into focused journeys with unchanged meaningful assertions; avoid simply increasing global timeouts.
- Verify failure recovery using stable attempt IDs and local-only synthetic data.

### 13 — Verify and publish completion

- Run authoring/version/identity/Action-pin checks, lint, strict TypeScript and the complete unit suite.
- Build and validate the static release output, offline dependency inventory and performance budgets.
- Run Chromium journeys plus Firefox/WebKit/backup-portability coverage.
- Inspect intentional visual changes before updating only the affected baselines.
- Review the combined diff, resolve regressions, update every audit status with its test evidence, and push the final validation commit.

## Acceptance and commit ledger

All 30 BUG IDs and six IMP IDs must have an implemented outcome and verification evidence before completion. Test-environment failures are reported separately from product regressions. This branch records development; production deployment/merging is not part of an incremental development push.

| Batch | Changes and audit IDs | Validation | Commit |
|---|---|---|---|
| Planning | Portable audit and sequenced implementation plan | Baseline audit: 1,069 unit tests; 143 Chromium scenarios; all 37 additional browser scenarios passed at least once | `20c978f` |

| Fit practice | BUG-04, BUG-12, BUG-17: stable fields, protected pending saves, elapsed-time rehearsal clock | 23 focused Fit tests passed; root diff review | `12750ef` |
| Numeric contracts | BUG-14, BUG-21, BUG-22, BUG-28: currency scale metadata, locale grouping, operator grammar and precedence | 109 focused tests and strict TypeScript passed; root diff review | `f4cdb9a` |
| Local data safety | BUG-01, BUG-02, BUG-09, BUG-10, BUG-27 plus adapter recovery: stale read guards, private preservation, atomic resets, invalidation and fresh inventories | 55 focused tests and strict TypeScript passed; root diff review | `207916c` |
| Drill recovery | BUG-05, BUG-13, BUG-16: recover final answers, preserve active deadlines, separate solve times, make completion retries idempotent | 40 focused tests passed, including clock jumps, final-answer reload and repeated review persistence | `ef15a1b` |
| Question correctness | BUG-07, BUG-20, BUG-25, BUG-26, BUG-29, IMP-01: exact decimal arithmetic, coherent units, deduplicated expressions, stepped endpoints, correct practice links and ROI wording | 130 focused tests passed; independent arithmetic, evidence and locale expectations; root diff review | `17593d9` |
| Exhibits and sizing | BUG-06, BUG-08, BUG-15, BUG-23, BUG-24: complete visible evidence, precise values, correct point scale, bounded fractional scores and stale-save guards | 66 focused tests passed; 14 independent evidence/arithmetic checks; root diff review | `684b6ad` |
| Case save recovery | BUG-30 and IMP-02 (six case modules): duplicate text scoring and save-only retries with immutable attempts and stale-result protection | 51 focused tests passed; committed-but-rejected write simulations preserve IDs across retries; root diff review | `fix: retry case saves without duplicating attempts` |
