# October 4 audit remediation

## Scope and execution rules

Implement the confirmed findings and improvements in [the audit](BUG_AUDIT_2026-10-04.md), starting from `main` at `77caec9`. Preserve deterministic grading and generation, browser-local progress, static deployment, installable PWA, and offline practice. No learner records are used for verification.

Each milestone contains its implementation, compatibility handling, and focused regression checks in one reviewable commit. Push completed milestones to `origin/main`; do not create extra branches. Independent implementation may proceed in parallel, but commits are assembled and reviewed centrally. The final integration phase runs the complete automated checks and records remaining manual release gates honestly.

## Phases and acceptance criteria

| Phase | Finding | Subphases / required behavior | Status / evidence |
| --- | --- | --- | --- |
| 0 | Audit baseline | Preserve the audit, establish this plan, fetch and compare main. | Complete: clean source; main matched origin/main. |
| 1 | A01 privacy | Persist guided note identities; filter Standard/Complete scopes; count, clear and preserve notes; cover legacy and removed packs. | Complete: 7 focused privacy/backup files / 64 tests passed. |
| 2 | A02 draft concurrency | Atomic draft save/delete revisions; stale resume protection; preserve local text; prevent stale recreation. | Pending |
| 3 | A03 drill recovery | Resolve recovery before accepting answer/skip/timer actions; retain matching session token. | Complete: four focused component suites / 29 tests passed, including delayed recovery and deadline expiry. |
| 4 | A04 benchmark locale | Stable run identity; retain unsent input and completed summaries across locale changes. | Complete: locale/timing/session suites, 2 files / 23 tests passed. |
| 5 | A05/A07 Fit state | Retain active story/prompt and review identity; prevent stale initial reads from hiding later saves. | Complete: Fit lifecycle/shared save suites, 4 files / 49 tests passed; targeted lint passed. |
| 6 | A06 backup bounds | Align Complete inner limits; total record-byte safeguards; existing oversized-record recovery; private roundtrip. | Pending |
| 7 | A08 composed IDs | Align derived identifier limits with maximum legal pack IDs/versions and generated question suffixes. | Pending |
| 8 | A09 tolerated answers | Classify accepted numeric values consistently; retain real outside-tolerance errors and unit partial credit. | Complete: validator/scoring regressions, 2 files / 31 tests passed. |
| 9 | A10 benchmark import | Accept, validate and preserve supported currency metadata. | Complete: importer/persistence suites, 2 files / 16 tests passed. |
| 10 | A11 monetary example | Correct sample flag; synchronize distributed copies; test generated monetary grading. | Complete: sample/authoring suites, 3 files / 76 tests passed; 16 variants at two difficulties earn full currency credit. |
| 11 | A12 unitless sizing | Award correct no-unit output full unit credit; preserve physical/currency omission penalties. | Complete: evaluation/scoring suites, 2 files / 19 tests passed. |
| 12 | A13 dependencies | Compatible framework/config patch; fresh advisory inventory; assess remaining reachable tooling paths. | Pending |
| 13 | A14/I03 backup performance | Worker restore validation; cancellation/identity; reuse Standard serialized output; preserve integrity and atomic restore. | Pending |
| 14 | A15 Settings performance | Lazy inventory; bounded/native counts; correct loading/refresh/clear safeguards. | Pending |
| 15 | A16 decimal precision | Align range validation, generation, formatting and capacity; finite bundled sweep. | Pending |
| 16 | I01 prep plan | Include actual completed sizing/exhibit scores with explicit minimum sample and weakness thresholds. | Pending |
| 17 | I02/I04 guidance | Synchronize template grading docs. Retain current Interview Math rubric unless product policy is explicitly changed. | Pending |
| 18 | Integration | Full check, engine matrix, meaningful performance comparisons; document physical/PWA/assistive-technology gates. | Pending |

## Commit timeline

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

I04: the user chose independent calculation credit, with deductions limited to unit points when the calculation is correct. Implement this as an explicit policy milestone with rubric tests and documentation.

Legacy sizing records did not retain note-field identities. Their unclassified text assumptions are conservatively private, including numeric-looking text and records from removed packs. Standard exports exclude that text, private Complete backups retain it, progress-only replacement preserves it, and personal clearing removes it. The clearing UI explains this compatibility behavior. New attempts retain durable note-field IDs, so their numeric/choice assumptions remain ordinary progress.

Physical iOS/Android, branded Safari/Edge, actual browser zoom, OS PWA installation/update, and NVDA/VoiceOver require human/device evidence. Automated emulation must not mark these release gates passed. This development task does not publish an official release.
