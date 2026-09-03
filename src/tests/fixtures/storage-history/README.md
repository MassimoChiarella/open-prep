# Storage history fixtures

These fixtures preserve repository-backed storage and progress-export states for
forward migration and import compatibility tests. Record values are deterministic,
fictional test data. Record shapes, store metadata, and envelope semantics come from
the cited repository states; they are not current records with older version numbers.

## Evidence

| Fixture | Repository evidence | What it preserves |
| --- | --- | --- |
| `indexeddb-v7.json` | `4e8fe70c3eae1deb34f609ad8bf1e002b9745989` (`Initial public release`, 2026-08-29) | The immediate predecessor of database v8: ten `id`-keyed stores and no indexes. |
| `progress-export-v3.json` | `4e8fe70c3eae1deb34f609ad8bf1e002b9745989` | Progress export schema v3: nine progress stores, no `privacyScope`, and all practice/private fields included. |
| `progress-export-v4.json` | Legacy-compatible schema v4 contract | A historical `privacyScope: "standard"` export that excludes Fit stories but retains preparation profiles and market-sizing notes. These older fields remain accepted on import. |

Database v8 adds `completed_at_id` on `benchmark_results` with key path
`["completedAt", "id"]` and `imported_at_id` on `question_packs` with key path
`["importedAt", "id"]`. The v7 fixture therefore records an empty `indexes` array
for every store rather than backporting v8 metadata.

The representative question-pack record follows the v2 fixed-numeric example in
`src/tests/unit/questionPack.test.ts` at `4e8fe70`. Progress records follow the
historical interfaces in `src/lib/storage/appStorageTypes.ts`,
`src/features/case-practice/practiceTypes.ts`, and `src/lib/domain.ts` at that same
commit. The export envelopes and store inclusion rules follow
`src/features/settings/localProgressExport.ts` and its tests at the respective
commits.

## Fixture contract

`indexeddb-v7.json` uses a test-only envelope:

- `fixtureFormat` identifies the migration-fixture representation.
- `sourceCommit` identifies the historical schema authority.
- `database.version` is the IndexedDB version supplied to `indexedDB.open`.
- Each store records `keyPath`, `autoIncrement`, complete index metadata, and
  representative records.

The progress-export fixtures are unwrapped application export files so they can be
passed directly to the import validator. Schema v3 is still accepted and normalized
as a complete export; schema v4 remains the current progress-export envelope.

Current Standard Progress Exports exclude Fit stories, preparation profiles, and
market-sizing notes. The v4 fixture preserves older import-compatible content,
not the privacy scope of newly generated Standard Progress Exports.
