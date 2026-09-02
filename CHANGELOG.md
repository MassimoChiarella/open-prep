# Changelog

All notable changes to Open Prep are recorded here. This project follows
[Semantic Versioning](https://semver.org/); release dates use `YYYY-MM-DD`.

Use the headings Added, Changed, Fixed, Security, Migration, and Known
Limitations when they apply. Entries stay under Unreleased until a release is
approved and tagged.

## [Unreleased]

### Added

- Verified Vercel prebuilt deployment preparation with generated security
  headers, static routes, offline cache rules, and deployment instructions.

### Changed

- Load simulation and chart code with the simulation page instead of unrelated
  case-practice pages, keeping all exercise stages ready before practice starts.

### Security

- Update Browserslist and PostCSS selector parser transitive dependencies to
  resolve the reported memory-exhaustion, custom-stats, and recursion advisories.

### Fixed

- Wait for actual service-worker activation during hosted verification instead
  of advancing while asynchronous registration is still pending.
- Exclude generated Vercel output and local tooling from source lint checks.

## [0.1.0] - Pending

This is the pending first public release. No matching Git tag was present when
this record was created. Replace `Pending` with the release date only after the
[release checklist](RELEASE_CHECKLIST.md) is complete and `v0.1.0` is approved.

### Added

- Deterministic, browser-local consulting interview practice across math,
  exhibits, market sizing, case skills, behavioral preparation, benchmarks,
  progress review, and content packs.
- Installable static PWA behavior with same-origin offline caching and no
  account, analytics, AI, grading, recommendation, or synchronization service.
- Local content-pack creation, validation, import, export, installation, and
  repository-reviewed static catalog infrastructure. No community pack is
  published in the initial catalog yet.
- A source-to-archive release command that creates a portable static archive,
  provenance record, release marker, and SHA-256 checksum file.

### Changed

- Product-facing documentation and application identity use `Open Prep` while
  compatibility-sensitive storage, pack, event, and cache identifiers remain
  stable.

### Fixed

- No separately classified fixes are recorded for this pending first release.

### Security

- Release validation performs a focused heuristic scan for personal workstation paths, local file URLs,
  private-key and common token patterns, source maps, environment files, test
  output, symbolic links, and non-portable archive paths. Manual archive review
  remains required because no pattern scan can prove an artifact contains no
  sensitive data.
- Learner progress, imported packs, authoring work, answers, and personal
  practice text remain in the current browser profile unless the user chooses
  to export a file.

### Migration

- This release retains legacy IndexedDB, preference, pack-format, event, and
  service-worker identifiers so existing browser-local data is not stranded by
  the Open Prep identity change.
- Historical IndexedDB v7 and supported Standard Export v3/v4 fixtures now
  exercise forward migration, rollback/reopen behavior, and retained records.
  The first tagged release will establish the formal N-1 release baseline for
  future upgrades.

### Known Limitations

- The manual WCAG 2.2 AA evidence ledger, including NVDA and VoiceOver records,
  is currently `Not run` and `Blocked` in
  `ACCESSIBILITY_RELEASE_GATE.md`.
- The first release remains unpublished until the release checklist is complete.
