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
| M02 | #1 Fit story revision checks for save/delete, deletion tombstones, conflict guidance retaining edits | Two stale editors cannot overwrite newer work, delete a newer edit or recreate a deleted story; arbitrary imported IDs work | Complete — 27 unit tests; native two-document regression passed in Chromium, Firefox and WebKit; ESLint and complete gates passed |
| M03 | #2 Pack install compares reviewed target fingerprint/absence under atomic write | Intervening install/replacement requires fresh review and confirmation; unchanged replacement succeeds | Complete — 71 focused tests; native two-tab regression and complete gates passed across all three engines |
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
| M16 | #9 Canonicalize absolute timestamps after integrity validation and handle legacy/native index order | Offset timestamps preserve chronology, ties, paged latest/best and prep-plan recent scores; date-only interview dates unchanged | Complete — pure layer 152 tests; Complete boundary 32 tests; native v11 migration/paging/rollback 9 cases across 3 engines; 98 focused compatibility tests and ESLint |
| M17 | #13 Downgrade self-declared restored repository review provenance | Invented/copied claims cannot display verified badge; content, offline restore and historical backup compatibility retained | Complete — 76 tests/7 focused suites; worker/native UI regression and complete gates passed across all three engines |

## Phase 5 — Maintain dependencies and reliable checks

| Milestone | Implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M18 | #14 Refresh compatible sharp/source-map resolutions | Fresh advisory inventory and full compatibility checks; no forced unrelated major/downgrade | Complete — clean npm ci; sharp 0.35.5/librsvg 2.63.2 and source-map-js 1.2.2 actual round trips, full production build and browser gates passed |
| M19 | #14 Evaluate selector-parser compatibility; document/mitigate any unpatched braces path | Tested safe resolution where available; remaining upstream risk accurately recorded with reachability and follow-up | Available patches complete; upstream exception OPEN — selector-parser 7.1.6, CSS compatibility, production build and browser gates passed; fresh audit 7 high / 0 moderate affected entries from one unpatched braces advisory; follow-up in SECURITY.md |
| M20 | #18 Isolate unit activation polling from wall-clock startup sensitivity | Asynchronous activation and timeout contracts still tested; isolated and complete unit runs pass | Complete — 13 focused tests and full 1,740-test run passed; external poll mocked deterministically; 20-second browser contract asserted |
| M29 | Integration follow-up: start native-confirmation keyboard checks after draft initialization | Retain real dialog cancellation, focus restoration and subsequent Tab assertions; no retries or longer timeouts | Complete — trace-proven test initialization race; corrected case passes 20 repetitions and the full 8-case keyboard suite; targeted ESLint |
| M31 | Integration follow-up: wait for installed-pack review lookup before quota-test confirmation | Test begins installation only after real review controls enable; quota/error/data-preservation assertions remain intact | Complete — 60 connected tests; 5 native and 5 two-logical-CPU repeats (up to 1,219 ms); operation-completion synchronization and saved-snapshot assertions; strict TypeScript and ESLint; no timeout/retry changes |

## Phase 6 — Remove measured UI stalls without removing features

Baseline measurements: five retained trials per scenario/rate, native Chromium and diagnostic 4× CPU throttling, Ryzen 5 3600/Windows, 1440×1000. A saved summary at 5,000 sessions/100,000 responses took 2.914/10.130 seconds, with 198/941 ms longest tasks. Recovery at 1,000/20,000 took 623/2,360 ms, with 248/1,142 ms longest tasks. Fit with zero stories/10,000 unrelated attempts read all 10,000 and took 264/1,128 ms. Throttling is not a physical-phone prediction.

| Milestone | Implementation | Acceptance | Status |
| --- | --- | --- | --- |
| M21 | #15 Move saved-summary personal-best/history aggregation to existing worker pattern | Identical summary/badges/repeat targets; cancellation/failure covered; main-thread long tasks reduced on same fixtures | Complete — 36 focused tests, complete gates and final quiet performance checks passed; 100,000-response longest-task medians 198→0 ms native and 941→51 ms at diagnostic 4× |
| M22 | #15 Move Recovery diagnosis/preparation to existing local-data worker | All structural/byte checks, ownership, fingerprints, archives and generation conflicts retained; measured UI stalls reduced | Complete — 56 focused tests, complete gates and final quiet performance checks passed; diagnosis longest-task medians 248/1,142→0/0 ms; total readiness tradeoffs recorded below |
| M23 | #17 Add kind/module practice-record queries in tested version migration | Fit avoids unrelated records; migrated/imported IDs supported; lessons/plan outcomes identical | Complete — 40 tests/7 focused suites; strict types and ESLint; v11→12 native query case and historical app migration pass across all three engines with zero practice object-store full reads in the query regression |
| M28 | Integration performance follow-up: remove unobserved response sorting and short-circuit unequal personal-best values | Response deduplication, aggregates, independent visible chronology and best tie rules remain correct; no global cache | Complete — 58 focused tests, strict TypeScript, ESLint, fresh complete gates and performance comparison; independent chronology/permutation/precedence and fractional-duration controls retained |
| M30 | Integration performance follow-up: load saved-summary dependencies only for saved-summary worker requests | Dashboard worker avoids unrelated saved-summary startup; summary errors, cancellation and offline support remain covered | Complete — 28 focused tests, strict TypeScript, ESLint, fresh production/offline gates and performance comparison; optional-module failure leaves Dashboard functional and closes failed-request storage |

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

The integration record below supersedes earlier in-progress receipts. The current task explicitly authorizes implementation and incremental GitHub pushes; changes target the existing `main` branch with fast-forward pushes and no unrelated branch cleanup.

## Integration record and retained technical contracts

