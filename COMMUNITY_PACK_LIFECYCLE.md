# Community Pack Lifecycle

Status: Active governance contract; catalog infrastructure is implemented and currently contains no published community packs

Applies to: packs proposed for the repository-reviewed community catalog

This document defines how a community pack enters, changes, and leaves the
Open Prep catalog. It does not change the local import contract in
[`QUESTION_PACK_FORMAT_V2.md`](QUESTION_PACK_FORMAT_V2.md) or
[`QUESTION_PACK_FORMAT_V3.md`](QUESTION_PACK_FORMAT_V3.md).

The [`CONTENT_POLICY.md`](CONTENT_POLICY.md) defines content eligibility,
license interpretation, and review standards. This document defines the
repository process and metadata that enforce those decisions. Structural
validation cannot prove factual accuracy, answer-key correctness, ownership,
privacy, accessibility, or educational quality.

## Principles

- Catalog review happens in the repository. It requires no account, API,
  analytics, remote moderation service, or runtime revocation mechanism.
- Community packs are untrusted until both automated validation and human
  review pass.
- Only maintainers may issue the **Repository reviewed** badge.
- A badge is bound to one exact pack ID, version, SHA-256 checksum, and source
  lineage. It never transfers to another version, file, publisher, fork, or
  local replacement.
- Accepted pack bytes and review evidence are append-only. Content changes use
  a new version; later lifecycle events preserve earlier evidence.
- Review records must be traceable without requiring a reviewer's legal name,
  email address, employer, or other public personal data.

## Repository Records

An accepted version uses this layout:

```text
public/community-packs/<id>/<version>/pack.mathdrill.json
public/community-packs/<id>/<version>/review.json
```

`<id>` is the pack envelope's stable `id`. `<version>` is a valid SemVer value
and must exactly equal the pack envelope's `packVersion`. Local-only packs may
continue using the broader opaque `packVersion` contract; the catalog uses
SemVer so updates can be ordered deterministically.

`review.json` is repository-owned metadata. A pack file may describe its own
publisher or license, but those self-declared fields never issue a badge.
The catalog generator must validate `review.json`, bind it to the exact UTF-8 bytes of the
pack, and generate the public catalog manifest from accepted repository data.

### Required metadata

The following names and meanings are frozen for the catalog metadata schema.
All fields are required unless the rule explicitly permits an empty array.

| Field | Rule |
| --- | --- |
| `reviewSchemaVersion` | Integer `1`. |
| `id` | Stable pack ID; must equal the pack envelope and directory ID. |
| `version` | SemVer; must equal `packVersion` and the version directory. |
| `file` | Repository-relative pack path. It must resolve within the matching ID/version directory. |
| `sha256` | Lowercase, 64-character SHA-256 of the exact pack file bytes. |
| `title` | Catalog title matching the pack envelope title. |
| `summary` | Short consulting-preparation description; not copied from proprietary material. |
| `kind` | One supported pack kind matching the pack envelope. |
| `topics` | Nonempty, unique list from the catalog topic taxonomy. |
| `difficulties` | Nonempty, unique list from the catalog difficulty taxonomy. |
| `language` | One canonical BCP-47 language tag for the authored content. |
| `publisher.id` | Stable lowercase catalog publisher identifier. An organization name or pseudonymous repository identity is acceptable. |
| `publisher.name` | Public display name chosen by the publisher. Personal legal identity is not required. |
| `contentLicenseId` | One approved content identifier: `CC0-1.0`, `CC-BY-4.0`, or `CC-BY-SA-4.0`. Software's MIT license does not license pack content. |
| `rights.basis` | One of `original`, `licensed`, or `mixed`. Public-domain source status belongs in provenance and does not replace `contentLicenseId`. |
| `rights.declaration` | Explicit statement that the publisher has the right to distribute every included element under `contentLicenseId`. |
| `rights.evidenceReferences` | Repository references or public source/license references supporting the declaration. May be empty only for wholly original work, which must be stated in `provenance.sourceNotes`. |
| `provenance.sourceNotes` | Nonempty account of how the content, facts, data, scenarios, and answer keys were created or sourced, including whether data are synthetic. |
| `provenance.sourceReferences` | Public or repository references used for factual verification. May be empty only when the source notes explain why no external source applies. |
| `compatibility.minimumAppVersion` | Minimum Open Prep SemVer that supports the pack. |
| `compatibility.packSchemaVersion` | Integer `2` or `3`, matching the pack envelope. |
| `submissionReference` | Stable issue, pull request, or repository record for the proposal. |
| `conflicts.declared` | Boolean explicitly stating whether a conflict exists. |
| `conflicts.statement` | `None declared` when false; when true, identifies the relationship and the mitigation or recusal. Do not include unnecessary personal data. |
| `review.reviewDate` | Human review completion date in `YYYY-MM-DD` form. |
| `review.reviewerReference` | Traceable repository handle, review permalink, or maintainer-resolvable opaque record. |
| `review.evidenceReference` | Immutable pull-request review, commit, or repository evidence record. |
| `review.checks.editorial` | Human result and evidence for consulting relevance, clarity, inclusion, and educational usefulness. |
| `review.checks.factual` | Human result and evidence for claims, data, units, dates, assumptions, and source treatment. |
| `review.checks.answerKey` | Human result and evidence for answers, formulas, tolerances, explanations, rubrics, and cross-references. |
| `review.checks.accessibility` | Human result and evidence for language, labels, alternatives, readability, and avoiding color-only or inaccessible meaning. |
| `review.checks.rights` | Human result and evidence for the license, declaration, provenance, attribution, proprietary-content, and privacy review. |
| `review.maintainerApprovalReference` | Traceable repository approval through which a maintainer issues the badge. |
| `events` | Nonempty append-only lifecycle event list beginning with `accepted`. |

