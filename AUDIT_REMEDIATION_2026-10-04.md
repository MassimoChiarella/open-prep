# October 4 audit remediation

## Scope and execution rules

Implement the confirmed findings and improvements in [the audit](BUG_AUDIT_2026-10-04.md), starting from `main` at `77caec9`. Preserve deterministic grading and generation, browser-local progress, static deployment, installable PWA, and offline practice. No learner records are used for verification.

Each milestone contains its implementation, compatibility handling, and focused regression checks in one reviewable commit. Push completed milestones to `origin/main`; do not create extra branches. Independent implementation may proceed in parallel, but commits are assembled and reviewed centrally. The final integration phase runs the complete automated checks and records remaining manual release gates honestly.

## Phases and acceptance criteria

| Phase | Finding | Subphases / required behavior | Status / evidence |
| --- | --- | --- | --- |
| 0 | Audit baseline | Preserve the audit, establish this plan, fetch and compare main. | Complete: clean source; main matched origin/main. |
| 1 | A01 privacy | Persist guided note identities; filter Standard/Complete scopes; count, clear and preserve notes; cover legacy and removed packs. | Complete: 7 focused privacy/backup files / 64 tests passed. |
| 2 | A02 draft concurrency | Atomic draft save/delete revisions; stale resume protection; preserve local text; prevent stale recreation. | Complete: 35 focused unit tests; 15 native IndexedDB engine tests; strict TypeScript passed. Integrated UI regressions scheduled for phase 18. |
| 3 | A03 drill recovery | Resolve recovery before accepting answer/skip/timer actions; retain matching session token. | Complete: four focused component suites / 29 tests passed, including delayed recovery and deadline expiry. |
| 4 | A04 benchmark locale | Stable run identity; retain unsent input and completed summaries across locale changes. | Complete: locale/timing/session suites, 2 files / 23 tests passed. |
| 5 | A05/A07 Fit state | Retain active story/prompt and review identity; prevent stale initial reads from hiding later saves. | Complete: Fit lifecycle/shared save suites, 4 files / 49 tests passed; targeted lint passed. |
| 6 | A06 backup bounds | Align Complete inner limits; total record-byte safeguards; existing oversized-record recovery; private roundtrip. | Complete: boundary/backup/recovery suites, 5 files / 53 tests passed; 17 MiB private record roundtrip verified. |
| 7 | A08 composed IDs | Align derived identifier limits with maximum legal pack IDs/versions and generated question suffixes. | Complete: 6 focused draft/storage/import files / 55 tests passed; maximum composed IDs retain compatibility. |
| 8 | A09 tolerated answers | Classify accepted numeric values consistently; retain real outside-tolerance errors and unit partial credit. | Complete: validator/scoring regressions, 2 files / 31 tests passed. |
| 9 | A10 benchmark import | Accept, validate and preserve supported currency metadata. | Complete: importer/persistence suites, 2 files / 16 tests passed. |
| 10 | A11 monetary example | Correct sample flag; synchronize distributed copies; test generated monetary grading. | Complete: sample/authoring suites, 3 files / 76 tests passed; 16 variants at two difficulties earn full currency credit. |
| 11 | A12 unitless sizing | Award correct no-unit output full unit credit; preserve physical/currency omission penalties. | Complete: evaluation/scoring suites, 2 files / 19 tests passed. |
| 12 | A13 dependencies | Compatible framework/config patch; fresh advisory inventory; assess remaining reachable tooling paths. | Patched: Next/config 16.3.8; brace-expansion 1.1.21 / 5.0.12. Fresh inventory: zero critical, seven high package entries share the unpatched braces tooling advisory. Integrated checks pending. |
| 13 | A14/I03 backup performance | Worker restore validation; cancellation/identity; reuse Standard serialized output; preserve integrity and atomic restore. | Implemented: 9 focused files / 80 tests; strict TypeScript and scoped lint passed. Production measurement pending phase 18. |
| 14 | A15 Settings performance | Lazy inventory; bounded/native counts; correct loading/refresh/clear safeguards. | Implemented: 4 focused files / 35 tests; native counts and compact worker lifecycle verified. Production measurement pending phase 18. |
| 15 | A16 decimal precision | Align range validation, generation, formatting and capacity; finite bundled sweep. | Complete: generator/import range suites, 4 files / 72 tests passed, including 7,680 bundled variants. |
| 16 | I01 prep plan | Include actual completed sizing/exhibit scores with explicit minimum sample and weakness thresholds. | Complete: plan/view suites, 2 files / 12 tests passed using actual persisted module shapes. |
| 17 | I02/I04 guidance | Synchronize template grading docs. Retain current Interview Math rubric unless product policy is explicitly changed. | Complete: synchronized guides; 4 authoring/public-pack files / 83 tests passed. Approved I04 rubric implemented and tested. |
| 18 | Integration | Full check, engine matrix, meaningful performance comparisons; document physical/PWA/assistive-technology gates. | Pending |

## Commit timeline

- `perf(settings): share workers for backups and inventory`: A14/I03/A15 share one bundled worker entry. Validated restore trees remain there until atomic apply; only compact summaries, metadata and Standard export Blobs reach the document. Opening Local Data/Reset loads inventory through native counts and private-bearing cursor scans. These coupled worker changes ship together to avoid duplicate bundles or incomplete operation dispatchers.

- `fix(privacy): enforce imported progress scopes`: independent review found that Standard imports could claim an excluded private scope while including private records. Validation now rejects explicit private content and safely normalizes historical unclassified text without changing checksum inputs. Six scoped backup files / 59 tests passed; actual cookbook persistence covers private text and numeric-looking notes. Near-32-MiB envelope acceptance also passes.

