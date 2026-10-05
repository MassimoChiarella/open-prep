# October 4 audit remediation — specification, development plan and results

## Scope and execution rules

This ledger implements the confirmed findings and improvements in [the audit](BUG_AUDIT_2026-10-04.md), starting from `main` at `77caec99ba3a3e5f62e8c56bd3a30fe0c55c33ed`. The verified final code is `f7f4a997d00579e584fb0df25ec92214d35ce7fd`, pushed to `origin/main`; application behavior is unchanged from `a95c1c2d99387fedf8fa4225e2342ca1bd2b7728`. The timeline records the exact 34-commit chronological range `77caec9..f7f4a99`, followed by this documentation-only closing milestone: **35 incremental commits/pushes to main**. Audit execution and remediation span October 4–5, 2026.

Preserve deterministic grading, generation and recommendations, browser-local IndexedDB progress, static deployment, installable PWA behavior, and offline practice. No AI runtime, external grading, recommendation or question service was introduced. Verification uses synthetic records and isolated browser contexts. The authorized npm advisory check discloses dependency names and versions only.

Each milestone keeps its implementation, compatibility handling and focused regressions together. Independent implementation proceeds in parallel; commits are assembled, reviewed and pushed centrally to `main`. No extra development branches are required. Coupled worker changes ship together to avoid intermediate incompatible dispatchers or duplicate worker bundles.

**Remediation status:** all implementation phases and automated acceptance are complete. The fresh full `npm run check` on clean `f7f4a99` passed with exit 0: **189 files / 1,540 unit tests**, build/budgets and **301 Chromium tests**. The final cross-engine matrix passed **206 tests**; native inventory/offline acceptance, all six targeted production journeys, quiet performance/capacity probes and final-code CI/verified deployment passed. Every A01–A18 and I01–I04 is accounted for. A13 retains one reviewed, unpatched upstream tooling advisory; manual release gates remain **Not run** under the repository's release policies. This ledger does not declare an official tagged release or accessibility conformance.

## Phases and acceptance criteria

Focused counts describe the recorded milestone checks. The final integration row and evidence sections report fresh acceptance on the verified final code; overlapping focused, Chromium and matrix counts are not added together.

| Phase | Finding | Subphases / required behavior | Implementation and recorded focused evidence |
| --- | --- | --- | --- |
| 0 | Audit baseline | Preserve the audit; establish the plan; fetch and compare main; retain ignored diagnostic evidence. | Complete: baseline main matched origin/main; audit and execution plan committed. |
| 1 | A01 privacy | Persist guided note identities; share filtering across exports, scope selection, preservation, inventory and clearing; handle legacy and removed packs. Follow up on imported scope claims and real historical v4 compatibility. | Implemented: initial seven privacy/backup files / 64 tests; import-scope follow-up six files / 59 tests; historical compatibility eight suites / 94 tests. Actual shipped cookbook note metadata, numeric-looking private strings, removed packs, strict Complete scopes and original checksums covered. |
| 2 | A02 draft concurrency | Atomic read/save/delete revisions; same-tab ordering; stale resume protection; deletion tombstones; lifecycle generations; preserve local work on conflicts. | Implemented: 35 focused unit tests; 15 native IndexedDB engine tests; strict TypeScript. Covered by the passing final full gate and all three engine matrices. |
| 3 | A03 drill recovery | Resolve recovery before input, answer, skip, focus and timer actions; retain the chosen session/token pair; evaluate elapsed deadlines immediately after recovery. | Implemented: initial four component suites / 29 tests; deadline boundary follow-up eight files / 45 tests. |
| 4 | A04 benchmark locale | Keep run identity stable for the intended benchmark/pack/timing route; preserve unsent input and completed summary through display-language changes. | Implemented: two locale/timing/session files / 23 tests. |
| 5 | A05 / A07 Fit state | Retain valid selections and captured story/prompt/review identity across locale reloads; overlay successful mutations so late initial reads cannot hide saves or resurrect deletions. | Implemented: four lifecycle/shared-save files / 49 tests; scoped lint. |
| 6 | A06 backup bounds | Align Complete's inner progress bound; reserve record-envelope bytes; detect existing oversized records; archive before scoped removal; preserve atomic recovery protections. | Implemented: five boundary/backup/recovery files / 53 tests; 17 MiB private record roundtrip; near-32-MiB envelope regression in follow-up coverage. |
| 7 | A08 composed IDs | Permit maximum legal pack/component/version combinations and generated question suffixes through persistence, backup, resume and content conversion. | Implemented: six draft/storage/import files / 55 tests. Existing identifier values remain stable. |
| 8 | A09 tolerated answers | Gate numeric error classification on numeric acceptance; preserve outside-tolerance errors, percentage notation and unit-only deductions. | Implemented: two validator/scoring files / 31 tests. Independent I04 policy is separate. |
| 9 | A10 benchmark import | Accept, validate and preserve supported `answer.currency`; continue rejecting incompatible units and invalid metadata. | Implemented: two importer/persistence files / 16 tests. |
| 10 | A11 monetary example | Add monetary grading metadata; synchronize public and generated authoring copies; version changed distributed content. | Implemented: initial three sample/authoring files / 76 tests; 16 variants at two difficulties earn full currency credit. Pack version advanced to 1.0.1; version/copy follow-up four files / 106 tests. |
| 11 | A12 unitless sizing | Explicitly recognize supported no-unit output; retain missing physical/currency and wrong-unit penalties. | Implemented: two evaluation/scoring files / 19 tests. Correct plain unitless answers receive full credit. |
| 12 | A13 dependencies | Apply compatible framework/config and brace-expansion patches; refresh advisory inventory; inspect remaining tooling reachability. | Applied: Next/config 16.3.8; brace-expansion 1.1.21 / 5.0.12. Fresh final lockfile audit: zero critical, seven high package entries, one remaining upstream braces advisory. Exception and reachability documented below. |
| 13 | A14 / I03 backup performance | Reuse the shared local worker for restore and Standard export; retain heavy validated trees there; return compact metadata/Blob; preserve cancellation, integrity checks and atomic replacement. | Complete with phase 14: nine focused files / 80 tests; final production acceptance and five-trial performance passed. Restore/Standard export showed no observed task ≥50 ms across retained trials. Latency and method boundaries are recorded below. |
| 14 | A15 Settings performance | Defer inventory until Local Data or Reset opens; use native counts and bounded private-store cursor reads; gate loading/confirmation and refresh on changes. | Complete: four focused files / 35 tests; native/offline exact counts and refresh passed. Quiet 200/1,000/5,000-session samples showed no observed task ≥50 ms; 5,000-session opened inventory median ready time was 154.5 / 188.1 ms native / 4×. |
| 15 | A16 decimal precision | Share exact decimal grids between validation, samples, generation and capacity; preserve endpoints; reject unrepresentable ranges. | Implemented: final boundary follow-up five files / 78 tests, 48 ordinary/fine/subnormal/huge grids, and a 20,800-question bundled sweep. |
| 16 | I01 prep plan | Consume actual completed sizing/exhibit results; normalize usable scores; require three usable scored completions rather than three activity records; retain supplemental drill evidence. | Implemented: scored-sample follow-up six suites / 51 tests using mixed legacy/unscored and actual persisted module shapes. |
| 17 | I02 / I04 grading guidance and policy | Synchronize tolerance, rounding, precision and monetary authoring guidance. Apply the user's approved independent calculation credit policy in a separate grading milestone. | Implemented: synchronized guides and authoring checks; four authoring/public-pack files / 83 tests. I04: three focused files / 40 tests; correct calculations retain 30 points while wrong units lose 15 points. No policy decision remains open. |
| 17.1 | A17 follow-up review: malformed pack versions | Reject accepted versions that cannot be URI-encoded into runtime content namespaces; retain valid surrogate pairs and normal versions across shared pack envelopes. | Implemented in `e9afe61`: three focused files / 71 tests; JSON-escaped lone high/low/repeated surrogates reject; valid pairs convert into full-case namespaces without throwing; scoped lint and strict TypeScript passed. Included in the passing final `f7f4a99` full gate. |
| 17.2 | A18 follow-up review: malformed persisted identifiers | Prevent malformed new root `id` / `sessionId` writes and imports; diagnose existing malformed native records; keep history/counts/scores; protect all four summary-link callers; route review to usable localized recovery. | Implemented in `a95c1c2`: 11 focused suites / 110 tests; scoped lint and strict TypeScript passed. Native identifier-recovery journey passed in Chromium, Firefox and WebKit within the final 206-test matrix. |
| 18 | Final integration and acceptance | Full repository check; engine smoke/portability and native/offline results; existing end-to-end accessibility/reflow/locale/keyboard/device regressions; targeted production acceptance; comparable performance probes; reviewed residuals and manual release gates. | Complete: full `f7f4a99` gate, 206-test matrix, six production journeys, native/offline inventory, quiet five-trial performance and capacity controls, central source/evidence review and final-code CI/deployment passed. Upstream advisory and manual release limits remain explicitly tracked. |

