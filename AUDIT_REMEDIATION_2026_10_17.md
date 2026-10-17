# October 2026 audit remediation

Baseline: `627e012faff587603e0d4b6ae2110532a38acf35` (17 October audit). This is the implementation plan and validation ledger for all 20 ranked findings and the associated authoring/performance improvements. Each milestone is a separate focused commit, pushed after its relevant checks. Independent work may complete in parallel; correctness dependencies below remain sequential.

## Guarantees and acceptance rules

- Preserve deterministic browser-only practice, IndexedDB progress, offline/PWA behavior, every practice module, private-data consent and all supported content formats.
- No external grading/content/recommendation services, new telemetry, learner-data transmission or AI runtime.
- Reuse existing atomic tokens, workers, storage APIs and formatting patterns. Do not discard history, weaken validation, or silently change grading policy to improve speed.
- Add focused regressions for every confirmed logic/storage failure. Run lint, strict TypeScript, complete units, production build, Chromium and the supported cross-browser suite after integration.
- Track genuine upstream dependency constraints explicitly; never describe a remaining advisory as resolved merely because it is not exposed by the static app.
- Retain original backup integrity verification before normalizing timestamps or downgrading unverified provenance.

## Phase 1 — Protect saved work and explain unsaved work

| Milestone | Audit finding / implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M01 | Record this plan and commit boundaries | Every audit item mapped below | Complete — this document |
| M02 | #1 Fit story revision checks for save/delete, deletion tombstones, conflict guidance retaining edits | Two stale editors cannot overwrite newer work, delete a newer edit or recreate a deleted story; arbitrary imported IDs work | Complete — 27 unit tests; native two-document Chromium regression passed; targeted ESLint; engine matrix pending |
| M03 | #2 Pack install compares reviewed target fingerprint/absence under atomic write | Intervening install/replacement requires fresh review and confirmation; unchanged replacement succeeds | Complete — 71 focused tests; targeted ESLint; native two-tab regression added for integration gate |
| M04 | #3 Full-case exit notice uses real draft/save state | Drafts off/pending/saved/failed and completed results have truthful guidance; consent unchanged | Complete — 31 tests/5 focused files; targeted ESLint; nine translated locales |
| M05 | #6 Remove spread-argument limit from atomic full reads | Supported >argument-limit native IndexedDB reads and Recovery settle with exact row counts | Complete — native Chromium 150,000 valid responses: exact count/atomic count, zero Recovery issues, zero page errors |
| M06 | #16 Fit async deletion uses current state | Startup read/save/delete interleaving retains unrelated visible and stored stories | Complete — 25 tests/4 focused suites; selection derived from current survivors; targeted ESLint |

## Phase 2 — Preserve numeric meaning across languages

| Milestone | Implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M07 | #4 Capture locale on each numeric edit in drills/benchmarks, exhibits/sprint and sizing | English→German and reverse preserve unchanged values; mixed-locale sizing fields work; healthy Full Case behavior retained | Complete — 63 UI/recovery tests plus 54 evaluator/scoring/persistence tests; targeted ESLint |
| M08 | #5 Localize generated exhibit numbers and correct-answer displays | Displayed grouped/decimal/percentage answers parse under the active locale; currency denomination and authored prose retained | Complete — 122 tests/7 suites; ten-locale round trips and real German/French copy-answer controls; targeted ESLint |

## Phase 3 — Close deterministic grading and content-validation gaps

| Milestone | Implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M09 | #7 Deduplicate template probes before selection; exhaust complete domains within existing 256-probe budget | `a=1..10`, `1/(a-5)` rejected; large-domain cap retained; valid packs unchanged | Complete — focused pack suites 88/88; targeted ESLint |
| M10 | Supporting #7 warning: questioning-rubric attainable maximum | Five intents / three questions reports author-review warning; no silent rubric normalization or legacy rejection | Complete — same 88-test pack validation; targeted ESLint |
| M11 | #8 Validate explicit assumption units | `$0.6` ratio and `400%` currency rejected; valid bare/percent ratios and bare/currency prices retain credit | Complete — 71 tests/6 focused suites; ESLint and strict TypeScript |
| M12 | #10 Repair Luma alternate reference and test all bundled reference winners | Ranked authored reference set reaches 100 and each reference matches its intended intent | Complete — 56 tests/3 questioning/review suites; targeted ESLint |
| M13 | #11 Script-aware questioning match across punctuation | Chinese polite prefixes/clauses preserve concepts; Latin boundaries and typo safeguards retained | Complete — 91 tests/5 focused suites; targeted ESLint |
| M14 | #12 Validate score-ready resumed/completed drafts with actionable failures | 300/301 character import/resume/completion boundaries covered; editable incomplete drafts remain allowed | Complete — 32 tests/5 suites; actionable retained responses and retry; targeted ESLint |
| M15 | #19 Scale-sensitive numerical slack for exact tiny answers | Zero rejected for nonzero `1e-10` under explicit zero tolerance; all tolerance modes and floating arithmetic controls covered | Complete — 138 tests/10 focused suites; targeted ESLint |

