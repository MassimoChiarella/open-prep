# Open Prep Release Checklist

Use a fresh copy of this checklist for each release candidate. An unchecked
item or `Not run` result is not evidence and blocks release. Attach logs,
issues, screenshots, traces, or immutable workflow URLs without including
learner data or personal practice text.

`npm run release:artifact` runs the existing source-to-archive gate. It does
not replace the cross-browser, migration, deployed-origin, repository-setting,
or manual accessibility checks below.

Record all browser, offline, installation, and update execution evidence in
this checklist or in artifacts linked from it. `BROWSER_SUPPORT.md` defines
support policy only; it is not a second execution-evidence ledger.

## Release Record

| Field | Value |
| --- | --- |
| Version and SemVer decision | TBD |
| Release date | TBD |
| Source commit (full SHA) | TBD |
| Source ref (`main` or `v<version>`) | TBD |
| CI run | TBD |
| Archive | TBD |
| Provenance record | TBD |
| `SHA256SUMS` digest record | TBD |
| Release manager | TBD |
| Final decision | Blocked - not run |

- [ ] `package.json`, the root `package-lock.json` entries, `v<version>` tag,
  `CHANGELOG.md` heading, release marker, provenance, archive name, and
  checksum file all use the same approved version.
- [ ] The changelog moves applicable Unreleased entries into the dated release
  and records Added, Changed, Fixed, Security, Migration, and Known Limitations
  where applicable.
- [ ] Release notes link the migration, content, security, accessibility, and
  known-limitation evidence recorded below.

## Source And Automated Gates

- [ ] Start from a clean checkout of protected `main` or the matching reviewed
  `v<version>` tag; `git status --short` is empty and no stale `out/` or `dist/`
  content is used as release input.
- [ ] Record exact Node and npm versions, confirm they satisfy the repository
  toolchain policy, and install only from the lockfile with `npm ci`.
- [ ] `npm run release:artifact` passes from that clean checkout. Its attached
  log must show authoring, product-identity, catalog, i18n, ESLint, strict
  TypeScript, Vitest, clean static build, performance/precache budgets,
  release-marker finalization, Chromium E2E, privacy validation, packaging,
  provenance, and checksums.
- [ ] `npm run e2e:cross-browser` passes the tagged Firefox and WebKit smoke
  projects against the verified build, with any traces/screenshots retained.
- [ ] Intentional Chromium visual baselines were inspected at every covered
  viewport; no baseline was updated solely to make a failure pass.
- [ ] `npm audit --audit-level=high` reports no unapproved high or critical
  vulnerability. Any exception documents reachability, impact, owner, expiry,
  and central approval; lower-severity findings are reviewed and recorded.
- [ ] Dependabot configuration covers npm and GitHub Actions weekly, and its
  pull requests receive the normal CI and central review rather than auto-merge.
- [ ] Every third-party `uses:` reference in `.github/workflows/` is a reviewed
  full commit SHA with a comment naming the human-readable release.

## Artifact Integrity And Privacy

- [ ] `node scripts/prepare-web-build.mjs verify --require-clean` accepts the
  final `out/`, and the marker identifies the expected clean commit, version,
  inventory hash, worker-policy hash, and cache identity.
- [ ] Independently verify both entries in `dist/SHA256SUMS`; the archive and
  provenance digests match the published files.
- [ ] The archive has one `open-prep-v<version>/` root, portable POSIX paths,
  regular files only, and no case-insensitive or Unicode-normalization path
  collisions.
- [ ] The release privacy scan finds no absolute `C:\Users\...`,
  `C:\Documents and Settings\...`, `/Users/...`, or `/home/...` path; local
  `file:` URL; username-bearing workstation path; credential; private key;
  secret-like value; source map; `.env` file; Git data; dependency tree; test
  output; browser profile; IndexedDB dump; or cache dump.
- [ ] Release notes, logs, screenshots, traces, fixtures, and support artifacts
  contain only synthetic data and no learner stories, target firms, notes,
  answers, imported private packs, filenames, usernames, or home-directory
  details.