Every review check is an object with `result` and `evidence`. `result` is
`pass` or `not_applicable`; `not_applicable` requires a specific rationale in
`evidence`. A failed or pending check cannot be accepted. At least one human
reviewer, independent of the submitter and publisher, must cover all five
review areas. Several reviewers may divide the areas, but every area must have
traceable evidence before maintainer approval.

The approving maintainer records a separate approval act. A repository handle,
review permalink, or opaque reference resolvable by maintainers is sufficient;
no reviewer needs to publish private identity or contact information.

Each lifecycle event contains `type`, `date`, `reference`, and `reason`.
`type` is `accepted`, `corrected`, `deprecated`, or `withdrawn`. A correction,
deprecation, or withdrawal also records `replacementId` and
`replacementVersion` when a replacement exists. Existing event and review
entries must never be edited or deleted; later decisions append an event.

## Lifecycle

### 1. Proposal

A proposal supplies the pack file, draft `review.json`, required declarations,
and a stable repository reference. The contributor must use an unused ID for a
new source or demonstrate same-source continuity for an update. Proposal does
not imply acceptance or a badge. Contributors supply the submission fields;
reviewers and maintainers complete the review and initial `accepted` event.

### 2. Automated structural validation

CI must objectively verify:

- the canonical parser, semantic validator, runtime limits, and plain-text
  restrictions;
- metadata shape, required declarations, approved license identifier, BCP-47
  language, controlled taxonomies, and compatibility;
- exact path, ID, version, schema, and SHA-256 agreement;
- unique catalog identity and permitted same-source update ordering; and
- deterministic generation of the static catalog record.

An automated failure blocks review. A pass only establishes structural and
runtime compatibility; it is not evidence of truth, rights, accessibility, or
teaching quality.

### 3. Human review

Human review is recorded separately from automation in five areas:

1. **Editorial:** consulting relevance, scope, clarity, inclusive treatment,
   usefulness, and originality of presentation.
2. **Factual:** claims, source notes, dates, datasets, units, assumptions, and
   truthful synthetic-data labeling.
3. **Answer key:** calculations, formulas, tolerances, scoring rules,
   explanations, rubrics, and references between pack items.
4. **Accessibility:** language metadata, understandable instructions,
   meaningful labels and text alternatives, readable content, and no reliance
   on color alone.
5. **Rights and privacy:** authorship or distribution authority, approved
   license, attribution, provenance, proprietary material, confidential data,
   and personal data.

Conflicts must be declared before review. A conflicted reviewer must recuse
from any affected area or record a maintainer-approved mitigation. The minimum
independent human review cannot be supplied by the submitter or publisher.

### 4. Acceptance

A maintainer may accept a version only when automation passes, every human
check passes or has an approved `not_applicable` rationale, conflicts are
resolved, and the checksum matches the reviewed bytes. Acceptance adds the
initial `accepted` event and authorizes the catalog publication workflow to include that exact version
in the generated catalog with a Repository reviewed badge.

Maintainers alone issue or remove the badge. A field inside a pack, a publisher
claim, a prior version's badge, or a local import can never issue it.

### 5. Version update