## Technical specification and compatibility

These contracts describe application behavior at `a95c1c2`, retained by final source `f7f4a99`. They separate supported data behavior from measurement and release certification.

### A01 — Private notes and historical progress imports

New market-sizing attempts retain `noteInputIds` with their input values. The shared classifier recognizes guided notes and the top-level note even after an installed pack is replaced or removed. In the absence of this metadata, legacy string assumptions are conservatively private, including numeric-looking strings. Standard exports and Complete backups excluding private text remove these fields; private Complete backups retain them. Personal clearing removes private text while retaining compatible scores/progress. Standard-scope replacement preserves existing private data. The clearing interface explains the conservative treatment of legacy input text.

Historical standalone schema-4 files labeled Standard could contain preparation profiles and top-level sizing notes. That behavior predates stronger Standard filtering without a schema-version change. The importer accepts these known legacy-only shapes, retains their original fields and returns `privacyScope: "complete"`. It neither trusts timestamps nor changes the original payload. Historical schema-3 complete imports remain supported. The real v4 fixture stays unchanged; tests retain its actual source records.

Before existing replacement confirmation, the interface warns: **“Importing this file replaces all saved private data and progress. Private records absent from this file will be removed.”** This warning applies to all returned Complete-scope imports, including inferred historical Complete scope. Normalizing legacy scope therefore cannot cause private writes under a returned Standard scope. Complete replacement covers the entire private scope, including records absent from the incoming file.

Standalone Standard files containing Fit stories, full-case drafts or classified guided-note values remain invalid. Modern top-level notes with field-classification metadata remain invalid under Standard scope. New-export self-validation and Complete Backup validation use strict scope checks; a Complete set cannot exploit legacy standalone normalization to import explicit private records under an excluded scope. Historical unclassified input text in an otherwise progress-only Complete section is filtered in returned records only. SHA-256 verification always uses the original payload. Checksums detect integrity changes; they do not authenticate a file's author.

### A02 — Private draft concurrency

A draft read returns its record and `{ generation, revision, exists }` token atomically. Save and delete compare this token inside their write transaction. Revision metadata remains after deletion, so an old absent-record token cannot recreate deleted work. These record revision guards apply to `full-case-draft:` records, rather than every practice-record editing workflow.

Lifecycle generations reject saves superseded by replacement or clearing. Resume rereads the saved draft and token and checks content identity before applying it. Same-tab writes are serialized. Conflicts retain local work and require review of the saved draft before another save. Existing draft records and backups remain readable. Coordination metadata is local infrastructure and is not exported learner content.

### A03 / A04 / A05 / A07 — Stable workflow state

Generated drills wait for recovery resolution before enabling inputs, handlers, focus and timer actions. Recovery adopts the selected session together with its matching storage token. Updating the clock immediately after recovery applies already-expired deadlines rather than briefly accepting an invalid answer.

Benchmark run state is created once for the intended benchmark, content-pack and timing identity. Locale changes update display text while preserving unsent input, elapsed timing and the completed summary. Fit rehearsal captures its started story and prompt; equivalent locale reloads preserve valid selection and review identity. Initial Fit reads cannot overwrite later successful saves or deletions in the visible bank.

### A06 — Consistent byte envelopes and recovery

Persistence rejects records above a 32 MiB budget measured from UTF-8 pretty-printed JSON plus ten bytes per line for outer indentation. This reserves room within Complete Backup's 40 MiB per-file envelope. Embedded Complete progress uses the Complete bound rather than Standard Export's 10 MiB bound. Complete sets retain 64-file and 128 MiB aggregate limits, plus string, collection, nesting and record-count limits.

