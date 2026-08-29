# Question Pack Format v3

Schema version 3 extends the deterministic `case_practice` pack with question-writing exercises. All other pack kinds remain on schema version 2. Version 2 case-practice packs remain importable without changes.

Use the strict [Draft 2020-12 JSON Schema](public/question-pack-v3.schema.json), the [standalone questioning example](public/question-pack-case-questioning-example.mathdrill.json), the [complete five-stage full-case example](public/question-pack-v3-full-case-example.mathdrill.json), or the in-app questioning-pack builder in **Settings > Content Packs**.

The v3 schema contains relative references to definitions in `question-pack-v2.schema.json`. Place or register both public schema files together when using an external Draft 2020-12 validator. The app importer already owns this combined semantic contract. Example publisher, license, IDs, scenarios, and source notes are illustrative and must be replaced or omitted unless accurate and authorized.

## Envelope

```json
{
  "$schema": "./question-pack-v3.schema.json",
  "format": "math-drill-question-pack",
  "schemaVersion": 3,
  "kind": "case_practice",
  "id": "my-questioning-pack",
  "packVersion": "1.0",
  "title": "My Questioning Pack",
  "questioningPrompts": []
}
```

This is an envelope fragment, not an importable pack: replace the empty collection with at least one complete prompt, or start from one of the validated examples above.

The ordinary envelope fields follow v2: `format`, `schemaVersion`, `kind`, `id`, `packVersion`, and `title` are required; `$schema`, `description`, `publisher`, and `license` are optional. IDs use lowercase letters, numbers, `_`, and `-`, begin with a letter or number, and contain at most 80 characters.

A v3 file may include any nonempty combination of:

- `questioningPrompts`
- `structuringPrompts`
- `brainstormingPrompts`
- `synthesisPrompts`
- `lessons`
- `fitPrompts`
- `fullCases`

Existing collections keep their v2 shapes and limits. `questioningPrompts` contains 1 to 100 items. `fullCases` contains 1 to 25 items.

## Questioning prompts

Each prompt requires:

| Field | Meaning |
| --- | --- |
| `id`, `title`, `industry` | Stable identity and display metadata. |
| `situation`, `objective` | The case prompt and the learner's task. |
| `language` | A BCP-47 language tag accepted by the browser's `Intl.getCanonicalLocales`, such as `en`, `fr-CA`, or `es`. It controls locale-aware lowercasing and applicable HTML language metadata; it does not translate content or change the authored rubric. |
| `mode` | `clarifying` or `diagnostic`. The current runtime uses it only for the mode label where shown; it does not change matching, thresholds, or scoring. Choose the label that accurately describes the exercise. |
| `minimumQuestions`, `maximumQuestions` | Whole numbers from 1 to 12, with maximum at least minimum. |
| `concepts` | Canonical business concepts and their accepted aliases. |
| `intents` | Weighted rubric themes used for scoring and feedback. |

### Concepts and aliases

A concept has `id`, `label`, and 1 to 20 `aliases`. Include the ordinary terms and concise phrases a good answer may use:

```json
{
  "id": "revenue",
  "label": "Revenue",
  "aliases": ["revenue", "sales", "top line"]
}
```

For collision checks, the importer applies Unicode NFKD normalization, removes accent marks, lowercases text, replaces punctuation with spaces, and trims whitespace. Aliases such as `unit-cost`, `Unit Cost`, and `unit cost` therefore collide. A normalized alias may occur only once: duplicates within one concept and aliases shared by different concepts are rejected because an ambiguous canonical mapping would make feedback unreliable.

During scoring, aliases receive the prompt language's locale-aware lowercasing, punctuation and accent normalization, removal of common English question words, and bounded typo tolerance. Every meaningful token in a multi-word alias must be present in the learner's question. Typo tolerance applies only to tokens of at least five characters and allows roughly one edit per five characters, with an additional fixed trigram check. Keep aliases concise and specific enough to identify one concept.

The matcher does not use an AI model, external API, or hidden general-knowledge corpus. It can recognize only authored concepts, aliases, reference wording, and nearby spelling variants. Add a missing but valid phrase to the appropriate alias list instead of lowering the global threshold.

### Intents

An intent represents one useful question theme:

```json
{
  "id": "revenue_drivers",
  "label": "Revenue drivers",
  "feedback": "Separate revenue into price and volume effects.",
  "priority": true,
  "weight": 30,
  "requiredConceptGroups": [["revenue"], ["price", "volume"]],
  "supportingConceptIds": ["price", "volume"],
  "referenceQuestions": [
    "Was the revenue change driven by price, volume, or mix?"
  ]
}
```