- [ ] Extract and open the archive on available Windows and macOS systems; its
  static files and checksums are unchanged and no platform-specific launcher or
  server runtime is required.

## Data Safety And Migration

- [ ] Record the current IndexedDB version, Standard Progress Export schema,
  Complete Backup schema, and every supported pack/import schema in the release
  evidence.
- [ ] Preserve the immediately previous public release's IndexedDB fixture and
  every still-supported export fixture from real historical formats, with
  meaningful records, relationships, stores, and indexes. For the first public
  release, record the approved N/A rationale defined below and preserve both
  candidate fixtures used by the required candidate-to-candidate rehearsal.
- [ ] Forward-migration tests preserve intended records and relationships,
  create required stores/indexes, maintain deterministic index order, and cover
  upgrade interruption, abort, and reopen without unapproved data loss.
- [ ] Complete Backup creation/restore, privacy scopes, cross-browser
  portability, selective personal-data clear, full clear, failure rollback,
  and cross-tab invalidation pass.
- [ ] Release notes describe user-visible migration effects, required user
  action, compatibility boundaries, intentional deletion, and recovery or
  rollback guidance. Use `None` only with recorded reviewer approval.

## Content And Scope

- [ ] Every published catalog item passes schema, semantics, checksum,
  compatibility, rights/license metadata, and recorded independent human
  content review plus maintainer approval.
- [ ] Added or changed questions, exhibits, cases, translations, and packs have
  recorded provenance, factual/answer-key review, accessibility review,
  language, license, conflicts, and consulting-preparation relevance.
- [ ] Content corrections and withdrawals follow
  `COMMUNITY_PACK_LIFECYCLE.md`; withdrawal does not remotely delete a user's
  installed local copy.
- [ ] Runtime inspection confirms no AI/LLM SDK, external practice API,
  account, synchronization, remote grading, remote recommendation, remote
  content, or server dependency was introduced. The only analytics or telemetry
  exception is the authorized production Vercel Web Analytics integration.
- [ ] Analytics runs only on `https://openprep.app`, reports page views only for
  allowlisted static routes, removes query strings and fragments from reported
  page URLs, and drops custom events. Do Not Track, offline operation, and
  unavailable analytics preserve practice and local saving; analytics does not
  read local learner stores or enter service-worker caches.

## Accessibility And Manual Evidence

- [ ] Every criterion and generated route/state row in
  `ACCESSIBILITY_RELEASE_GATE.md` is `Ready`, with acceptable result, owner,
  date, exact tool/browser/OS versions, evidence, and known limitations.
- [ ] Automated axe/semantic checks and complete keyboard journeys pass without
  broad rule suppression; any narrow exception has criterion-specific evidence,
  owner, review/expiry condition, and central approval.
- [ ] Manual keyboard, focus recovery, forced-colors, 200% zoom/reflow and text
  spacing, reduced-motion, RTL/mixed-language, timing, validation/error, table,
  and chart checks pass across the required complete processes.
- [ ] NVDA on the documented Windows/browser combination and VoiceOver with
  Safari on macOS pass with exact versions and route/state IDs recorded.
- [ ] The accessibility lead and release manager complete the ledger sign-off;
  automated passing alone is not recorded as WCAG conformance certification.

## Browser, Offline, And PWA

**First public release rule:** When no prior public release exists, record the
public N-1 comparison as `N/A - no prior public release exists`, together with
the repository/tag-history evidence supporting that rationale. This waives
only the public N-1 comparison; `Not run` is not acceptable. A reproducible
candidate A-to-candidate B PWA/update rehearsal is still required from clean
source states. Record both source commits, versions/build markers, the pinned
toolchain, and the exact steps, and cover failed-update fallback, successful
activation, old-cache cleanup, retained local data, browser-process restart,
and offline restart.

- [ ] Record manual sanity results with exact versions for current stable Chrome
  and Edge on Windows, Firefox, and real Safari on macOS. Playwright WebKit does
  not substitute for Safari evidence.
