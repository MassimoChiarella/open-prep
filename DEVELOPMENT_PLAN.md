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
| 05 | Offline upgrade readiness and complete asset precaching | Complete |
| 06 | Drill completion recovery, per-answer timing and resumed deadlines | Complete |
| 07 | Exhibit evidence, answer precision, scoring and stale-save protection | Complete |
| 08 | Question generation, content units, formula links and ROI wording | Complete |
| 09 | Recoverable large backups, pack-version drafts and storage failure recovery | Complete |
| 10 | Difficulty-correct personal bests and duplicate-question scoring | Complete |
| 11 | Save-only retries, full-case local resume, prep-plan clarification | Complete |
| 12 | Independent invariant tests and smaller browser smoke journeys | Complete |
| 13 | Integrated verification, visual review and final repair ledger | Complete |

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
| Case save recovery | BUG-30 and IMP-02 (six case modules): duplicate text scoring and save-only retries with immutable attempts and stale-result protection | 51 focused tests passed; committed-but-rejected write simulations preserve IDs across retries; root diff review | `ef410d4` |
| Backup recoverability | BUG-11, BUG-18: bounded numbered backup sets (up to 64 files / 128 MiB), one atomic restore, versioned pack drafts, validated private full-case draft records | 77 focused backup/pack/settings tests plus 20 storage lifecycle tests passed; 10,001-response history, missing/mixed/corrupt files and rollback covered | `53f8f5f` |
| Offline updates | BUG-03: generation-complete immutable precache, static/lazy assets and navigation payloads; synchronized authoring schema bundles | 27 unit/build tests, 2 Chromium upgrade/failure journeys, and 53 authoring tests passed; baseline inventory 4.615 MiB / 6 MiB | `4ac8c10` |
| Regression coverage | IMP-04, IMP-05: independent arithmetic/evidence/locale/race tests in repair batches; split long navigation and arrow smoke journeys | 70 isolated Firefox/WebKit scenarios passed first run in 2 minutes, unchanged 30-second limits and zero retries | `78ac94a` |
| Progress and remaining retries | BUG-19 and remaining IMP-02: mixed-question difficulty bests, exhibit/Sprint/sizing save-only retries, stable reviewed scoring across locale changes | 41 focused practice tests and locale-change retry regression passed; root diff review | `fb1fc3a` |
| Full-case resume and language coverage | IMP-02, IMP-03, IMP-06: optional private case drafts, explicit resume/discard, stable completed-save retry, locale capture and clear reference-note copy; all new strings translated | 40 full-case/activity/catalog tests passed; independent delayed deletion, remount, reset, invalidation and locale regressions; ESLint/typecheck passed | `886d4b6` |
| Integration fixtures | Keep partial mocks compatible with invalidation imports; verify neutral redirect after reset/restore | 34 targeted unit tests passed; fresh-build browser assertions run in step 13 | `8861aa9` |
| Final review: queued saves | BUG-10 hardening: subscribe queued drill draft/completion writes to invalidation before earlier saves settle; preserve ordinary navigation saves | Four regressions reproduced both stale-write failures before the fix; all 49 targeted tests, ESLint and TypeScript passed | `7d0d3c9` |
| Final review: draft keyboard focus | IMP-03 hardening: focus the restored stage after Resume and an available control after Discard; preserve focus if the learner moves elsewhere while deletion waits | 17 draft lifecycle tests passed, including first-stage resume, delete failure/retry and delayed deletion; focused ESLint and combined TypeScript passed | `fcf00b3` |
| Final review: expected rendering | Update the single mobile Formula Library baseline for clarified ROI wrapping and the exhibit assertion for full currency precision | All six visual groups passed in the isolated Chromium run; inspected ROI across four layouts and expanded English/Arabic dark Settings; corrected exhibit save journey passed | `6c0faac` |
| Final review: content direction | Let authored case briefs, options and explanations select their own reading direction while translated controls retain the surrounding direction | 24 relevant component tests and ESLint passed; focused direction assertions protect authored content and surrounding RTL controls | `39cb9e2` |
| Final verification record | Complete every plan step, pin historical audit links, document supported limits and preserve exact verification evidence | All static/build gates passed; 1,232 unit/component tests; 178 Chromium plus 103 Firefox/WebKit/backup tests passed with zero retries | `docs: complete audit remediation validation` |

## Verification method and limits

### Final results on `39cb9e2`