Diagnostics apply the same byte safeguard so pre-existing oversized records have actionable recovery. Recovery archives original supported values losslessly before explicit removal, then atomically rechecks lifecycle generation and the current record fingerprint. The original-data diagnostic archive is not a restorable Complete Backup. Scoped removal preserves unrelated records; ambiguous ownership prevents automatic removal.

### A08 / A17 — Content identifiers and version validation

Full-case draft simulation and embedded question IDs allow up to 1,200 characters, covering maximum legal pack/component IDs, percent-encoded versions and generated suffixes. A stored draft ID must equal `full-case-draft:` plus its simulation ID. Persistence, backup and resume share record validation. Existing identifiers remain stable; choice/selection identifiers retain their narrower bounds because they are not composed in the same way.

The shared question-pack envelope validates `packVersion` with the actual native URI encoder used by runtime namespaces. Lone UTF-16 high/low surrogates are rejected before install, with a targeted well-formed-Unicode error. Legal surrogate pairs, including supplementary Unicode characters, remain accepted. The guard applies to all six pack kinds; it adds no dependency or runtime API requirement beyond existing encoding.

### A09 / A10 / A11 / A12 / I02 / I04 — Consistent deterministic grading

Numeric tolerance acceptance gates numeric error classification. An accepted value cannot acquire an arithmetic or other numeric error merely because it differs from an exact answer. Values outside the configured tolerance retain meaningful error classification; unit-only errors and partial credit remain distinct.

Benchmark import accepts and preserves supported `answer.currency` metadata while validating incompatible units. The corrected distributed Interview Math sample sets monetary answer metadata, earns full credit for authored currency notation, and is versioned 1.0.1 across public and generated authoring copies. Sizing explicitly treats no-unit outputs as valid no-unit answers; required physical or monetary units retain their omission penalties.

Authoring guidance documents default tolerance, explicit overrides, rounding rules, decimal precision and monetary flags consistently. Generated-template default tolerance is 0.005 in the ordinary displayed answer scale and 0.00005 for percentage ratios; an omitted fixed-numeric tolerance remains exact. Display rounding does not silently replace the grading contract. Templates remain deterministic and self-contained.

The user approved independent calculation credit for Interview Math. Its 30 calculation points use accepted `numericMatch` independently of unit correctness. The 15 units/magnitude points still require the expected selected unit, compatible parsed unit and no magnitude error. With other rubric components correct, an accepted calculation with a wrong unit earns 85/100 and remains incorrect with `unit_error`. Outside-tolerance numbers lose calculation credit. Timed-out answers retain the existing zero-score policy. Equation/setup and interpretation grading are unchanged.

### A14 / A15 / I03 — Shared local worker and Settings inventory

One bundled same-origin module-worker entry serves Complete export, Standard export, restore preparation/application and local-data inventory. Restore parses files, checks bounds/scopes/checksums and retains validated trees in the worker. Only compact preview counts and metadata reach the document; confirmed replacement is atomic under the captured lifecycle generation. Standard export reuses validated serialization and returns a Blob for download.

Abort signals, request identities and worker termination discard obsolete selections/navigation work. Generation guards reject replacement or clearing races. The direct-storage fallback for unavailable workers or injected storage retains correctness, but does not promise worker-level responsiveness. Offline worker availability and same-origin/CSP behavior remain part of integration acceptance.

Settings waits until Local Data or Reset opens before loading inventory. Native IndexedDB counts avoid cloning full public histories; private-bearing stores use cursor scans returning counts only. Loading state gates confirmation, actions refresh relevant inventories, and destructive operations retain transactional storage protections. Performance improvement must be established by the final matching probes rather than inferred from this architecture alone.

### A16 — Exact authored decimal grids

Shared BigInt decimal arithmetic derives grid count and each value from authored finite numbers' canonical decimal representations. Index zero preserves the exact native minimum. Validation samples, runtime generation and capacity use `min + index * step`, with `floor((max - min) / step) + 1` available values. The maximum belongs to the grid only when exactly reached by an authored step.

Validation rejects nonpositive steps, reversed/nonfinite bounds, more than 10,001 values, and steps that cannot produce distinct finite native numbers at the bounds. The formula engine continues receiving native numbers. No approximate ten-decimal truncation collapses supported fine ranges.

### I01 — Usable scored module evidence

Progress summaries derive `scoredCount` from completed attempts with finite usable scores. Sizing additionally requires a positive `maxScore` and normalizes to percentages. The property is a derived summary field, not a persisted-schema migration. Legacy unscored completions still count as activity/completions but cannot satisfy the recommendation minimum.

Each module needs at least three usable completed scores. A mean below 60% adds 70 priority points; 60% to below 80% adds 35; 80% or above adds no weakness boost. Incomplete attempts do not contribute. Existing drill-category evidence remains supplemental, and Dashboard's intentionally math-focused aggregation is not broadened by this plan change.

### A18 — Imported and existing native identifier recovery

A shared well-formed-Unicode predicate rejects lone UTF-16 surrogates in new root `id` and `sessionId` writes and diagnoses existing records with such identifiers. Progress import's nonempty-ID validators also reject empty/whitespace-only or malformed identifiers. Valid surrogate pairs remain legal. Arbitrary answer, note and other text is preserved; this restriction is on identifiers used in URLs, not all saved strings.

Already-persisted malformed native session/result identifiers retain their exact native key strings, history rows, activity counts and scores; no key normalization or schema migration is applied. A shared summary-link helper protects all four link callers. Valid identifiers keep URI-encoded summary links. Identifiers containing lone UTF-16 surrogates produce localized **Review recovery** links to Settings' `#record-recovery` instead of throwing during page rendering. Production export uses the canonical `/settings/#record-recovery` URL. That destination opens both Local Data and Record Recovery; no explicit scroll behavior is claimed.

Recovery reviews the affected session and attributable results, offers the lossless original-data archive, and uses existing scoped removal/generation/fingerprint protections without deleting a neighboring valid session. Focused tests cover archive fidelity and scoped removal. The added native end-to-end journey seeds legacy data only after semantic database readiness; it checks Dashboard, Progress, benchmark history, intact valid links and usable recovery without uncaught errors. It passed in the final full Chromium suite and in each of Chromium, Firefox and WebKit in the final matrix.