- [ ] Fresh install, install metadata, first load, warmed restart, direct route,
  not-found, and core workflow checks pass at supported desktop and narrow
  viewports.
- [ ] With network disabled, an unvisited core precached route opens, completed
  practice persists, and a previously requested authoring/community file opens
  from runtime cache without becoming part of the install precache.
- [ ] Satisfy the applicable update path: upgrade from the immediately previous
  public release, or, for the first public release only, record the approved
  N/A rationale and complete the candidate-to-candidate rehearsal defined
  above.
- [ ] Performance measurements remain within the checked-in JavaScript,
  per-route Brotli, and service-worker precache budgets.

## Deployment And Security Headers

- [ ] Publish the verified archive's single top-level directory at the origin
  root over HTTPS; preserve trailing-slash routes and serve `sw.js` from `/`.
- [ ] The release origin enforces a tested static-export-compatible Content
  Security Policy without `unsafe-eval`, MIME-sniffing protection, referrer
  policy, permissions policy, and framing protection. Record exact header
  values and any narrowly generated inline-script allowance.
- [ ] `sw.js` is not cached immutably; hashed `_next/static/` assets may be.
  Correct MIME types and Brotli or gzip are enabled for compressible assets.
- [ ] Run `npm run postdeploy:check -- https://<release-origin>/` and
  attach evidence for HTTPS, headers, manifest, the current service worker,
  core routes, request boundaries on the exercised synthetic routes, local
  save/reload, and warmed offline restart. A failed or omitted command is
  release-blocking, not a manual waiver.
- [ ] Separately record the applicable release-transition rehearsal defined
  above, including old-cache cleanup, browser-process restart, and retained
  IndexedDB data. The deployed-origin smoke does not substitute for this gate.
- [ ] The deployed-origin smoke finds no unexpected cross-origin request or
  same-origin write request in its exercised routes. Its sole write exception
  is `POST /_vercel/insights/view` on `https://openprep.app` with a validated
  pageview payload and a reported page URL without query strings or fragments.
  Separate synthetic workflow evidence confirms answers, progress, packs,
  drafts, and personal text are not transmitted; do not infer that broader
  claim from two routes.
- [ ] Security changes and dependency exceptions are documented without public
  exploit details; unresolved vulnerabilities follow `SECURITY.md`.

## Repository Settings

These controls cannot be guaranteed by files in the repository. Record dated
screenshots or settings-audit links for the release.

- [ ] A `main` branch ruleset requires pull-request review and the required CI
  check, blocks force pushes and deletion, and prevents unreviewed direct pushes
  for everyone covered by the release policy.
- [ ] A `v*` tag ruleset restricts tag creation, update, and deletion to the
  approved release path; the release tag is reviewed and points to the recorded
  source commit.
- [ ] GitHub Actions policy and repository workflow permissions follow least
  privilege and the required full-SHA action-pin policy.
- [ ] Private vulnerability reporting is enabled and maintainers can access the
  intake described in `SECURITY.md`.
- [ ] Dependency/security alerts and the selected static-host HTTPS/header/cache
  settings are enabled and were reviewed for this release.

## Evidence Summary And Approval

| Evidence | Link or identifier | Owner | Result |
| --- | --- | --- | --- |
| Known limitations and remediation | TBD | TBD | Not run |
| Migration and backup | TBD | TBD | Not run |
| Content and licensing review | TBD | TBD | Not run |
| Dependency and security review | TBD | TBD | Not run |
| Accessibility ledger and sign-off | TBD | TBD | Not run |
| Windows/macOS and browser manual checks | TBD | TBD | Not run |
| Offline/update and deployed-origin smoke | TBD | TBD | Not run |
| Repository settings audit | TBD | TBD | Not run |

- [ ] Central integration review inspected the actual release diff and evidence,
  confirmed no unrelated work was overwritten, and approved every exception.
- [ ] The release manager confirms every item above is complete, records any
  accepted limitation with an owner and remediation link, publishes the tag and
  checksummed artifacts, and performs the post-release smoke.