| Check | Result |
|---|---|
| Version, Action pins, authoring bundles, product identity | Passed; 518 text files checked for identity |
| ESLint and strict TypeScript | Passed |
| Unit and component suite | 160 files / 1,232 tests passed |
| Catalog and generated locales | Passed |
| Production export and artifact integrity | Passed; 224 files, clean source identity |
| Largest JavaScript chunk | 394.2 / 500 KiB |
| Largest route JavaScript, Brotli | 402.9 / 480 KiB |
| Complete offline install | 4,809.8 / 6,144 KiB; 185 files |
| Complete Chromium suite | 178 / 178 passed in 5.6 minutes, zero retries |
| Firefox, WebKit and backup portability | 103 / 103 passed in 3.8 minutes: 51 Firefox, 51 WebKit and one Chromium-to-Firefox/WebKit backup transfer; zero retries |
| Additional visual/keyboard review | ROI at mobile/tablet/desktop/dark; expanded English/Arabic dark backup controls; full-case English/German/Arabic narrow layouts, resume/discard focus and final RTL punctuation passed |

### Isolation and preserved evidence

The final implementation is pinned at `39cb9e2` in a detached verification checkout. It uses the same installed dependency versions, Node 24.19.0/npm 11.17.0, the checked-in test suites and the verified static server. Ignored Playwright configs change only checkout paths, evidence directories and local ports (3017/3018), retaining the normal worker counts, assertion/test time limits and zero retries. All fixtures and output resolve inside that checkout. This prevents another active task's build cleanup from removing the files under test.

Earlier attempts are retained as evidence rather than reported as clean passes. An initial catalog check encountered a Vite module-transport timeout; the standalone check and subsequent isolated build passed. Shared-output browser runs were stopped after another task removed `out/`, producing missing-page failures. A five-second pre-hydration stall in the shared run also failed once. The isolated run then exposed a stale exhibit assertion expecting compact currency; that assertion now checks the repaired exact display, and its complete answer/save journey passed. The single updated screenshot is the mobile Formula Library: corrected ROI wording adds one natural line. All six visual groups passed after that reviewed update.

Final local logs: `.runtime-cache/remediation-complete-gates.log`, `.runtime-cache/remediation-complete-chromium.log`, and `.runtime-cache/remediation-complete-cross.log`. Browser artifacts use the corresponding `remediation-complete-*-results` folders. Additional reviewed screenshots and geometry reports are in `.runtime-cache/practice-audit/roi-settings-visual/` and `.runtime-cache/practice-audit/full-case-draft-final-visual/`. These ignored files contain synthetic local test data; the tracked plan and commit ledger are the durable record.

All 30 audited bugs and six improvements are implemented and verified. The final documentation commit changes only the audit and this ledger; application code, tests and build inputs remain at the verified implementation commit above. The development branch contains 19 incremental commits from the audit baseline, each pushed to GitHub.

### Practical limits

Remaining practical limits are explicit: complete backups support at most 64 files / 128 MiB per set, with 40 MiB per file and existing individual-record bounds; creating/restoring a set still uses an in-memory snapshot. The complete offline asset generation is larger than the old incomplete cache, so its measured install budget is 6 MiB; route and individual-chunk budgets remain unchanged. Automated coverage does not replace human screen-reader or OS-level PWA installation checks, browser-eviction testing, final-host checks, or exhaustive enumeration of every generated question. No deployment, merge, runtime service or dependency was added by this remediation.

# Post-audit hardening plan

Baseline: `bc7e9ee`. Development branch: `codex/audit-remediation`.

This phase closes the issues discovered after the completed 30-item audit. It preserves the local-only runtime, deterministic content, installable PWA, static hosting model, existing dependencies and backward-compatible stored data.

## Delivery sequence

| Step | Scope | Status |
|---|---|---|
| 14 | Publish the hardening plan and acceptance ledger | Complete |
| 15 | Drill identity, repeat behavior and local-day correctness | Planned |
| 16 | Multilingual scoring, localized summaries and recoverable UI state | Planned |
| 17 | Storage write coalescing, bounded reads and restore responsiveness | Planned |
| 18 | Release-server isolation, service-worker retry and Node preflight | Planned |
| 19 | Integrated verification and completion record | Planned |

### 14 — Establish the hardening record

- Assign stable IDs `HARD-01` through `HARD-14` to the new findings.
- Record dependencies, test expectations and incremental commit boundaries before application edits.
- Push this planning commit independently.

### 15 — Keep each drill session internally consistent