At the earlier 17 October closure, the last application-code change was `3285a573fcd0eeef51f08702b99a10bdbf75c576`. Subsequent commits through `cc0d1f4` changed test synchronization and this plan. All 20 ranked audit findings and the associated authoring warning are mapped to milestones. The dependency finding remains partially open because braces has no available patch. The authorized follow-up sections below record the later application source `955e7f1` and its separate acceptance evidence. Repository pushes do not constitute a tagged release.

### Storage, chronology and concurrent edits

- IndexedDB is now version **12**. The timestamp migration introduced in v11 canonicalizes valid stored event timestamps, including embedded drill-response timestamps, when upgrading older databases. Accepted writes/imports use the same normalization. Original backup validation and checksums run before any normalization. Date-only interview dates and private authored text retain their meaning; malformed legacy values remain available for Recovery.
- Ordinary timestamp paging retains its existing compound timestamp/ID indexes. Histories containing exceptional years or malformed indexed timestamps use the compatibility path, which compares actual instants and IndexedDB ID ordering while retaining bounded page candidates. Continuation keys, both paging directions, ties, invalid values, migration rollback and ordinary indexed paging have focused/native coverage. The compatibility marker can conservatively survive individual deletions; clearing/replacing the store resets it.
- Version 12 adds nonunique `kind` and compound `kind_module` (`[kind, module]`) indexes to `practice_records`. `queryPracticeRecords` selects matching kinds/modules and returns independent record copies. Fit and practice-history loaders retain their existing chronological sorting without loading unrelated record kinds/modules first. Existing/imported IDs are treated as arbitrary IDs, never inferred from a prefix. The Fit story bank still rereads each story and its revision token together inside the atomic decision.
- Fit saves/deletes compare the reviewed generation, revision and existence token. Revision tombstones prevent stale editors from recreating deleted stories. Conflicts preserve the local editor's text for review, and ordinary story edits do not advance the whole-app reset generation. The separate startup-read/save/delete UI race now reconciles deletion and selection from the current surviving story list.
- Interactive pack installation carries the exact reviewed target fingerprint or expected absence into the atomic write under the existing installation lock. A changed target refreshes replacement details and clears consent before another attempt. The explicit programmatic API remains capable of intentional unconditional replacement when no reviewed target is supplied. The fingerprint is a concurrency comparison, not an authenticity credential.
- Atomic full-store reads no longer expand an entire result array into function arguments. Native Chromium controls retain exact counts and permit Recovery over 150,000 valid response rows, a dataset accepted by the existing multipart-backup limits. This evidence does not establish an identical capacity/performance threshold for every engine or device.
- Complete Backup restore verifies the original set before removing self-declared restored repository-review provenance. Restored content remains usable, including supported historical/offline backups. Catalog installation can establish verified review provenance through its existing verification path; creation/export/catalog records are not globally stripped. The restore policy addresses a trust label, not a demonstrated code-execution or data-exfiltration bypass.

### Workers, cancellation and retained data

- Saved-session history/personal-best work uses the existing progress worker. The worker returns the selected session snapshot, badge labels and repeat target rather than all lifetime history. Saved-summary dependencies load only for a saved-summary worker request, so their startup/failure does not become a Dashboard dependency. A generation barrier rejects results invalidated by a reset/restore even when cross-tab messaging is unavailable.
- Recovery reuses the existing local-data worker entry. Diagnosis returns issue metadata; preparation retains the original scoped records and conflict fingerprint inside the worker. The diagnostic archive is returned as a Blob, and the existing lossless encoding, ownership checks and atomic fingerprint comparison remain in force. The page retains confirmation metadata rather than the private original-record tree.
- Cancel/unmount/replacement disposes the retained session and rejects late responses. Worker/transport failures surface as failures instead of retrying heavy work on the UI thread. Injected-storage, unavailable-Worker and constructor-blocked cases retain the checked fallback; that fallback may still perform its work on the page thread.
- Recovery carries structured storage-conflict reasons across the worker boundary. Apply suppresses the worker's own invalidation publication, returns acknowledged counts, then the page checks the expected next generation before publishing invalidation. This avoids treating its own success message as a replacement conflict and prevents an obsolete success result from being accepted after another replacement. Cancellation is not represented as a rollback guarantee for an atomic write that has already committed.
- These changes do not discard history, weaken backup validation, add implicit private-storage consent, or remove practice features. Standard/Complete backup scopes and generation checks remain separate from diagnostic Recovery archives, which are explicitly not restorable backups.

### Numeric meaning, grading and deterministic content

- Numeric fields capture their parsing locale when edited, including each market-sizing assumption separately. Changing interface language preserves the meaning of unchanged text; later edits capture the later locale. Existing Full Case calculation-locale behavior remains intact. Generated exhibit numbers and correct-answer displays use the active display locale while retaining the authored currency denomination and prose.
- Market-sizing assumptions reject contradictory explicit units before populating formula variables, while valid bare ratios/percentages and bare/currency prices remain supported. The existing Interview Math policy remains: preserve calculation credit for a correct calculation and deduct the unit credit for a wrong unit.
- Exact/tolerance comparisons use magnitude-scaled floating-point slack rather than a fixed absolute floor. Explicit zero tolerance no longer accepts zero for a nonzero expected `1e-10`; absolute, percentage, range, zero/negative and ordinary floating-arithmetic controls remain covered.
- Generated-template validation deduplicates probes first and exhausts complete finite Cartesian domains that fit the existing 256-probe budget. Larger domains retain bounded probing and the existing runtime handling; this is not a proof that every possible future large-domain expression is safe. Questioning-rubric full-score reachability is an author-review warning, not a silent weight change or rejection of supported legacy content.
- Bundled Luma reference winners are checked against intended intents. Chinese concept matching tolerates ordinary punctuation/polite clauses while retaining Latin word-boundary and typo safeguards. Score-ready imported/restored Full Case questions enforce the scorer's 300-character boundary; invalid retained answers receive an actionable route back to editing, and incomplete editable drafts remain supported.
- Full Case exit guidance distinguishes private drafts off, pending, acknowledged and failed saves, and completed results. It no longer describes incomplete in-memory work as saved. Benchmark history mounts on first open and remains mounted afterward. Capacity/previews reuse content-equivalent work, template eligibility is calculated once per request, and aggregation removes only response ordering that its consumers do not observe. Visible chronological order, deduplication, seeded outputs, count clamping and personal-best tie rules remain covered.

