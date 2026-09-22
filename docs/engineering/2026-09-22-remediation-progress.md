# Audit remediation execution ledger

Started 22 September 2026 from `a54775d` on `codex/audit-remediation-2026-09-22` in an isolated worktree. This preserves concurrent authoring work in the primary checkout. The [specification](2026-09-22-remediation-spec.md) and [development plan](2026-09-22-remediation-plan.md) define the scope: 20 findings, four improvements, and recorded observations.

Node 24.19.0 and npm 11.17.0 are the pinned toolchain. Existing public formats remain unchanged unless the compatibility ledger explicitly records otherwise. Each verified increment receives its own focused commit and push; no milestone is complete from code presence alone.

Tracking requirement: [GitHub issue #25](https://github.com/MassimoChiarella/open-prep/issues/25). Package numbers identify scope; independent repairs can land while prerequisite-dependent work continues. The final integration preserves these individual commits.

| Package | Scope | Status | Evidence / integration note |
|---|---|---|---|
| S00 | Baseline and specification | In progress | Isolated source, pinned tooling, requirement #25, and durable documents established; quiet performance baselines still pending |
| S01 | Atomic storage capability | Open | |
| S02 | Conflict-aware drill persistence | Open | AUD-01 |
| S03 | Input/storage/export limits | Open | AUD-02 |
| S04 | Finite parser and legacy sign | Implemented | AUD-03; 50 focused parser/validation/submission tests passed; overflow submission remains exportable |
| S05 | Scoped incompatible-history recovery | Open | IMP-02; legacy AUD-02/03 |
| S06 | Runtime cache failure isolation | Implemented; integration pending | AUD-04; 24 service-worker tests passed; production-worker browser regression added |
| S07 | Profile save protection | Implemented; integration pending | AUD-05; 4 profile tests passed, focused lint clean; delayed-write browser regression added |
| S08 | Whole-session feedback deadline | Open | AUD-06 |
| S09 | Coherent weighted-sales wording | Implemented | AUD-07; All 985 configured tuples independently checked; 8 content tests passed |
| S10 | Correct-answer display precision | Open | AUD-08 |
| S11 | Unitless Interview Math | Open | AUD-09 |
| S12 | Generated identity compatibility | Open | AUD-10 |
| S13 | Bulk authoring responsiveness | Open | AUD-11; reconcile concurrent source changes |
| S14 | Long Fit story containment | Open | AUD-12 |
| S15 | Hidden-field validation | Open | AUD-13; reconcile concurrent source changes |
| S16 | Mobile help placement | Open | AUD-14; reconcile concurrent source changes |
| S17 | Backup responsiveness | Open | AUD-15 |
| S18 | Finite weighted questioning | Open | AUD-16 |
| S19 | Reachable brainstorming coverage | Open | AUD-17 |
| S20 | Decimal range review counts | Open | AUD-18 |
| S21 | Native ID pattern validity | Open | AUD-19; reconcile concurrent source changes |
| S22 | Actual private-note counts | Open | AUD-20 |
| S23 | Lifetime-history responsiveness | Open | IMP-01 |
| S24 | Negative starting-number guidance | Open | IMP-03 |
| S25 | Integrated regression/compatibility | Open | IMP-04; manual evidence remains distinct |
| S26 | Integration and final evidence | Open | |

## Verification record

No implementation acceptance checks have been recorded yet. Historical audit evidence is described in the planning documents; it does not substitute for testing the changed application.

## Manual release evidence

Physical-device keyboards/PWA installation, branded Safari/iOS, NVDA/VoiceOver, true browser zoom/forced colors, and final deployed-origin checks must retain explicit recorded outcomes. Automated browser engines do not establish these results.