- `fix(content): version the corrected monetary starter`: A11 increments the distributed pack to 1.0.1 and synchronizes both embedded copies; 4 focused sample/importer/authoring files / 106 tests passed.

- `chore(deps): patch framework and brace expansion`: A13 updates compatible locked versions; advisory inventory drops from one critical/eight high to zero critical/seven high entries sharing one unpatched tooling advisory. Lint and type checking are part of integration validation.

- `fix(drills): evaluate deadlines immediately after recovery`: A03 boundary follow-up: recovered clocks are updated immediately; 8 drill component files / 45 tests passed.

- `fix(generator): keep decimal grids within authored bounds`: A16 boundary follow-up: native BigInt decimal grids align exact authored step count/value; 48 ordinary, fine, subnormal and huge grids; 5 files / 78 tests and 20,800 bundled question sweep passed.

- `docs(authoring): align template grading guidance`: I02: tolerance defaults, explicit rounding, decimal precision and currency flags documented consistently; authoring sync check passed.

- `fix(grading): separate calculation credit from unit penalties`: I04: implements the user-approved independent calculation rubric. Wrong units lose unit points while accepted calculation retains credit; 3 focused files / 40 tests passed.

- `fix(content): support composed full-case draft identifiers`: A08: draft validators allow maximum legal namespaced simulation/question IDs; save, backup and resume regression tests included.

- `fix(storage): guard concurrent private drafts`: A02 adds atomic device-local revisions and deletion tombstones, rereads on resume, and retains local work on a conflict. Existing draft records and backups remain compatible.

- `fix(backup): align persisted record and file limits`: A06: Complete progress uses its 40 MiB bound; writes reserve envelope space within a 32 MiB record bound; old oversized records have lossless recovery archives. Historical authenticated progress-only files normalize unknown text without breaking checksum verification.

- `feat(plan): prioritize weak completed module results`: I01: sizing/exhibit priorities use at least three completed scores; incomplete work is excluded and scores are normalized.

- `fix(generator): preserve authored decimal range precision`: A16: one precision-aware grid helper serves validation and generation; unrepresentable steps reject before install.

- `fix(fit): preserve rehearsal identity and loaded edits`: A05/A07: rehearsal identity is captured; late reads cannot erase saved stories or resurrect deleted ones.

- `fix(benchmark): retain sessions across locale changes`: A04: run identity, unsent answers and completed summaries survive language changes.

A01: `fix(privacy): classify guided market-sizing notes` applies one shared privacy classifier to export, scope selection, preservation, inventory and clearing; metadata does not depend on an installed pack.

The commit subject identifies each milestone. Add the exact verification and any compatibility decisions to its entry before committing. Order independent fixes by readiness while preserving dependent storage migrations in safe commits.

- Baseline: `docs(audit): record findings and remediation milestones` — report and execution plan; repository identity verified.
- `fix(sizing): award unit credit to unitless outputs` — A12: plain correct unitless answers receive full unit credit; real missing currency and wrong units retain penalties.
- `fix(content): correct Interview Math monetary example` — A11: monetary flag and generated authoring copies synchronized; every sample variant checked.
- `fix(packs): retain benchmark currency metadata` — A10: shared currency metadata is accepted and preserved; invalid units and metadata still reject.
- `fix(drills): wait for recovery before accepting answers` — A03: inputs, handlers, focus and timer activity wait for recovered state and its matching token.
- A09: `fix(grading): classify tolerated values consistently` — numeric acceptance now gates all numeric error classifications; unit-only partial credit and error history are covered across tolerance types.

## Open decisions and release gates

### Dependency reachability and remaining upstream advisory

Compatible patches remove the critical Next advisory and the brace-expansion advisories. npm resolves the requested compatible Next patch to 16.3.8; the framework and matching ESLint config are locked together. The remaining seven affected package entries (`braces`, `micromatch`, `fast-glob`, `chokidar`, `tailwindcss`, `@next/eslint-plugin-next`, `eslint-config-next`) all trace to one [unpatched braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm). The [brace-expansion advisory](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) is resolved by the locked patches.

Reachability review: Tailwind reads the repository-controlled `./src/**/*.{ts,tsx}` content glob; its watch path uses repository configuration. The Next ESLint rule also resolves repository paths. These packages run during local development/build/lint and are absent from the exported browser runtime. Imported practice packs are browser-local data and never supply these tooling glob patterns. This is a reviewed residual tooling risk, not a demonstrated remotely reachable app defect and not a zero-advisory claim.

Do not apply npm's suggested Next-config downgrade or Tailwind 4 major migration as an incidental security patch. Reassess when upstream provides a supported fix, or undertake a separately validated tooling migration if accepting untrusted build configuration becomes a requirement. Evidence: `.runtime-cache/audit-2026-10-04/dependency-audit-remediated.json`, `npm ls`, local Tailwind content/watch implementation, and static `next.config.mjs`.

I04: the user chose independent calculation credit, with deductions limited to unit points when the calculation is correct. Implement this as an explicit policy milestone with rubric tests and documentation.

Legacy sizing records did not retain note-field identities. Their unclassified text assumptions are conservatively private, including numeric-looking text and records from removed packs. Standard exports exclude that text, private Complete backups retain it, progress-only replacement preserves it, and personal clearing removes it. The clearing UI explains this compatibility behavior. New attempts retain durable note-field IDs, so their numeric/choice assumptions remain ordinary progress.

Physical iOS/Android, branded Safari/Edge, actual browser zoom, OS PWA installation/update, and NVDA/VoiceOver require human/device evidence. Automated emulation must not mark these release gates passed. This development task does not publish an official release.