## Phase 4 — Make imported history and content trust consistent

| Milestone | Implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M16 | #9 Canonicalize absolute timestamps after integrity validation and handle legacy/native index order | Offset timestamps preserve chronology, ties, paged latest/best and prep-plan recent scores; date-only interview dates unchanged | Pending |
| M17 | #13 Downgrade self-declared restored repository review provenance | Invented/copied claims cannot display verified badge; content, offline restore and historical backup compatibility retained | Complete — 76 tests/7 focused suites; targeted ESLint; worker/native UI regression added for integration |

## Phase 5 — Maintain dependencies and reliable checks

| Milestone | Implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M18 | #14 Refresh compatible sharp/source-map resolutions | Fresh advisory inventory and full compatibility checks; no forced unrelated major/downgrade | Pending |
| M19 | #14 Evaluate selector-parser compatibility; document/mitigate any unpatched braces path | Tested safe resolution where available; remaining upstream risk accurately recorded with reachability and follow-up | Pending |
| M20 | #18 Isolate unit activation polling from wall-clock startup sensitivity | Asynchronous activation and timeout contracts still tested; isolated and complete unit runs pass | Focused complete — 13/13 tests; external poll mocked deterministically; 20-second browser contract asserted; full gate pending |

## Phase 6 — Remove measured UI stalls without removing features

Baseline measurements: five retained trials per scenario/rate, native Chromium and diagnostic 4× CPU throttling, Ryzen 5 3600/Windows, 1440×1000. A saved summary at 5,000 sessions/100,000 responses took 2.914/10.130 seconds, with 198/941 ms longest tasks. Recovery at 1,000/20,000 took 623/2,360 ms, with 248/1,142 ms longest tasks. Fit with zero stories/10,000 unrelated attempts read all 10,000 and took 264/1,128 ms. Throttling is not a physical-phone prediction.

| Milestone | Implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M21 | #15 Move saved-summary personal-best/history aggregation to existing worker pattern | Identical summary/badges/repeat targets; cancellation/failure covered; main-thread long tasks reduced on same fixtures | Implementation complete — 36 tests/5 focused files; targeted ESLint; native/performance integration pending |
| M22 | #15 Move Recovery diagnosis/preparation to existing local-data worker | All structural/byte checks, ownership, fingerprints, archives and generation conflicts retained; measured UI stalls reduced | Pending |
| M23 | #17 Add kind/module practice-record queries in tested version migration | Fit avoids unrelated records; migrated/imported IDs supported; lessons/plan outcomes identical | Pending |

## Phase 7 — Defer or reuse unnecessary work

| Milestone | Implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M24 | #20 Mount benchmark history on first open, retain afterward | Closed disclosure does not scan trends; all history and comparison behavior preserved | Complete — 21 tests/4 benchmark suites; zero pre-open storage calls and no collapse/reopen reread; targeted ESLint |
| M25 | #20 Reuse capacity and content-equivalent drill preview work | Timing/feedback changes avoid regeneration; deterministic previews and count clamping preserved | Complete — 29 tests/4 suites; invocation counts, original default seed and clamping checked; targeted ESLint |
| M26 | #20 Filter eligible templates once per generation request | Seeded output/validation unchanged; no global unbounded cache or new dependency | Complete — 94 tests/6 focused suites; baseline seeded sequence retained; targeted ESLint |

## Phase 8 — Integration and completion evidence

M27 synchronizes translated/generated assets where needed, runs complete release gates and cross-browser checks, repeats targeted native races/large-store boundaries, responsive checks for changed flows, and the quiet performance fixtures. Inspect intentional visual changes before accepting new baselines. Record exact commands/counts, remaining limitations, dependency inventory and measured before/after results here. Each substantive corrective follow-up remains its own commit. A final ledger commit records the resulting source revision; no tagged release is implied.

## Validation ledger

The baseline complete gate had 1,528/1,529 unit tests pass with a single activation-poll timeout; the file passed in isolation. Separate production build, 301 Chromium and 138 cross-browser/transfer checks passed. The audit also ran 754 route/profile cases, 116 accessibility scans, 19,200 generation checks and synthetic native reproductions. Those are audit baselines, not validation of future remediation changes.

Implementation evidence will be appended by milestone as work is completed. The current task explicitly authorizes implementation and incremental GitHub pushes; changes target the existing `main` branch with fast-forward pushes and no unrelated branch cleanup.