## Chronological commit timeline

The subjects below are copied verbatim from Git. Full SHAs make each milestone unambiguous. Verification/harness commits are distinguished from product changes; independent fixes were committed as ready.

| # | SHA | Commit subject | Finding / purpose |
| --- | --- | --- | --- |
| 1 | `25d721d98ee328dd5660540f14a9c089f0c6c53c` | `docs(audit): record findings and remediation milestones` | Baseline audit and ordered implementation plan. |
| 2 | `35bae672787407aecc7f91df81d6173f84a7b487` | `fix(grading): classify tolerated values consistently` | A09 numeric acceptance/error classification. |
| 3 | `213af1327de241b4534ef0cbf2ba3662ab54ce04` | `fix(drills): wait for recovery before accepting answers` | A03 recovered state/token and early-action guards. |
| 4 | `ac9ecf209ff1c22cbcc56de3abe38f6b1e2349a4` | `fix(packs): retain benchmark currency metadata` | A10 schema/import currency contract. |
| 5 | `58afb8cc45e17a99914501ab5bbec91e7cb3d0cb` | `fix(content): correct Interview Math monetary example` | A11 monetary sample and authoring copies. |
| 6 | `38cf97f1a87cf6d1c0a681f4225b134aff9830c7` | `fix(sizing): award unit credit to unitless outputs` | A12 no-unit output credit. |
| 7 | `fa09be140677928a2c23f89600b33fb4aaf5d4ad` | `fix(privacy): classify guided market-sizing notes` | A01 durable note identity and shared privacy handling. |
| 8 | `821761b1282da628116b3e05e52ce8d6c46bb547` | `fix(benchmark): retain sessions across locale changes` | A04 stable benchmark run/input/summary. |
| 9 | `950804414d8f650c5ac6e4723056ce4d8cc51a53` | `fix(fit): preserve rehearsal identity and loaded edits` | A05 / A07 rehearsal locale and late-read protection. |
| 10 | `2e7456db9dd758d9dab8b9c59a73b4853f9671c9` | `fix(generator): preserve authored decimal range precision` | A16 initial shared precision grid. |
| 11 | `6d218f1617df13196243543474557ac06f18f09c` | `feat(plan): prioritize weak completed module results` | I01 completed sizing/exhibit evidence. |
| 12 | `a833f3277f503d3f6b679daade3ebeb462647a3e` | `fix(backup): align persisted record and file limits` | A06 inner bounds, envelope bytes and oversized recovery. |
| 13 | `eee96da949923ac782e37c9d1d4ab4089c0ec3bf` | `fix(storage): guard concurrent private drafts` | A02 atomic revision/token and deletion guards. |
| 14 | `fd779b466ce7e4af251436d4de940bf54aa68d03` | `fix(content): support composed full-case draft identifiers` | A08 derived identifier compatibility. |
| 15 | `f9961be6b06518ef85e95805ebf7af8c2012a1c4` | `fix(grading): separate calculation credit from unit penalties` | I04 approved calculation/unit policy. |
| 16 | `2b68655c1dd8ad548ddeba8fd92dbcb1a80b54ad` | `docs(authoring): align template grading guidance` | I02 synchronized contract documentation. |
| 17 | `d14cd563373d63a735237fe61a249c1f86630c75` | `fix(generator): keep decimal grids within authored bounds` | A16 exact decimal endpoints and capacity follow-up. |
| 18 | `f42fc1f8b68c51013cb569a4c088ea80bf54cd8d` | `fix(drills): evaluate deadlines immediately after recovery` | A03 immediate recovered clock/deadline follow-up. |
| 19 | `b6c4940767be66edb222c3f2240ffb9b9e80c405` | `chore(deps): patch framework and brace expansion` | A13 compatible security/dependency patches. |
| 20 | `7add52b22419ef5f601103ea1c99a09151ea0a4c` | `fix(content): version the corrected monetary starter` | A11 changed distributed content version 1.0.1. |
| 21 | `698bf0d0c9426b4efea828bf1984852f7ad8701c` | `fix(privacy): enforce imported progress scopes` | A01 independent scope review and privacy regressions. |
| 22 | `b4ae79a124b78483be4dd3b7926ced6bd8cae276` | `perf(settings): share workers for backups and inventory` | A14 / A15 / I03 coupled shared-worker optimization. |
| 23 | `03e0b3eca660607e8dc807320ccbb725a355195f` | `test(performance): capture Settings and restore responsiveness` | A14 / A15 / I03 comparable measurement harness. |
| 24 | `d23f279df56c917d68758bb08dbcde8f139cadd8` | `test(settings): open inventory before destructive-data checks` | A15 integration fixtures follow lazy inventory UI. |
| 25 | `6d3b603e3a9dae895819f691a1bc0b6ca601b14a` | `fix(plan): require three scored results for module evidence` | I01 excludes legacy/unusable scores from minimum. |
| 26 | `3eb000f345d0df826002b20f6262635f1a6c7ad1` | `test(performance): verify counts and capture queued long tasks` | Performance positive controls and observation correctness. |
| 27 | `e000e5d8045632ef1fb0d64c32d858babd6c8bdc` | `fix(import): retain private fields from historical progress files` | A01 meaningful real v4 compatibility, inferred Complete scope and warning. |
| 28 | `d86a18901d890db16cd0ad97e782d389cbe6edaf` | `test(storage): wait for database initialization before legacy seeding` | Native recovery fixture readiness after WebKit SSR race. |
| 29 | `ff651040dcc2c6abd689823c55f2503f07761f30` | `test(performance): synchronize storage readiness and task observation` | Performance/native IDB setup and observation boundaries. |
| 30 | `e9afe616abc7eed1ba23d8cd8813f0dc18112a06` | `fix(packs): reject versions that cannot form content identifiers` | A17 shared version Unicode/URI namespace boundary. |
| 31 | `90da89ac6cc6c8b65dd29831875322d856e3bc8f` | `test(privacy): wait for settled views within scoped journey budgets` | Firefox semantic settled-view assertions and scoped slow-journey budget. |
| 32 | `a95c1c2d99387fedf8fa4225e2342ca1bd2b7728` | `fix(progress): recover malformed legacy identifiers without losing history` | A18 write/import/diagnostic guards, safe links and usable recovery. |
| 33 | `7e3c52f358985d927173da11f46cff33a0ad9525` | `test(benchmark): await the saved baseline before locale comparison` | A04 test fixture waits for the initial asynchronous session write before comparing locale persistence. |
| 34 | `f7f4a997d00579e584fb0df25ec92214d35ce7fd` | `test(progress): assert canonical exported route URLs` | A18 native browser expectations follow Next's trailing-slash production URL normalization. |
| 35 | This closing documentation commit | `docs(audit): close remediation with final validation evidence` | Final specification, phase outcomes, reproducible artifact identity, native/offline/locale results, performance/capacity comparison, CI and residuals. No application changes after the verified code. |

