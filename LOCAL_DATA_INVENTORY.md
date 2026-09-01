# Open Prep Local Data Inventory

Status: Frozen implementation contract for complete backup and shared-device clearing

Open Prep has no account, server synchronization, telemetry, or external learner-data service. The data below remains in the current browser profile unless the user exports a cleartext file. Browser-local does not mean permanent or encrypted: browser, operating-system, and storage policies may evict or clear data even after a persistence request, and another person with access to the same browser profile may be able to read it.

## IndexedDB

Database: `consulting_math_drill_tool`

| Store | Data | Classification | Standard Progress Export | Complete Backup |
| --- | --- | --- | --- | --- |
| `drill_sessions` | Settings snapshot, question IDs, optional question/draft snapshot, responses, score, timestamps | Practice progress; answer text may be present | Included | Included with progress |
| `responses` | Raw answer, normalized answer, timing, errors, skill metadata | Practice progress | Included | Included with progress |
| `benchmark_results` | Benchmark identity, score, difficulty, timing policy, timestamps | Practice progress | Included | Included with progress |
| `user_settings` | Explicitly saved drill defaults | Preference/progress | Included | Included with progress |
| `market_sizing_attempts` | Inputs, final answer, score, optional self-review note | Practice progress; `note` is private free text | Included, with `note` removed from newly generated schema-v4 Standard exports | Note requires Private Text selection in the new format |
| `exhibit_attempts` | Raw answer, result, score, timing policy | Practice progress | Included | Included with progress |
| `mistake_notebook` | Prompt/answer snapshot, raw answer, errors, retry state | Practice progress | Included | Included with progress |
| `retry_schedules` | Due dates and retry intervals | Practice progress | Included | Included with progress |
| `practice_records` | Case attempts, preparation profile, Fit stories | Mixed progress and private text/profile | Included except Fit stories and preparation profiles | Fit stories and preparation profile require Private Text selection |
| `question_packs` | Imported pack content and repository-catalog provenance | User-installed content; readable authored text | Excluded | Requires Installed Packs selection |

Standard Progress Export remains import-compatible with schema v3/v4. A newly
generated schema-v4 Standard export includes the nine progress stores, excludes
`question_packs`, and removes Fit stories, preparation profiles, and
market-sizing notes. Older supported files may still contain fields permitted
by their original schema and are disclosed during import review.

## Browser preferences

| Storage | Key | Value | Backup behavior |
| --- | --- | --- | --- |
| `localStorage` | `consulting_math_locale_preference` | Locale or Auto | Complete Backup Preferences selection only |
| `localStorage` | `consulting_math_theme_preference` | System, Light, or Dark | Complete Backup Preferences selection only |
| `localStorage` | `open_prep_timing_accommodation` | Standard, 1.5x, 2x, or Untimed | Complete Backup Preferences selection only |
| `localStorage` | `open_prep_question_pack_pool` | Built-in-only, built-in plus selected packs, or selected-packs-only mode with up to 200 pack IDs | Complete Backup Preferences selection only; missing legacy values normalize to built-in-only |

Timing stores only the functional policy identifier, never a diagnosis or reason. Missing, invalid, and legacy timing values normalize to Standard.

## Excluded transient data

- `sessionStorage` nonce keys matching `consulting-practice:<scope>:nonce` select fresh deterministic practice variants. They are not progress and are never backed up.
- Unsaved React state, including current form drafts, unsubmitted answers, scratchpad text, and authoring-builder edits, is not backed up.
- CacheStorage contains static app files, routes, the catalog, and resources opened on demand. It contains no authoritative user record and is never backed up.
- Service-worker cache-ready markers and generated release metadata are application artifacts, not user data.
- Files already downloaded by the user are outside browser storage control and cannot be recalled or cleared by Open Prep.

## Backup scopes

Complete Backup always includes the selected progress stores and exposes three independent, unchecked optional scopes:

1. **Private Text**: Fit stories, preparation profile, and optional free-text notes.
2. **Installed Packs**: every validated `question_packs` record, including app-owned catalog provenance.
3. **Preferences**: locale, theme, remembered timing policy, and question-pool selection.

The new complete-backup format is bounded to 40 MiB, 10,000 records per ordinary store, 200 packs, 20,200 total records, 10,000 items per nested collection, and 100,000 characters per string. Validation rejects malformed, oversized, unsupported, checksum-invalid, or internally inconsistent input before any write. Missing or unselected sections preserve existing local data.

Complete Backup and Standard Progress Export are UTF-8 JSON and readable cleartext. Export creation and validation remain offline and make no network request.

## Clear scopes

| Action | Removes | Preserves |
| --- | --- | --- |
| Personal Data | Fit stories, preparation profile, and private optional note fields | Math/case attempts, benchmark/exhibit/sizing scores, retry history, packs, non-personal settings, preferences, caches |
| Reset Practice Progress | All nine progress stores, matching existing reset semantics | Installed packs, locale/theme/timing/question-pool preferences, caches, downloaded files |
| Clear All Saved App Data | All ten IndexedDB stores and the four durable preference keys | Static CacheStorage assets and files already downloaded by the user |

Every destructive action previews affected counts and requires separate explicit confirmation. Multi-store changes are atomic. Personal Data and Clear All success broadcasts on `open-prep-local-data`, with `open_prep_local_data_invalidation` as a storage-event fallback. A failed mutation sends no success message. Other tabs must discard rendered private text and navigate to neutral state after successful invalidation.

## Compatibility

- Legacy records with no timing policy are Standard.
- Standard Progress Import continues to accept supported v3/v4 files.
- Complete Backup uses its own versioned envelope and explicit section presence; it does not silently widen Standard Export.
- Unknown future required sections or versions fail before mutation. Optional unselected sections never imply deletion.