- `weight` must be a finite number greater than zero. Weights are normalized only when calculating the 40-point intent-coverage score, so they do not have to total 100; totaling 100 is easier to review. Weight does not make an intent more likely to win a per-question match.
- `requiredConceptGroups` contains 1 to 10 groups and is evaluated as an **AND of OR groups**. A question must match at least one concept in every group to earn full concept coverage. `[["revenue"], ["price", "volume"]]` means revenue **and either** price or volume; it does not mean any one of the three concepts.
- `supportingConceptIds` is optional. It identifies especially strong concepts from the intent's own required groups that may justify the lower 0.35 partial-match threshold. It does not bypass the recognized-concept or half-of-groups requirements.
- `referenceQuestions` contains 1 to 10 original examples. Each scoring component uses the best matching reference rather than averaging all references, so additional weak references do not dilute a strong one. Include at least one natural question that expresses the intent's required groups with terms recognized by the alias lists. Add only meaningfully different phrasings; put vocabulary variants in `aliases`, not in near-duplicate references.
- `priority` marks a theme that should appear early when a learner opts into ranking. At least one intent must be a priority.
- Every referenced concept ID must resolve within the same prompt.

## Deterministic scoring

Each submitted question is normalized and mapped to its single best authored intent. Ties are resolved by the authored intent order, not by intent weight. The matcher combines:

1. Required concept-group coverage: 70% of similarity.
2. Jaccard overlap of normalized tokens and canonical-concept features with the best reference question: 20%.
3. Character-trigram Dice similarity to the best reference question: 10%.

The final similarity is `0.70 × concept coverage + 0.20 × reference overlap + 0.10 × trigram similarity`, rounded to three decimals. A candidate must contain at least one recognized concept and cover at least half of the intent's required groups. It normally must reach `0.58`. If it matches an author-declared supporting concept, it may instead be accepted at `0.35`; the recognized-concept and half-of-groups requirements still apply. These fixed rules are deterministic and run entirely in the browser.

The unranked score has an 85-point maximum:

- Coverage of unique weighted intents using nonduplicate matches: 40 points.
- Proportion of submitted questions recognized by the rubric: 35 points. A recognized duplicate still counts here, but it cannot add intent coverage.
- Distinct questions rather than same-intent semantic repeats: 10 points.

Each dimension is rounded to a whole point. Ranking is optional. When enabled, every submitted question receives one unique rank from 1 through the question count. The scorer examines the first `K` positions, where `K` is the smaller of the number of priority intents and the number of submitted questions, and awards up to 15 points for distinct priority intents matched there. Duplicate matches do not count. This gives a 100-point maximum. With ranking disabled, the maximum is exactly 85 rather than a score normalized to 100; disabling ranking does not count as a mistake, and saved progress stores the earned score and applicable maximum.

`mode` is display-only in the current runtime. A `clarifying` prompt and a `diagnostic` prompt use the same normalization, similarity formula, thresholds, score dimensions, and optional-ranking logic.

Feedback says that an unmatched question was not recognized by the authored rubric. It does not claim that the question is objectively irrelevant outside the rubric.

## Full cases

A schema-v3 full case embeds a complete required `questioning` object in addition to the v2 `structure`, `exhibit`, `brainstorming`, and `synthesis` objects. It cannot refer to a top-level questioning prompt by ID. `calculationQuestionId` must still identify a numeric question in the embedded exhibit. Copy and adapt the validated [Aster Bikes five-stage example](public/question-pack-v3-full-case-example.mathdrill.json).

The runtime presents questioning, structure, exhibit-and-math, brainstorming, and synthesis as five sections worth 20 points each. Questioning, structure, brainstorming, and synthesis are each converted from their own earned/applicable maximum to a 20-point section and rounded to the nearest whole point. The exhibit-and-math section awards 20 points for a correct numeric answer and 0 otherwise. Consequently, an unranked questioning result of 85/85 and a ranked result of 100/100 both become 20/20 inside a full case; opting out of ranking does not reduce the attainable full-case score. The five section scores sum to 100.

Imported schema-v2 full cases remain four-stage exercises with 25 points per section. A v2 pack must not add `questioningPrompts` or an embedded `questioning` object; change it to schema version 3 and use the v3 schema instead.

## Validation and privacy

The importer also checks semantic rules that JSON Schema cannot express conveniently:

- IDs are unique in their collection.
- Question limits are ordered.
- Language tags are valid.
- Aliases are unambiguous after normalization.
- Intent concept references resolve.
- At least one priority intent exists.
- V3 full cases contain questioning; v2 full cases do not.

The 5 MiB file limit, plain-text rule, local IndexedDB storage, copyright requirements, and prohibition on executable or remote content are unchanged from [Question Pack Format v2](QUESTION_PACK_FORMAT_V2.md).