### Conditional optimizations explicitly deferred

- **Progressive saved-summary rendering before optional lifetime badges — delivered in follow-up F02 below.** The earlier delivery moved lifetime work off the page thread; F02 adds the checked two-phase loading/error/cancellation contract and measures earlier core readiness while retaining badges.
- **Per-generation-request compiled-expression cache — candidate rejected after F03 profiling below.** Template-validation probes already reuse a compiled expression locally. Runtime generation retains its measured/request-scoped eligibility reuse; the additional cache did not meet its acceptance gate and was not introduced.

## M27 validation evidence and remaining acceptance

The following receipts distinguish the tested application source, earlier expanded layout evidence, and incomplete diagnostic/runner attempts. Earlier evidence is not relabeled as a fresh full sweep of the final source revision.

| Verification | Result and exact scope |
| --- | --- |
| Local complete gate on application source `3285a57` | **Passed**: `npm run check` completed version/action-pin/authoring checks, repository ESLint, generated route types and strict TypeScript, **1,740 unit tests / 205 files**, production static build/budgets, and **309 Chromium E2E cases**. Local receipt: `.runtime-cache/remediation-2026-10-17/full-check.log`. |
| Production payload budgets from that gate | Largest JS chunk **420.2/500.0 KiB**; largest route Brotli JS **418.8/480.0 KiB** (`/exhibits/`); install precache **5,247.2/6,144.0 KiB**, **201 files**. Passing these budgets is not a runtime-latency measurement. |
| Firefox/WebKit/backup-transfer repeat | **Passed, exit 0: 152/152 in 5.7 minutes**, using application source `3285a57` and test-only HEAD `cc0d1f4`. Command: `npm run e2e:cross-browser -- --output=.runtime-cache/remediation-2026-10-17/cross-browser-results`. Receipt: `cross-browser.log`. The preceding attempt reported 152 passing test bodies but stalled during teardown; `cross-browser-teardown-stall.log` remains excluded from clean-pass counts. |
| Expanded responsive/locale/boundary sweep | On clean `9a8677e356d2f64486a43a4c1226083423d0d9e7`: **754 route/profile cases**, **116 automated Axe scans**, **104 expanded-layout checks** and **2 touch simulations**, with no unexpected findings in the retained summaries. The **26 deliberate unknown-route 404s** are expected. These presentation sweeps precede the subsequent performance/test-only follow-ups; they are not presented as 754 reruns on `cc0d1f4`. Receipt: `browser-audits-summary.json` and the associated responsive/locale/boundary/touch logs and raw files. |
| Final application-source Chromium presentation coverage | The successful 309-case run again includes the configured accessibility checks and approved mobile/tablet/desktop, German/Arabic RTL and dark-theme visual baselines. Those current-source checks complement the earlier expanded sweep; they do not replace physical-device or manual accessibility validation. |
| Focused native/storage evidence | Per-milestone receipts include Fit stale-save/delete/resurrection guards, atomic 150,000-response reads/Recovery in Chromium, chronology migration/paging/rollback across three engines, and v11→12 practice-index queries across Chromium/Firefox/WebKit with zero practice object-store full reads. The completed actual-app suites exercise pack-install conflicts, restored-provenance display, original-data Recovery download/removal, historical migration, offline workers and backup transfer. Source-bundled native adapter checks and actual-app UI cases remain distinct evidence. |

### Integration readiness corrections

The integration follow-ups fix test readiness rather than increasing retry budgets or weakening product assertions:

- M29 waits until the active drill's answer control is enabled and initially focused before invoking the native confirmation dialog in the keyboard test. It retains real dialog cancellation, focus restoration and subsequent Tab assertions; the corrected case passed 20 repetitions and its complete eight-case keyboard file.
- M31 waits until installed-pack target lookup has enabled real review controls before confirming the quota test, then waits for the quota operation to finish. Quota failure/error presentation and saved-snapshot preservation remain asserted. Focused evidence includes 60 connected tests, five native and five constrained two-logical-CPU repetitions; the constrained maximum was 1,219 ms. No retry or timeout increase was used to conceal the readiness condition.
- Prior failed/stalled gate, CI, and ad hoc diagnostic attempts remain evidence of those attempts. They are not counted as completed passes, substituted for the clean runs above, or used to claim an uncompleted large-WebKit capacity experiment succeeded.

### Final performance comparison

The quiet final run used clean application artifact `3285a573fcd0eeef51f08702b99a10bdbf75c576`, inventory SHA-256 `a746d6c8be5246d4de97b9be4142e98a20681d4479f8734d4e8ace6a2b31f30e` (240 artifact files). The harness checked that later tracked differences were restricted to tests and this ledger. Both completed measurement commands and the count/error-checking summarizer exited 0. Raw records and summaries are retained locally under `.runtime-cache/remediation-2026-10-17/performance/`; audit-baseline records remain under `.runtime-cache/audit-2026-10-17/performance/`.

The browser was Chromium **153.0.8010.12**, Node **24.19.0**, Windows **10.0.26300**, Ryzen **5 3600**, viewport **1440×1000**. No other local browser/test jobs ran during measurement. Each scenario/rate had one discarded warmup and five retained trials: **80 history/Fit + 10 Recovery trials**, **18 warmups**, zero captured page errors. Native IndexedDB counts were asserted against each fixture: 200/1,000/5,000 sessions with 20 responses each; Fit with zero stories and 1,000/10,000 unrelated attempts; Recovery with 1,000 sessions/20,000 responses and no incompatible records.