- `HARD-02`: remount asynchronous and active session loaders whenever the complete drill query identity changes, including adaptive, benchmark and direct-pack routes.
- `HARD-03`: give Repeat Drill a fresh local nonce while preserving the completed drill settings and mode.
- `HARD-10`: reject a second answer for the same question in the shared submission domain function.
- `HARD-11`: derive Daily Workout identity from the learner's local calendar date while retaining ISO timestamps for persisted events.
- Verify same-route navigation, canonical repeat links, duplicate submissions and local-midnight boundaries.

### 16 — Make language and recovery behavior truthful

- `HARD-04`: match questioning concepts in languages without whitespace by supporting normalized substring aliases while preserving existing token/fuzzy matching.
- `HARD-05`: track drill draft persistence failures and describe exit behavior truthfully instead of promising unavailable storage.
- `HARD-08`: pass summary-generated labels, reasons, recommendations, units and empty-answer/error copy through localization.
- `HARD-12`: clear a failed locale-load attempt so selecting the same locale can retry.
- `HARD-13`: expose service-worker registration retry after a transient failure without adding background services.
- Verify CJK scoring, translated summary output, failed-draft messaging, locale retry and service-worker recovery.

### 17 — Bound local persistence work

- `HARD-06`: coalesce full-case draft autosaves so rapid edits persist the newest snapshot without opening one adapter per keystroke; flush pending work before lifecycle completion.
- `HARD-07`: add indexed reads for response history needed by draft lookup, latest-session and personal-best/recommendation flows; avoid repeated lifetime `getAll()` calls where a bounded query is sufficient.
- `HARD-09`: parse multipart backup files incrementally, yield between large batches and restore bounded batches while preserving all-or-nothing recovery semantics.
- Verify delayed writes, newest-draft persistence, large synthetic histories, corrupt/mixed backup rejection and rollback.

### 18 — Make local release checks deterministic

- `HARD-01`: allocate an isolated Playwright port and never attach release tests to an unrelated existing server.
- `HARD-14`: add a dependency-free runtime preflight with actionable Node/npm errors and ensure Playwright's child server uses the current Node executable.
- Preserve explicit preview behavior on port 3000 and existing CI contracts.
- Verify wrong-server rejection, dynamic-port startup, supported runtime success and unsupported-runtime diagnostics.

### 19 — Verify and publish completion

- Run focused tests after every implementation batch and the complete lint, strict TypeScript, unit, build and Chromium suites at the end.
- Run Firefox/WebKit smoke and backup portability checks when installed browsers are available.
- Review the combined diff for local privacy, static-hosting compatibility, accessibility and accidental dependency growth.
- Mark every hardening ID complete with commit and test evidence; push the final documentation commit.

## Hardening acceptance ledger

| ID | Finding | Acceptance criterion | Status |
|---|---|---|---|
| HARD-01 | Local release tests can reuse a stale or unrelated build | Every Playwright invocation owns a fresh verified build server on its allocated port | Planned |
| HARD-02 | Same-route changes mix old questions with new metadata | Query changes create one coherent loader/session identity before interaction resumes | Planned |
| HARD-03 | Repeat Drill is a no-op on a canonical URL | Repeat starts a fresh session even when settings are unchanged | Planned |
| HARD-04 | CJK/unspaced questioning aliases do not receive concept credit | Exact normalized authored aliases match with or without word boundaries | Planned |
| HARD-05 | Exit copy claims failed drafts were saved | Exit messaging reflects the latest persistence result | Planned |
| HARD-06 | Full-case drafts enqueue one adapter/write per keystroke | Rapid edits coalesce and the newest valid snapshot is recoverable | Planned |
| HARD-07 | Routine drill operations scan lifetime response history | Bounded/indexed operations replace avoidable full-store reads | Planned |
| HARD-08 | Session guidance bypasses localization | All user-visible summary copy uses locale-aware formatting and translation | Planned |
| HARD-09 | Maximum backup restore monopolizes the main thread | Large restores yield/batch without weakening validation or atomic rollback | Planned |
| HARD-10 | Domain submission accepts duplicate question answers | A duplicate submission fails before scoring or persistence | Planned |
| HARD-11 | Daily Workout rotates at UTC rather than local midnight | The daily seed and generated identity use the learner's local date | Planned |
| HARD-12 | A failed locale chunk cannot retry | A later selection of the same locale triggers a new load | Planned |
| HARD-13 | Service-worker registration failure is sticky | The user can retry and recover without reloading the page | Planned |
| HARD-14 | Unsupported Node can reach opaque tool failures | Repository commands fail early with an actionable pinned-runtime message | Planned |