A same-source update keeps the ID and publishes a strictly higher SemVer in a
new directory. It must retain a continuous publisher and provenance chain,
pass all automated checks, receive a new human review, and receive a new
maintainer approval. The previous review remains unchanged.

A content fork, unrelated source, or unverified publisher/source change must
use a new ID. A documented publisher transfer may retain the ID only when the
rights holder authorizes it and maintainers verify continuity; the new version
still receives an independent review and a new badge bound to its own checksum.

### 6. Correction

Never edit accepted pack bytes in place. Publish the corrected content under a
new SemVer, normally a patch version for a compatible factual, wording, or
answer-key fix. Re-run the complete automated and human review. Append a
`corrected` event to the affected version that names the accepted replacement.
If the defect could materially mislead or harm users, withdraw the affected
version while the correction is reviewed.

### 7. Deprecation

Deprecation marks a version as discouraged while preserving discovery and
installation when continued availability is appropriate. Append a
`deprecated` event with the reason and preferred replacement. The badge still
describes the historical review of the exact bytes; it is not a recommendation
to prefer deprecated content.

### 8. Withdrawal

Withdrawal prevents new catalog discovery and installation of that version.
Append a `withdrawn` event and retain a non-sensitive tombstone with the reason,
date, repository reference, and replacement when one exists. Remove the pack
from current downloadable catalog output when rights or privacy require it.

Open Prep has no account or remote device-control service. Withdrawal cannot
remotely delete, disable, inspect, or alter copies already installed in a
browser or cached for offline use. The catalog may show an update or withdrawal
notice when a user later loads current same-origin catalog data, but local
removal remains the user's explicit action.

### 9. Copyright or privacy takedown

Copyright and privacy reports use the private route in [`SECURITY.md`](SECURITY.md)
so reporters do not need to publish sensitive evidence. Maintainers should:

1. Record a private, traceable case reference and limit access to necessary
   reviewers.
2. Promptly withdraw the affected catalog version while assessing a credible
   report; do not republish personal, confidential, or proprietary evidence.
3. Seek a correction, verified permission, redaction, or permanent withdrawal,
   then record only a non-sensitive public outcome.
4. Remove affected bytes from current catalog and release surfaces when
   required, while preserving the minimum lawful audit record.

Repository history, third-party mirrors, prior downloads, and offline installs
may persist independently. Maintainers must not promise remote deletion that
the static, local-first architecture cannot perform.

## Identity, Updates, And Conflicts

- Catalog IDs are globally unique across publishers and source lineages.
- `id` identifies the content lineage; `version` identifies one immutable set
  of bytes within that lineage.
- Same ID, same source, higher version is an update candidate, never an
  automatic trusted update. It needs explicit user replacement after preview
  and a fresh repository review.
- Same ID, different source is a conflict. Repository submission is rejected
  until the new source chooses a new ID. In the app, a conflicting local pack
  must not be silently replaced; the user must explicitly keep or replace it.
- A manually imported, edited, forked, or locally replaced pack is unreviewed
  unless its ID, version, source, and checksum exactly match an accepted catalog
  record installed through the catalog verification path.
- Replacing a reviewed local pack with different bytes removes its reviewed
  provenance. Reusing an ID or publisher name never transfers a badge.
- Catalog withdrawal prevents new catalog discovery and installation but has no
  authority over existing browser-local or offline copies.

## Dry Runs

### Valid initial submission

1. A publisher proposes `profitability-foundations` version `1.0.0` under
   `CC-BY-4.0`, declares original exercises, documents synthetic data and
   source checks, and supplies all required metadata.
2. CI validates schema v2, IDs, runtime semantics, compatibility, metadata, and
   checksum. Independent human evidence passes editorial, factual, answer-key,
   accessibility, and rights review.
3. A maintainer approves the exact checksum. The accepted event is appended and
   maintainers may publish that version with the Repository reviewed badge.

### Correction

1. Review finds a unit error in `profitability-foundations` `1.0.0`; maintainers
   append a withdrawal event because the answer could mislead learners.
2. The same publisher submits corrected version `1.0.1` with continuous source
   notes. CI and every human review area run again.
3. After maintainer approval, `1.0.1` receives its own badge and `1.0.0` records
   a correction pointing to it. Existing local `1.0.0` copies are unchanged.

### Withdrawal

1. A private rights report identifies unauthorized source material in version
   `1.0.1`. Maintainers record the private case and withdraw the version.
2. The generated catalog stops offering discovery or installation and retains
   a non-sensitive tombstone. No badge transfers to a replacement.
3. Previously installed or offline copies remain on users' devices until those
   users remove or replace them.