All entries below are medians in **milliseconds**, audit baseline → final. The final column reports the median longest observed main-document task for native / diagnostic 4× CPU respectively. A **zero median** means at least three of five trials had no observed task at or above 50 ms; it does not mean zero processing time or prove that every trial had no long task.

| Scenario | Native locator-observed readiness | Diagnostic 4× locator-observed readiness | Longest task: native / 4× |
| --- | ---: | ---: | --- |
| Dashboard, 200 sessions | 248.5 → 247.5 | 486.0 → 514.4 | 0→0 / 0→0 |
| Saved summary, 200 sessions | 263.5 → 249.0 | 1,013.9 → 513.0 | 0→0 / 52→0 |
| Dashboard, 1,000 sessions | 364.4 → 864.6 | 1,083.1 → 1,027.9 | 0→0 / 0→0 |
| Saved summary, 1,000 sessions | 880.2 → 865.1 | 2,662.8 → 1,047.0 | 0→0 / 188→0 |
| Dashboard, 5,000 sessions | 1,380.2 → 1,913.5 | 1,567.9 → 2,066.8 | 0→0 / 0→0 |
| Saved summary, 5,000 sessions / 100,000 responses | 2,914.4 → 2,415.4 | 10,130.2 → 3,081.2 | 198→0 / 941→51 |
| Fit, 1,000 unrelated attempts | 147.2 → 97.3 | 475.1 → 448.3 | 0→0 / 0→0 |
| Fit, 10,000 unrelated attempts | 263.7 → 93.2 | 1,127.6 → 445.8 | 0→0 / 80→0 |
| Recovery diagnosis, 1,000 sessions / 20,000 responses | 622.9 → 896.2 | 2,359.5 → 982.7 | 248→0 / 1,142→0 |

The targeted page stalls are substantially reduced without dropping history, badges or Recovery validation. In the largest throttled summary case, median blocking time beyond the 50-ms threshold fell **891→1 ms**. Fit's main-document object-store `getAll` reads of unrelated attempts fell **10,000→0**; the native index regression separately proves filtered query behavior. This read counter does not count worker reads, cursors or index reads, so it is not a total-I/O claim.

Total readiness did not improve everywhere: the larger Dashboard fixtures and native Recovery are slower under this observation method. Worker startup, migration/chronology correctness, scheduling and locator polling can affect total readiness; these measurements do not isolate their causes. The existing locator waits poll at approximately 20/50/100/100/500-ms intervals and then repeat at 500 ms, followed by two animation frames, so the timings are quantized observations rather than continuous DOM-completion timestamps. CDP 4× throttling is diagnostic, does not uniformly model worker/storage work, and cannot predict a physical phone's speed. The Recovery timing covers diagnosis, not archive download or removal. Earlier intermediate trials and the incomplete ad hoc readiness probe are not used as final-source measurements.

That closure recorded a **P3 Dashboard readiness follow-up**, completed by F01 below: instrument actual DOM readiness and worker startup/storage/aggregation/render stages, then collect at least 20 quiet paired trials on identical fixtures at native and diagnostic 4× settings. A repeated actual-readiness increase exceeding both 100 ms and 15% was the trigger for a targeted change. F01 retains responsiveness, complete histories, filtered Fit queries and correctness gates. It does not remeasure native Recovery's earlier locator-observed readiness, which remains an unisolated measurement limitation. Neither observation establishes a new runtime defect or justifies speculative caching by itself.

### Hosted CI and deployment