## Integration chronology and interpretation

The original audit's clean baseline has its own evidence in `BUG_AUDIT_2026-10-04.md`. Its 609 route/profile cases, 116 additional axe scans and Pixel 7 / iPhone 13 emulation coverage are historical baseline evidence, not newly repeated final matrices. Final acceptance uses the current 301-test Chromium suite's accessibility/reflow/locale/keyboard/offline/device regressions and the targeted production probes below. No complete rerun of those original exploratory matrices is promised here.

1. The first remediation full check reached 1,505 passing unit tests and passing build budgets, but only **299/300 Chromium tests**. The failure was real: strict Standard scope validation rejected the authentic supported historical v4 export. It was not repaired by changing the fixture. `e000e5d` instead preserves actual legacy private fields, returns Complete scope and warns before whole-scope replacement; Complete validation and new exports remain strict.
2. A complete check on **`e000e5d` passed 1,511 unit tests / 188 files, build budgets and all 300 Chromium tests**. This is earlier integration evidence, not acceptance of subsequent A17/A18 source.
3. The first cross-browser matrix reached **202/203**. WebKit's raw legacy seed ran after an SSR heading appeared but before IndexedDB stores initialized. `d86a189` waits for semantic database readiness before injecting historical native records; application recovery behavior was not weakened.
4. The second matrix reached **201/203**. A Firefox privacy journey exceeded its 30-second budget. Separately, `/drills` navigation hit Firefox automation-engine teardown with `NS_ERROR_UNEXPECTED` in `NetworkObserver`; this was not an IndexedDB adapter test. Isolated privacy and navigation investigations passed in approximately **14.0 seconds** and **5.9 seconds**, respectively. `90da89a` uses semantically loaded/settled empty-view assertions and a scoped 60-second budget for the privacy journey. Isolated success is investigative evidence and is not a substitute for the final complete matrix.
5. Source **`a95c1c2`** adds A18 after A17. Its first full-check attempt reached **1,539/1,540 passing unit tests** and stopped on `benchmarkSessionLocale.test.tsx`: the test read its baseline before the first asynchronous saved-session write, making the original record undefined at line 43. `7e3c52f` adds one semantic wait for one saved session before the comparison. The three focused benchmark locale tests passed after this fixture correction; application behavior was unchanged.
6. The **`7e3c52f`** full check passed **1,540 unit tests / 189 files** and build/budgets, but reached only **300/301 Chromium tests**. The sole added native identifier-recovery test expected a raw href without a trailing slash; Next normalized the production exported route to its canonical trailing-slash URL. `f7f4a99` changes browser assertions only to canonical routes. The full native journey then passed in approximately **4.7 seconds** in a scoped run; application behavior was unchanged.
7. The fresh complete `npm run check` from clean **`f7f4a99` completed with exit 0**: **189 files / 1,540 unit tests**, build/budgets and **301 Chromium end-to-end tests** passed. The Chromium suite took **15.2 minutes** and included the new native identifier-recovery journey. Evidence is retained in `.runtime-cache/audit-2026-10-04/remediation-full-check-final.log`; the artifact identity below comes from `out/open-prep-release.json`. Subsequent final matrix, production and performance results are recorded below.
8. The final **`f7f4a99` cross-engine matrix completed with exit 0: 206 passed in 13.4 minutes**. It comprises **68 Chromium, 68 Firefox and 68 WebKit smoke cases**, plus **two Chromium-to-target Complete Backup preference transfers**. A18's native malformed-identifier journey passed in every engine. Evidence: `.runtime-cache/audit-2026-10-04/remediation-cross-browser-final.log`. These counts describe the matrix; its Chromium smoke cases overlap the 301-test full Chromium suite and are not 206 additional unique application journeys.
9. Final-code [CI run 37263341132](https://github.com/MassimoChiarella/open-prep/actions/runs/37263341132) succeeded: both `verify` and `Deploy verified production artifact` completed successfully, including complete checks, matrix, artifact preparation, staged-host smoke and canonical production verification. CI performs `postdeploy:check` on the staged deployment and on `https://openprep.app/`. This is automated hosted evidence, not independent manual host inspection or official release certification.
10. A separate native inventory/offline probe passed on the verified local production preview at `http://127.0.0.1:43140`. It verified exact inventory, cached same-origin worker loading while offline and refresh after a native insertion, with no page errors. The retained JSON/PNG and exact counts are recorded below. It did not measure performance.
11. All six targeted production journeys passed with exit 0. Two earlier probe attempts encountered ambiguous selectors: the import file chooser also had a button role, and Fit's wrapped select labels did not match an exact label query. The ignored probe was narrowed to the actual import button and accessible comboboxes; no application change was needed. The first attempt's log/screenshot and second attempt's JSON/screenshot are retained. The first JSON was overwritten before preservation was requested; this gap is not represented as retained evidence. Final results and three 320px warning screenshots are retained under `production-acceptance/`.
12. With other test browsers closed, the quiet Settings/restore/export probe, five-trial Complete export control and serial near-capacity/oversized/large-record controls all exited 0. Aggregation checked matching environment fields and five retained trials per Settings condition. Results below distinguish medians, single controls, frame gaps and observation limits.
13. Central review reconciled every finding, compatibility contract, commit, final result and residual. This closing documentation commit follows the frozen verified code; its documentation-only changes do not receive the code artifact's SHA or imply a new full-suite run.

## Final automated evidence

| Check on final `f7f4a99` | Result | Evidence |
| --- | --- | --- |
| `npm run check`: pinned runtime/version/action pins/authoring/identity/i18n as applicable; ESLint; strict TypeScript; unit suite; build/budgets; full Chromium | **Passed, exit 0: 189 files / 1,540 unit tests; build/budgets; 301 Chromium tests (15.2-minute Chromium suite).** | `.runtime-cache/audit-2026-10-04/remediation-full-check-final.log`; clean `f7f4a99` artifact identity recorded below. |
| Cross-browser smoke and backup portability, including A18 native identifier recovery | **Passed, exit 0: 206 tests in 13.4 minutes; 68 each Chromium/Firefox/WebKit plus two preference-transfer cases.** | `.runtime-cache/audit-2026-10-04/remediation-cross-browser-final.log`; clean `f7f4a99` verified artifact. |
| Native IndexedDB and offline suite regressions | **Passed within the final full gate and matrix; selected case counts and method boundaries are recorded below.** | Native atomic/recovery/migration and offline worker/cache/practice/locale cases are subsets of the 206 matrix results, not additional totals. |
| Native inventory/offline local production acceptance | **Passed: exact 22 records / six personal items / one pack / two preferences; reopening after native third-story insertion gives 23 records / seven personal items / three Fit stories. No page errors.** | `.runtime-cache/audit-2026-10-04/native-inventory-offline.json` and `native-inventory-offline.png`; verified preview `43140`, cached same-origin inventory worker. |
| Targeted production acceptance | **Passed, exit 0: six journeys; all 320px English/German/Arabic private-import warnings fit, with zero measured horizontal overflow and contained text.** | `.runtime-cache/audit-2026-10-04/production-acceptance/result.json` and `legacy-warning-{en,de,ar}-320.png`; verified `f7f4a99` preview; assertions and visual inspection. Original 609-route/116-axe/device matrices remain historical. |
| A14 / A15 / I03 production performance comparison | **Passed: one warmup and five retained trials per native/4× condition; no observed task ≥50 ms in the retained Settings, Standard export, restore preview and normal Complete export samples. Exact counts and capacity controls passed.** | `.runtime-cache/audit-2026-10-04/remediation-performance-summary.json`; matching synthetic fixtures; measurements, latency tradeoffs and observation limits below. |
| Latest final-code GitHub CI and verified-artifact deployment | **Passed for `f7f4a99`: `verify` and `Deploy verified production artifact` succeeded, including staged and canonical hosted verification.** | [CI run 37263341132](https://github.com/MassimoChiarella/open-prep/actions/runs/37263341132). Older superseded failures are retained above; deployment success is distinct from official release approval. |
| Overall remediation acceptance | **Complete for the planned implementation and automated checks, with the reviewed A13 upstream exception.** | Every A01–A18 and I01–I04 accounted for; independent specification review and central evidence review; manual release gates remain Not run. |

## Native and offline acceptance coverage

The following selected matrix cases are already included in **206 passed**. They are not additional suite totals, and the Chromium cases also overlap the full Chromium gate.

| Selected matrix flow | Cases within the matrix | Verified behavior |
| --- | --- | --- |
| Native atomic storage | 15: five per engine | Private-draft stale overwrite/delete/recreate protection; stale-tab/completion serialization; reset against unnotified stale adapters; transaction/generation rollback; quota-safe generation/recovery reads. |
| Authentic immediate-predecessor migration | Three: one per engine | Native database upgrade preserves records. Other historical fixture/parser coverage remains part of the full Chromium/unit suites. |
| Two-tab and legacy recovery UI | Nine: three per engine | Explicit saved-attempt view/fork, original-data archive, confirmation and unrelated-history preservation. |
| A18 malformed native identifiers | Three: one per engine | Exact legacy history remains visible; valid summary links work; recovery links open usable diagnostics and a faithful original-data archive without uncaught errors. |
| Complete Backup worker offline | Three: one per engine | Same-origin cached bundled worker prepares/downloads a valid progress-only backup with SHA-256 metadata. Chromium/Firefox disable network; WebKit stops its warmed isolated origin because engine offline emulation blocks service-worker delivery. |
| Unvisited precached core route | Three: one per engine | Chromium/Firefox navigate to the route offline. WebKit checks the installed cached response/body; this does not prove a real Safari route restart. |
| Warmed drill saving and selected locale offline | Six: two per engine | Chromium/Firefox reload offline. WebKit validates cached responses and current-page offline practice/locale interaction. All verify the relevant local saved result or locale state. |
| Cross-browser Complete preference transfers | Two | Chromium backups restore language, theme and remembered timing preferences in Firefox/WebKit; these specific transfer cases do not claim every learner-record shape is covered. |

The separate inventory probe uses synthetic native IndexedDB records on the final local production preview. Reset shows **22 records, six personal items, one installed pack and two preferences**. Personal inventory comprises two Fit stories, one preparation profile, one full-case draft and two notes. After closing the disclosure, adding a third Fit story through native IndexedDB and reopening, the displayed counts match **23 records, seven personal items and three Fit stories**. The `local-data-inventory` worker loads from the same-origin cache `math-drill-offline-v0.1.0-58df629eed241b64:static` while offline; no page errors occur.

An empty worker-constructor observation while Settings is collapsed demonstrates deferred worker creation only. It does not prove zero storage reads or measure responsiveness. This probe and the suite's engine-specific offline methods do not substitute for the Not run physical-device, OS PWA or real Safari restart gates.

## Targeted production journeys

The six journeys use isolated synthetic native IndexedDB contexts on the same verified `f7f4a99` preview. The final report has six passed records and no reported error; all contexts and probe processes closed before performance measurement.

| Journey | Verified result |
| --- | --- |
| Offline private scopes and shared worker | Standard export excludes the existing private story; progress-only Complete restore replaces progress while preserving that story. Worker-backed operations use one shared same-origin entry; restore preview/application messages remain compact. Private Complete roundtrip is covered by separate focused backup regressions, rather than this journey. |
| Restore cancellation and reselection | Cancelled/obsolete preparation is discarded; selecting the later backup restores its two sessions and 40 responses. |
| Stale replacement without notifications | A second tab changes the lifecycle generation; stale replacement is rejected and sentinel data/theme remain intact. |
| Actual historical v4 private import | Warning appears before the unchecked replacement confirmation. Before confirmation, existing private records are unchanged. After confirmation, the authentic preparation profile and top-level sizing note are retained, and absent old private records are removed under Complete replacement. English/German/Arabic warnings at 320px have zero page/panel overflow and contained text; screenshots were visually inspected, including RTL. |
| Benchmark locale continuity | Unsent input retains its DOM/run identity through French; completion scores 20/20, saves one result, and retains the original session and completed summary after returning to English. |
| Fit locale continuity | The second story and `conflict-team` prompt remain selected and captured through French; native review saves the intended prompt and seven-second duration. |

Evidence: `.runtime-cache/audit-2026-10-04/production-acceptance/result.json` and warning screenshots. Earlier selector failures are harness corrections recorded in the integration chronology, rather than hidden application failures or extra repair commits.

## Verified static build and local artifact

These values identify the production artifact from the passing final full gate. They do not declare a production-origin deployment, manual browser certification or interaction-performance result.

| Artifact field | Verified value |
| --- | --- |
| Product / version | Open Prep / 0.1.0 |
| Source commit / ref / clean | `f7f4a997d00579e584fb0df25ec92214d35ce7fd` / `main` / `true` |
| Final artifact files | 235 |
| Inventory SHA-256 | `541ac84822abab4edf4f6b51854acde8df129cd2c4b8d6fbe10e02ebe76dcdc3` |
| Worker policy SHA-256 | `10a8001fcb2a7891c26a31cfb958288e08f47d1eb505a6b0d591a4c191f5ad5d` |
| Service-worker cache ID | `math-drill-offline-v0.1.0-58df629eed241b64` |
| Identity evidence | `out/open-prep-release.json` |

| Checked build budget | Final measurement / limit | Result |
| --- | --- | --- |
| Largest JavaScript chunk | 419.3 KiB / 500.0 KiB; `/_next/static/chunks/0wxfllnllr-z8.js` | Passed |
| Largest route JavaScript, Brotli | 416.3 KiB / 480.0 KiB; `/exhibits/` | Passed |
| Service-worker install precache | 5,054.7 KiB / 6,144.0 KiB; 196 files | Passed |

Budget evidence is in the final full-check log at the `perf:check` step. These local artifact values remain separate from interaction measurements and CI's independently built/deployed artifact.

## Performance comparison and capacity results

Baseline and final interaction probes use one warmup and five retained trials per measured condition, Chromium **153.0.8010.12**, Node **24.19.0**, Windows **10.0.26200**, AMD Ryzen 5 3600 and a **1440×1000** viewport. Final measurement ran with other test browsers closed. CPU rate 4 is Chromium throttling, not physical-device evidence. Queued long-task observations are flushed before closing each window. All opened inventory samples assert exactly 21 records per synthetic session; the restore fixture retains the same seven files and **36,084,998 bytes** as baseline.

| Finding / operation | Fixture | Baseline median longest UI task: native / 4× | Final median longest UI task: native / 4× |
| --- | --- | --- | --- |
| A14 restore preview | 1,000 sessions; seven parts / 34.4 MiB | 1,115 ms / 4,373 ms | None observed ≥50 ms / none observed ≥50 ms |
| A15 collapsed Settings | 5,000 sessions / 100,000 responses | 366 ms / 1,570 ms | None observed ≥50 ms / none observed ≥50 ms |
| I03 Standard export | 200 sessions / 4,000 responses | 106 ms / 521 ms | None observed ≥50 ms / none observed ≥50 ms |
| Positive control: Complete export preparation | 1,000 sessions / 20,000 responses | None observed ≥50 ms / none observed ≥50 ms | None observed ≥50 ms / none observed ≥50 ms |

Every retained sample in these final groups has no observed task ≥50 ms, rather than merely a zero median. The same is true of collapsed/opened inventories at 200 and 1,000 sessions. This is an observation floor, not zero work or guaranteed frame smoothness.

| Operation | Baseline median maximum frame gap: native / 4× | Final median maximum frame gap: native / 4× | Baseline ready time: native / 4× | Final ready time: native / 4× |
| --- | --- | --- | --- | --- |
| Restore preview, 1,000 sessions | 1,118.5 / 4,374.7 ms | 18.2 / 28.3 ms | 2,021.5 / 5,472.4 ms | 1,888.8 / 1,922.7 ms |
| Standard export, 200 sessions | 118.1 / 522.6 ms | 18.7 / 35.8 ms | 231.9 / 787.1 ms | 436.8 / 679.6 ms |
| Collapsed Settings, 5,000 sessions | 375.9 / 1,593.7 ms | 18.3 / 64.2 ms | Different observation endpoint | No hidden inventory completion endpoint |
| Opened Reset inventory, 5,000 sessions | Not measured separately | 18.2 / 30.0 ms | Not measured separately | 154.5 / 188.1 ms |
| Complete export preparation, 1,000 sessions | 21.7 / 28.0 ms | 18.9 / 29.1 ms | Not used for the comparison | 4,925.4 / 5,500.9 ms |

Settings now has a fixed two-second collapsed observation window including hydration/preferences, whereas baseline stopped when its eager hidden inventory completed. Its elapsed values are therefore **not comparable route-ready latency**, and absence of rendered inventory does not prove no storage reads. The 4× collapsed 1,000-session group still had a maximum individual frame gap of **114.8 ms** despite no observed long task. Native Standard export ready latency rose from 231.9 to 436.8 ms; the measured benefit is responsiveness, with that latency tradeoff recorded rather than a claim that every operation became faster. Complete export still takes seconds while work runs away from the document. Its median busy-paint latency was **14.5 / 18.3 ms** native / 4×.

| Separate capacity control | Result, native and 4× | Measurement boundary |
| --- | --- | --- |
| Near aggregate cap: 3,700 sessions / 74,000 responses | Preview has **77,700 records**, **25 files**, **133,636,291 bytes**, below the 134,217,728-byte limit; no observed task ≥50 ms. | One control run per rate, not a median. Preparation took 18,173.5 / 17,789.2 ms. |
| Over aggregate cap: 5,000 sessions / 100,000 responses | Actionable 64-file / 128 MiB limit error; no invalid download preview; no observed task ≥50 ms. | One control run per rate; 4× maximum frame gap 127.8 ms. Existing history is retained. |
| Large persisted session: one session / 250 responses | Preview has **251 records**, **two files**, **25,185,749 bytes**; no observed task ≥50 ms. | One control run per rate; this checks preparation/envelopes. Large private-record restore fidelity is covered separately by the focused 17 MiB roundtrip and near-32-MiB boundary regressions. |

Raw baseline remains unchanged at `.runtime-cache/audit-2026-10-04/performance/settings.json`. Final Settings samples are `.runtime-cache/performance/remediation-oct04/settings.json`; Complete controls are `.runtime-cache/performance/backup-remediation-oct04-{normal,near,oversized,large}.json`. The environment-checked aggregate is `.runtime-cache/audit-2026-10-04/remediation-performance-summary.json`. These ignored artifacts support the durable values above; they do not certify physical phones, all hardware or production-load behavior.

## Dependency reachability and remaining upstream advisory

Compatible locked patches remove the critical Next advisory and the brace-expansion advisories. Next and matching ESLint config are 16.3.8; brace-expansion versions are 1.1.21 and 5.0.12. The latest authorized **package-lock-only** npm check used pinned Node 24.19.0 / npm 11.17.0 and is saved as `.runtime-cache/audit-2026-10-04/dependency-audit-final.json`.

The final report is semantically identical to the preceding remediated report: **zero critical, seven high, zero moderate/low/info**. Seven affected package entries (`braces`, `micromatch`, `fast-glob`, `chokidar`, `tailwindcss`, `@next/eslint-plugin-next`, `eslint-config-next`) trace to one underlying [GHSA-vfj7-8cjw-p6xm advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), npm source `1240992`. It concerns stack-exhaustion denial of service from deeply nested brace patterns in braces ≤3.0.3. No new compatible patch or changed advisory/reachability path was found.

Tailwind reads the repository-controlled `./src/**/*.{ts,tsx}` glob and repository watch configuration. Next ESLint's glob path also consumes repository paths. These packages operate in development/build/lint tooling and are absent from the static browser runtime; browser-imported practice packs cannot provide their glob patterns. This is a retained upstream tooling risk, not zero-advisory status or a demonstrated remotely reachable browser defect. Untrusted build configuration would change that exposure assessment.

Do not apply npm's suggested Next ESLint config downgrade to 14.2.35 or Tailwind 4.3.3 major migration as an incidental patch. Reassess a supported upstream fix, or conduct a separately validated tooling migration if required. The [brace-expansion advisory](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) is resolved by the locked patches. The remaining advisory is explicitly tracked rather than suppressed.

## Manual release gates — Not run

The policies in [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md), [ACCESSIBILITY_RELEASE_GATE.md](ACCESSIBILITY_RELEASE_GATE.md) and [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) remain authoritative. This remediation has not supplied the following manual evidence. Each row remains **Not run**; a missing device or reviewer cannot be counted as a pass from engine automation. Record exact candidate SHA/origin, browser/OS/tool versions, reviewer/date, evidence and limitations when a gate is actually performed.

| Required manual gate | Result | Required scope |
| --- | --- | --- |
| Current stable branded Google Chrome on available Windows device | **Not run** | HTTPS candidate, keyboard/home/direct/unknown route, generated drill/exhibit, save/reload, theme/locale/RTL persistence, warmed offline route and saved interaction. |
| Current stable branded Microsoft Edge on available Windows device | **Not run** | Same supported-family manual process; Chromium automation is separate. |
| Current stable branded Mozilla Firefox on available Windows or macOS device | **Not run** | Same supported-family manual process; controlled Playwright Firefox is separate. |
| Current stable real Apple Safari on available macOS device | **Not run** | Same supported-family process, keyboard/Tab discovery with OS Full Keyboard Access, actual offline route/browser restart; WebKit does not substitute. |
| Physical iOS and Android | **Not run** | Real touch/keyboard/viewport rotation, practice/save/reload, navigation, local storage and platform behavior on recorded devices. |
| Actual 200% browser zoom/reflow and manual visual process review | **Not run** | Complete processes; no content/function loss; permitted table exceptions; root-text enlargement and narrow viewport are separate evidence. |
| Manual accessibility process coverage | **Not run** | Keyboard/focus recovery, forced colors, text spacing, reduced motion, RTL/mixed language, timing, errors/statuses, chart/table equivalence and imported/authored-content extremes. |
| NVDA with documented Chrome/Windows combination | **Not run** | Full required route/state and complete-process matrix, announcements, controls, charts/tables and timing with exact versions. |
| VoiceOver with Safari/macOS | **Not run** | Independent full required route/state and complete-process matrix with exact versions. |
| Accessibility criterion/state decisions and sign-off | **Not run** | Every applicable ledger row Ready with evidence; reviewed N/A rationales where appropriate; accessibility lead and release manager approval. Automated axe is not conformance certification. |
| OS/browser PWA installation and update surfaces | **Not run** | Displayed name/icons, standalone launch, warmed offline restart, retained data and subsequent update; explicitly record unavailable platform surfaces. |
| Release-transition rehearsal on actual candidate origins | **Not run** | Applicable N-1 or approved first-release N/A plus candidate-to-candidate rehearsal; failed-update fallback, activation, old-cache cleanup, browser-process/offline restart and retained IndexedDB data. |
| Independent manual production-host HTTPS/privacy/header inspection | **Not run** | CI has performed staged and canonical automated `postdeploy:check` successfully for final code. Independent human host/configuration review and broader private-workflow inspection on the actual HTTPS candidate remain unperformed; record reviewer, origin, versions and evidence separately. |
| Independent human content/translation/accessibility/provenance review | **Not run** | Changed published material and required catalog approval; automated schema/answer tests do not replace release content review. |
| Repository/host security and policy settings audit | **Not run** | Dated evidence for main/tag rules, required review/CI, force-push/deletion protections, Actions permissions/pins, private reporting, dependency alerts and selected host HTTPS/header/cache controls. |
| Formal release integration review, exception approval and publication sign-off | **Not run** | Actual final diff, evidence, upstream exception, known limitations, release tag/checksummed artifacts and post-release smoke. Automatic production deployment is distinct from official release publication. |

No manual release check has been marked passed by this remediation. Automated acceptance is complete; physical-device, assistive-technology, human review and release-sign-off evidence remains distinct and unperformed. Outstanding required gates keep an official tagged release blocked under the current policies; automatic deployment and completed remediation automation do not clear them.