[GitHub run 39077709570](https://github.com/MassimoChiarella/open-prep/actions/runs/39077709570) on `cc0d1f4d2ec4a9f476431d920a4c4b5c7d09429e` **completed successfully**. Its verification job passed `npm run check` (**1,740 unit tests / 205 files, 309 Chromium cases**) and **152 Firefox/WebKit/backup-transfer cases**. The production deployment job verified artifact identity, checked staged hosted behavior, promoted the current verified main commit, and verified the canonical `https://openprep.app/` origin; it completed at **2026-10-17 23:25:52 UTC**. A subsequent read of the public release marker confirmed clean source `cc0d1f4`. The retained local receipts are `ci-cc0d1f4.log` and `hosted-final-marker.json`.

The hosted smoke checks cover headers, unknown-route handling, manifest/worker identity, update checks and a synthetic local-storage marker across a warmed offline restart. They do not recertify every production IndexedDB practice flow or every historical installed-worker upgrade. Repository E2E/native evidence above covers those specified flows separately.

The closing ledger commit changes this document only and follows the successful implementation/deployment run. Its own automatically triggered workflow is a separate run; this record does not predeclare that later run successful. The work is recorded as **37 focused commits including this closure**, with the planning, correctness, performance, dependency and integration-test changes visible in [main's commit history](https://github.com/MassimoChiarella/open-prep/commits/main/).

## Open dependency exception and verification limits

The clean installed dependency inventory contains the sharp **0.35.5** / librsvg **2.63.2**, source-map-js **1.2.2**, and selector-parser **7.1.6** repairs. The fresh final audit still reports **7 high / 0 moderate affected entries deriving from one underlying unpatched braces advisory**, GHSA-vfj7-8cjw-p6xm. These are not seven independent demonstrated browser exploits, and they are not resolved. See `SECURITY.md` for the tooling reachability qualification, trusted-build controls and reassessment trigger; a future patched release or compatible parent-toolchain replacement requires a fresh advisory inventory and compatibility gates. Do not describe all 20 findings as fully closed while this exception remains open.

Validation uses synthetic local records and automated browser engines. It does not certify physical iOS/Android devices, branded Safari/Chrome/Edge installation behavior, NVDA/VoiceOver, browser/OS zoom, or OS-level PWA installation/background lifecycle. Root-font scaling is not browser zoom, CPU throttling is not a physical-phone prediction, and automated Axe scans are not accessibility certification. Earlier large-history WebKit seed/control attempts did not complete and remain excluded from application pass/fail conclusions. Native test counts and accepted backup limits do not guarantee every quota policy or possible timing interleaving. No claim is made that every possible bug is removed, that hosted smoke checks constitute a comprehensive production recertification, or that a tagged release was created.

## Authorized follow-up execution — 18 October 2026

The user authorized the work that can be completed with the current repository and browser environment. Baseline `96edaaa99d7048af8249bdedb3cea33314e324d9` is preserved as a clean static artifact before source changes. Each substantive change and its focused regression evidence will be committed and pushed separately; the previous closure's 37-commit count describes that earlier delivery.

| Phase | Work and substeps | Acceptance / decision gate | Status |
| --- | --- | --- | --- |
| F01 | Record continuous Dashboard DOM readiness and worker request/response timing; verify native fixture counts; distinguish startup, storage, aggregation and rendering before choosing a fix | At least 20 quiet paired trials per representative scenario/rate; no inference from locator polling; correctness and full history retained | Complete — 240 final paired trials; no group crosses the predefined regression trigger |
| F02 | Return the selected saved-summary snapshot before lifetime badges; preserve eventual labels/repeat identity; handle partial loading, enrichment failure/retry, cancellation and reset/restore | Bounded snapshot becomes usable while lifetime work is pending; late/stale results never replace newer data; worker and checked fallback agree; no badge or practice feature removed | Complete — full local gate, three-engine lifecycle/offline controls, targeted presentation and final paired performance passed |
| F03 | Profile repeated expression compilation against a bounded request-local candidate across ordinary built-in/imported/custom requests | Implement only if a representative native request saves both at least 20% and 1 ms, with identical questions/errors/seeds and no material normal/custom regression; stress-only benefit does not justify a cache | Complete — measured candidate rejected; decision and evidence below |
| F04 | Recheck primary braces metadata, actual tooling paths and upstream fixes; evaluate a compatible patch/replacement | A vetted fix must preserve CSS/lint/build/browser compatibility; no unrelated framework downgrade or unsupported claim that advisory counts are resolved | Assessment complete — tested candidate not adopted; upstream exception remains OPEN |
| F06 | Correct generated personal-best labels discovered in translated visual review; use existing scope translations and locale value/metadata formatting in summaries and Progress | Canonical engine/storage labels remain unchanged; all nine translated languages, unfamiliar labels, legacy time modes and existing rounding/precision are covered | Complete — focused and full local gates plus final German/Arabic presentation passed |
| F07 | Repair populated Progress definition lists and mistake metadata found by the expanded whole-page accessibility scan | Preserve presentation; complete an actual drill and scan nonempty metrics, categories and notebook in all three engines | Complete — three-engine native Axe regression and final presentation scans passed |
| F08 | Isolate hosted cross-browser execution after the Windows runner stalled; transfer the exact verified build to a separate Linux job and require both jobs before deployment | Same complete browser/transfer matrix and artifact identity; failures remain failures; retain Windows full/visual gate, diagnostics and unchanged per-test limits | Implemented in `c51ae9b` — focused workflow/artifact guards passed; final published-head acceptance is recorded by GitHub checks |
| F05 | Run focused checks per commit, then full integration and appropriate native/offline/cross-browser coverage; repeat performance controls and publish the final ledger | Exact source identities, counts, tradeoffs, open constraints and incremental main pushes are recorded | Implementation and local acceptance complete — final published-head hosted execution is tracked separately below |

Physical-device, OS installation/background lifecycle and manual screen-reader checks remain contingent on access to those actual environments. They are not represented as completed by browser emulation.

### F01 — Continuous readiness baseline and attribution

`src/tests/performance/audit-dashboard-readiness.mjs` records first Dashboard DOM readiness with a MutationObserver, two subsequent animation frames, page long tasks, and worker creation/request/response timestamps. It asserts real native session/response counts and successful worker results. Its committed CLI accepts a local production origin, output path, fixture counts and retained-trial count; it does not modify application records outside its isolated synthetic browser context or instrument production telemetry.

The clean `96edaaa` artifact completed **120 retained trials** (20 per 200/1,000/5,000-session fixture at native/diagnostic 4×, one warmup each), zero captured page errors. Median first-DOM readiness was **121.2/360.8 ms**, **305.0/476.3 ms**, and **1,199.6/1,369.8 ms** respectively. Every group's median observed main-page long task was zero under the 50-ms definition above. Raw evidence: `.runtime-cache/followups-2026-10-18/dashboard-baseline.json`; summary: `dashboard-baseline-summary.json`. The earlier locator-observed numbers cannot establish an actual rendering regression by themselves; these measurements provide a continuous baseline for the final paired comparison.

A separate **three-trial instrumented diagnostic**, excluded from those quiet timing medians, attributed the 100,000-response Dashboard request to roughly **34–41 ms worker startup**, **786–804 ms bulk native storage/read-deserialization**, **388–391 ms subsequent aggregation/generation verification**, and **9–11 ms result-to-DOM rendering**. The diagnostic adds counters/clock calls and response metadata inside the worker, so those stage durations are attribution evidence rather than uninstrumented benchmark promises. Approximately 122,775 date parses and 10,001 date formats occurred, but their measured cost did not justify speculative timestamp caches or a storage redesign. Final-source comparison remains part of F05.

### F02 — Progressive saved summaries

Commit `fc3831e` adds one checked snapshot message to the existing worker request, followed by its complete detail result. Final-only callers still await the complete result. The client serializes asynchronous generation checks and revalidates failed post-snapshot jobs, including transport failures and unavailable invalidation messages. An unverified or obsolete snapshot is discarded; ordinary verified enrichment failures can retain the core results. No second worker or duplicate lifetime scan is introduced.

The UI shows scores, question review and worked solutions before lifetime enrichment, with an accessible loading status. Repeat is disabled until the correct drill/benchmark identity is known; badges and the correct action appear on completion. Verified enrichment failures retain results and offer Retry; a failed new attempt cannot retain a previous attempt's unverified snapshot. Existing injected-storage/blocked-worker fallbacks, cancellation and reset checks are preserved.

Focused verification passed **60 tests across six suites**, strict TypeScript, ESLint and generated-locale checks. Two real-app controls passed in **all three browser engines (6/6)**: held final detail with usable core and eventual exact pack benchmark repeat, and silent native generation replacement rejecting the held result. The initial browser attempts exposed duplicate-text and canonical trailing-slash test assumptions; those assertions were corrected without product changes or timeout/retry increases. Targeted loading/error/retry/completion checks at desktop, mobile, German mobile and Arabic RTL mobile passed **12 stable-state Axe scans with zero violations and zero horizontal overflow**. Animation-in-progress contrast observations are excluded; finite entry animations completed before the stable-state scan.

Visual review also found an existing dynamic `Untimed drill` heading missing from generated translations. The key now has all nine non-English translations; German/Arabic display regressions and the connected catalog/summary suites passed **31 tests across three files**. Final rebuilt locale presentation and complete integration/performance controls remain part of F05. Local receipts are retained under `.runtime-cache/followups-2026-10-18/`.

### F03 — Expression compilation decision

A request-local lazy expression map was compared against the actual generator source in an isolated Node 24.19.0 probe: **24 alternating paired batches across 10 scenarios**, with **120 complete seeded-output equivalence checks**. Controls include built-in 5/30/50 questions, Case Math (30 questions), accepted imported packs, a low-capacity/repeated-draw pack, a long-formula boundary and custom arithmetic that does not invoke the formula parser. Ordinary requests saved **0.004–0.095 ms**; the 5-question and custom controls had no useful gain. The low-capacity case saved **0.808 ms / 25.3%** and the long-formula boundary **0.526 ms / 21.5%**. Neither meets the predeclared requirement to save both at least 1 ms and 20% on a representative request.

No runtime cache is introduced. The existing validation path already reuses compiled closures per validation batch; market-sizing evaluation has no repeated expression within one evaluation. Complete seeded Question outputs matched. Candidate error equivalence was not tested because the candidate was rejected; production generation and its errors remain unchanged. Local retained receipts: `.runtime-cache/followups-2026-10-18/logic/profile.mjs`, `profile-results.json` and `FINDINGS.md`. This closes the investigation with a measured decision; it does not claim a performance gain from code that was never shipped.

### F04 — Dependency remedy assessment

Primary registry/advisory checks still report braces **3.0.3** as latest and no patched advisory release. Compatible current micromatch/fast-glob/Tailwind 3/Next lint-plugin routes retain it. The app's actual shallow, trusted source glob and browser-only content processing are unchanged. See `SECURITY.md` for the current exception and controls.

An isolated five-runtime-file backport of upstream PR87 at `d44b9b1ee12e7804d4232d5a47a4a0c61d2fbefe` retained the published parser's quote behavior and original MIT license. **1,200 ordinary output comparisons**, actual micromatch/fast-glob/Next glob controls and a byte-identical **625-byte Tailwind CSS fixture** passed; **15 expected depth/cycle guard probes** returned controlled failures. A separate supplied-AST control remained uncontrolled, so the candidate was not qualified or installed as a complete security fix. The harness's successful exit includes that explicitly recorded negative diagnostic; it does not turn the diagnostic into a passing security result. No full upstream suite, production CSS/watch build or local-patch installation was claimed.

No dependency, lockfile, installed module or application runtime changed for this investigation. A repository-maintained patch would introduce ongoing security/version/license and clean-install obligations without a complete public-API fix. The current exception remains open instead of hiding its registry identity or forcing an unrelated toolchain major. Local provenance, hashes, exact backport, bounded harness and results are retained under `.runtime-cache/followups-2026-10-18/dependencies/`; the detailed report is `ASSESSMENT.md`. No external vulnerability report or message was sent.

### F06 — Personal-best localization found during visual review

The completed Arabic summary revealed English engine-generated badge strings; Progress also rendered those strings directly. A shared display-only formatter now maps known category/tag scopes through the existing translated labels and uses two localized metric templates plus the benchmark/streak keys. It covers all nine categories and 28 skill tags across nine non-English languages, preserves canonical English labels and unfamiliar-label fallbacks, and changes neither scoring nor stored content.

Progress badge values/metadata now use the existing locale formatters and translated units. Prior `Math.round`/`toFixed` behavior is retained before formatting; full score precision is retained, and unknown legacy time modes fall back safely. **38 focused tests in four suites**, strict whole-tree TypeScript, ESLint, current generated catalogs and whitespace checks passed. German/Arabic summary and Progress controls cover labels, values and metadata; dedicated English tie/precision and legacy-mode cases guard compatibility. Final production presentation checks remain in F05.

### F07 — Populated Progress accessibility

The expanded presentation check found invalid definition lists in populated Progress: metric descriptions and category comparisons used paragraphs inside definition groups, while saved-mistake metadata had definitions without terms. Commit `955e7f1` makes descriptions additional definitions and represents metadata badges as a list, preserving text, styling and localization. The regression completes a real wrong-answer drill, waits for persistence, opens nonempty Progress metrics/categories/notebook and runs whole-page Axe. It passed **3/3 in Chromium, Firefox and WebKit**, alongside the existing eight dashboard unit tests, TypeScript and ESLint. The earlier failing presentation receipts remain preserved separately.

### F08 — Isolate hosted cross-browser execution and bind tested bytes

Hosted run `39090404490` completed its full project gate, then logged all **158 Firefox/WebKit smoke test bodies** passing by **02:54:41 UTC**. No backup-transfer result followed before the **03:01:49 UTC** cancellation. GitHub's annotation explicitly records the 30-minute job limit. The log does not identify the exact blocked operation: last-test cleanup, worker/browser shutdown or the next project's browser setup remain possible. Installed Playwright source permits heartbeat-renewed waits during worker shutdown; this is a plausible mechanism, not a demonstrated upstream root-cause fix. The separate complete local Windows matrix passed all **160 cases with exit 0**.

Commit **`c51ae9b973e9e66afae834d3ed8aa513576200d2`** keeps Windows `npm run check` and approved visual baselines, then uploads that exact static output for pushes and PRs, including deployment-disabled runs. A separate Ubuntu job downloads the same run's SHA/attempt-named artifact, checks its commit/ref/clean marker and complete inventory, installs the lockfile-matched browsers, and runs the unchanged full matrix with one worker. It does not rebuild. Artifact identity is rechecked afterward; only successful revalidation publishes the tested inventory hash.

Production explicitly requires success from both jobs and rejects a Vercel artifact whose inventory differs from that tested hash, including missing/malformed expected hashes. Existing source/current-main, staged-host behavior, promotion and canonical-origin guards remain in force. The cross-browser command has a **20-minute global limit**, inside a **22-minute step** and **30-minute job**; separate bounded diagnostic uploads and test/browser debug logs preserve failure evidence. Per-test limits, retries, assertions and application code are unchanged. This is platform isolation and better failure reporting; it does not certify Windows CI shutdown as repaired. The setup follows [Playwright's supported CI guidance](https://playwright.dev/docs/ci); the tagged-release workflow already runs on Ubuntu and is unchanged.

Focused verification passed **15 connected workflow/release/action-pin tests**, with the final updated workflow guard rerun, strict TypeScript, ESLint, immutable action pins and YAML/heredoc parsing. The real PowerShell workflow blocks passed **19 checks**: seven promotion, seven canonical-origin and five tested-inventory controls, including mismatched/missing/non-hex/trailing-newline rejection. An independent review found no artifact-substitution, rebuild or deployment-bypass path. [Run 39092636221](https://github.com/MassimoChiarella/open-prep/actions/runs/39092636221) accepted this CI configuration and passed setup/deployment guards; it is superseded by the closing ledger commit so the full hosted gate runs on the exact final published head. It is not counted as a completed full-suite pass.

The actual Linux revalidation run block was also extracted unchanged apart from YAML indentation and executed through Git Bash: matching source/ref/inventory returned exit 0 and the exact expected hash; a wrong source commit returned exit 1 and created no output. This validates the publisher's local shell/failure propagation, not Ubuntu browser execution. Receipts: `.runtime-cache/followups-2026-10-18/revalidation-20261018-031202/`.

### F05 — Final follow-up source and integration

This record supersedes the earlier delivery's then-current source and follow-up statuses; it does not relabel the earlier expanded audit as a fresh sweep. Clean tested application source is **`955e7f10c6df8194cf5846d9137daa1ff692c6a9`**. The production artifact contains **240 files**, inventory SHA-256 **`ea7e28cdf97f0a0c4aa1f401b192f680b4c3166352a2af816c5901c528b82079`**. The quiet performance build and complete-gate rebuild produced that same inventory.

| Verification | Result and scope |
| --- | --- |
| Complete local gate | **Passed, exit 0**: version/action-pin/authoring checks, repository ESLint, generated route types/strict TypeScript, **1,779 unit tests / 206 files**, static build/budgets and **313 Chromium E2E cases in 8.5 minutes**. Receipt: `.runtime-cache/followups-2026-10-18/full-check.log`. |
| Production payload budgets | Largest JS chunk **420.2/500.0 KiB**; largest route Brotli JS **419.3/480.0 KiB** (`/exhibits/`); install precache **5,264.0/6,144.0 KiB**, **201 files**. |
| Final cross-browser/backup-transfer matrix | **Passed, exit 0: 160/160 in 6.8 minutes**, including Firefox/WebKit smoke and Chromium-to-Firefox/WebKit Complete Backup transfer. Final-source cases include progressive core/enrichment, first offline worker/summary load, silent reset rejection and populated Progress accessibility. Receipt: `cross-browser.log`; native output: `cross-browser-results/`. |
| Targeted native worker/offline controls | **13/13 passed**, including the first saved-summary visit after removing network access, eventual benchmark enrichment, silent reset rejection, backup worker download and cancellation. This targeted receipt precedes F07; final-source full suites are recorded separately. Receipt: `offline-native.log`. |
| Populated Progress native accessibility | **3/3 passed** across Chromium/Firefox/WebKit on the final source. Receipt: `progress-a11y.log`. |
| Final targeted presentation | **20/20 stable states, 20 Axe scans and 20 screenshots**: desktop, mobile, dark mobile, German mobile and Arabic RTL mobile; summary loading/error/completion plus visible Progress personal bests. **Zero tagged violations, captured page errors and horizontal overflow**. Localized labels/values/metadata passed explicit controls; finite animations completed before scanning. Receipts: `visual-final.log`, `visual-final/summary.json`. |
| Hosted verification/deployment | [Run 39090404490](https://github.com/MassimoChiarella/open-prep/actions/runs/39090404490) passed project verification (**1,779 unit tests / 206 files and 313 Chromium cases**). Its cross-browser step logged **158 passing smoke test bodies**, then remained silent before either backup-transfer result and was canceled by the **30-minute job limit**. It is not a completed cross-browser pass; deployment was skipped. Receipt: `ci-955e7f1.log`. F08 addresses CI execution separately. |

Except for the full local gate's explicit path, these receipts are under `.runtime-cache/followups-2026-10-18/`. The earlier failing `visual/` directory remains retained. These targeted checks do not claim that every route/profile from the earlier 754-case sweep was rerun.

### F01/F02 — Final quiet paired performance

The committed continuous-DOM probe compared clean baseline `96edaaa99d7048af8249bdedb3cea33314e324d9` with final `955e7f1` in alternating order within the same quiet window. It retained **240 Dashboard trials and 80 saved-summary trials: 160 pairs, 20 pairs per scenario/rate**, after **16 discarded warmup trials**. Native IndexedDB session/response counts, worker results, complete trial groups, source markers and all reported medians were independently checked. Both measurement processes exited 0 and captured zero page-error exceptions.

The following medians are **milliseconds**, baseline → final; each fixture contains 20 responses per session.

| Dashboard sessions / responses | Native first DOM | Diagnostic 4× first DOM |
| --- | ---: | ---: |
| 200 / 4,000 | 117.60 → 120.85 | 380.45 → 375.95 |
| 1,000 / 20,000 | 317.35 → 319.45 | 502.10 → 502.80 |
| 5,000 / 100,000 | 1,234.25 → 1,228.00 | 1,426.55 → 1,447.90 |

No Dashboard group crosses the predefined increase trigger of **both 100 ms and 15%**; all shifts are within roughly 3%. Every Dashboard trial recorded no main-document task at or above the probe's 50-ms threshold. This comparison establishes no material regression from these follow-ups; it does not retrospectively prove actual DOM timings for audit baseline `627e012`, whose earlier locator-observed results used a different observation method. No speculative Dashboard cache or storage redesign was introduced.

| Saved summary, 5,000 sessions / 100,000 responses | Native first DOM | Diagnostic 4× first DOM |
| --- | ---: | ---: |
| Core scores and question review | 2,411.65 → **89.70** | 2,709.85 → **335.40** |
| Complete badges and correct repeat action | 2,411.65 → 2,436.75 | 2,710.00 → 2,686.55 |

The core marker is the first insertion of the saved-summary header; native UI tests separately verify usable scores, review and worked solutions in that snapshot. Core readiness after two animation frames was **2,429.20 → 111.45 ms native** and **2,757.35 → 430.90 ms at 4×**. These are DOM/two-frame observations, not completed entry-animation or physical-display paint measurements. Core results arrive substantially earlier while lifetime enrichment completes in roughly the same time; the full lifetime scan and all badges remain present.

Each summary cohort's median observed longest main-page task and blocking time was zero. This is not an all-trials-zero claim: two baseline 4× trials recorded 53–56 ms tasks, and four final 4× trials recorded 50–64 ms tasks, with at most 14 ms blocking time. Raw reports: `dashboard-final-paired.json` and `summary-final-paired.json` in the same receipt directory; the earlier `7276dde` comparison is retained as intermediate evidence.

These are warmed local-production Chromium **153.0.8010.12** / Node **24.19.0** desktop measurements on Windows/Ryzen 5 3600 at **1440×1000**, with service workers blocked to isolate runtime readiness and other local test/browser jobs idle. CDP 4× is diagnostic and does not uniformly throttle workers/storage or predict a physical phone. The results do not establish cold-network, offline-cache, other-device or fallback-thread latency. Offline correctness is covered separately by native browser tests.

### Remaining exception and execution boundaries

The fresh advisory inventory still reports **7 high / 0 moderate affected dependency entries from one underlying open braces advisory**. F04 qualified a candidate and found it incomplete; no patch, package identity change or unsupported clean-audit claim was shipped. `SECURITY.md` retains the exception and reassessment controls. F03 completed with a measured rejection of its cache candidate, so production generation remains unchanged.

Physical devices, OS PWA installation/background lifecycle and manual screen readers remain unverified without those environments. Automated Axe, viewport/RTL simulation, root-font scaling and offline emulation do not replace them. No history, backup scope/validation, private-storage consent, deterministic grading or practice feature was removed. Repository pushes do not create a tagged release.

### Published-head verification and development history

This ledger is the **12th focused follow-up commit**, following the earlier 37-commit delivery. The implementation, investigations and focused checks were pushed incrementally to `main`:

| Commit | Milestone |
| --- | --- |
| `b40a1c6` | Executable follow-up phases and acceptance gates |
| `ae2b60a` | Measured expression-cache decision |
| `ce9b2c6` | Continuous readiness instrumentation |
| `c5a8699` | Qualified dependency-remedy assessment |
| `fc3831e` | Generation-checked progressive worker snapshots |
| `e9d9fcc` | Usable core summaries with eventual enrichment/retry |
| `7276dde` | Paired core/completion performance comparison |
| `12b27b3` | Localized personal-best labels/values |
| `d1847ad` | First offline saved-summary and lifecycle regressions |
| `955e7f1` | Populated Progress accessibility |
| `c51ae9b` | Separate cross-browser CI with tested-inventory deployment binding |
| This commit | Final plan, local integration/performance receipts and verification limits |

Application code remains exactly that tested at `955e7f1`; later changes affect CI, its guard test, README and this ledger. At publication, the new platform-isolated hosted gate has not yet completed: [main's CI checks](https://github.com/MassimoChiarella/open-prep/actions/workflows/ci.yml?query=branch%3Amain) record the complete run and deployment for this exact closing commit. The superseded run is canceled rather than treated as failed application verification. A hosted success requires both the Windows full/visual gate and the complete Linux cross-browser/transfer gate; production additionally requires the exact tested inventory and all existing hosted/current-main checks. This document does not predeclare those outcomes. The closing response reports the observed final result separately, without creating another documentation-only full-run cycle.
