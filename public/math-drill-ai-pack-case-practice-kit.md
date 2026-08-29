# Math Drill AI Pack Kit: Case Practice

Kit revision: **2026-08-18**

Pair this module with `math-drill-ai-pack-authoring-start.md`. It covers only `kind: "case_practice"` packages, including schema versions 2 and 3.

## Canonical contracts

### Version 2

- Format: `math-drill-question-pack`
- Schema version: `2`
- Kind: `case_practice`
- Canonical schema: `question-pack-v2.schema.json`
- Copy-ready complete example: `question-pack-case-practice-example.mathdrill.json`

Version 2 supports any nonempty combination of `structuringPrompts`, `brainstormingPrompts`, `synthesisPrompts`, `lessons`, `fitPrompts`, and `fullCases`. Included collections must be nonempty. Each ordinary collection permits up to 100 items; `fullCases` permits up to 25.

### Version 3

- Format: `math-drill-question-pack`
- Schema version: `3`
- Kind: `case_practice`
- Canonical schema: `question-pack-v3.schema.json`
- Copy-ready questioning example: `question-pack-case-questioning-example.mathdrill.json`
- Copy-ready complete five-stage example: `question-pack-v3-full-case-example.mathdrill.json`

Use version 3 for `questioningPrompts` or a five-stage full case with questioning. Version 3 retains the version 2 collections and adds questioning.

**Schema dependency:** `question-pack-v3.schema.json` contains relative `$ref` references into `question-pack-v2.schema.json`. When giving schemas to an LLM, editor, or external JSON Schema validator, provide both files side by side with those exact filenames. The app already resolves both. The authored package may set `$schema` to `./question-pack-v3.schema.json`; do not embed either schema into the package.

## Choose the case interaction

| Collection | Author when the learner should |
| --- | --- |
| `structuringPrompts` | choose a hypothesis and build/select an issue structure |
| `brainstormingPrompts` | generate/select ideas and prioritize the strongest |
| `synthesisPrompts` | assemble recommendation, evidence, risk, and next step |
| `lessons` | study principles, a worked example, and a knowledge check |
| `fitPrompts` | prepare a behavioral story and follow-up responses |
| `questioningPrompts` (v3) | write clarifying or diagnostic case questions |
| `fullCases` | complete connected stages in one simulation |

Arbitrary graded prose is not supported. Use the authored choices and deterministic rubric structures of these subtypes. A pack may combine related case-practice collections, but a focused package with one subtype is easier to review and repair.

## Version 2 subtype semantics

### Structuring

Author hypotheses, one resolving `acceptedHypothesisId`, branch options, a valid branch selection limit, and a model structure whose branch IDs resolve to authored branch options. Make branches mutually intelligible and collectively useful for the stated objective; do not award correctness to labels alone when their descriptions overlap.

### Brainstorming

Author themed ideas, selection and priority limits consistent with the available ideas, and `priorityIdeaIds` that resolve. Priority should represent business impact/relevance, not merely the longest idea. Keep all ideas plausible enough that selection requires judgment.

### Synthesis

Provide facts and exactly four option groups: `recommendation`, `evidence`, `risk`, and `nextStep`. `correctResponse` selects one resolving option from each group. The correct recommendation must follow from the facts; evidence must support it; risk must be material; next step must address uncertainty or execution.

### Concept lessons

Use one supported lesson topic, principles, a worked example, and a multiple-choice knowledge check whose correct choice resolves. Teach the principle before checking it. Keep bundled content original rather than reproducing proprietary frameworks verbatim.

### Behavioral fit

Fit competencies are `conflict`, `failure`, `impact`, and `leadership`. A fit prompt supplies the primary prompt and authored follow-up questions. The runtime provides preparation/completion practice, not AI evaluation of the learner's story. Do not promise automated prose grading, truth verification, or institutional assessment.

## Version 3 questioning semantics

Every questioning prompt requires ID, title, industry, situation, objective, a valid BCP 47 `language` tag such as `en`, mode `clarifying` or `diagnostic`, ordered whole-number question limits from 1 to 12, concepts, and intents.

A concept has an ID, label, and 1 to 20 aliases. Add the ordinary concise phrases a good learner might use. Aliases are normalized for case, accents, punctuation, whitespace, common question words, and bounded misspellings. They must remain unambiguous: the importer rejects duplicate aliases within a concept and normalized aliases shared across concepts. The matcher has no AI model or hidden business-knowledge corpus; it recognizes only authored concepts, aliases, reference language, and nearby spelling variants.

An intent describes one useful theme. Practical intent pattern:

```json
{
  "id": "revenue_drivers",
  "label": "Revenue drivers",
  "feedback": "Separate revenue into price and volume effects.",
  "priority": true,
  "weight": 30,
  "requiredConceptGroups": [["revenue"], ["price", "volume"]],
  "supportingConceptIds": ["price", "volume"],
  "referenceQuestions": ["Was the revenue change driven by price, volume, or mix?"]
}
```

Concept groups are **AND across groups and OR within a group**. In the example, a learner question needs revenue AND either price OR volume for full concept coverage. Every concept reference resolves within the same prompt. Optional `supportingConceptIds` must come from that intent's required groups. Give each intent 1 to 10 original, naturally different reference questions. Weights must be positive and are normalized; totaling 100 is easiest to audit. At least one intent must have `priority: true`.

The deterministic matcher maps each submitted question to at most one best intent. Similarity is composed of required concept-group coverage (70%), token/canonical-concept overlap with references (20%), and character-trigram similarity (10%). A question must recognize a concept, cover at least half the required groups, and normally reach 0.58 similarity. A declared supporting-concept match can qualify at 0.35. Improve missing valid matches with precise aliases/reference wording rather than lowering or attempting to override runtime thresholds.

Scoring is:

- 40 points for unique weighted-intent coverage;
- 35 points for the proportion of submitted questions recognized by the rubric;
- 10 points for distinctness rather than semantic repeats;
- an optional 15 prioritization points when the learner enables ranking.

Unranked attempts therefore have an 85-point maximum, not a score out of 100. Ranked attempts have a 100-point maximum. Feedback that a question is unmatched means the authored rubric did not recognize it; it is not a claim that the question is objectively irrelevant.

## Full cases and visuals

A version 2 full case requires client, title, situation, calculation question ID, and embedded structure, exhibit, brainstorming, and synthesis stages. A version 3 full case additionally requires embedded `questioning` and uses the same question-writing rules above. Do not add questioning to a v2 full case; change the whole package to version 3.

`calculationQuestionId` must resolve to a numeric question inside the embedded exhibit. The calculation stage renders that exhibit's authored table or chart and labels the response from the referenced question's unit. Author one embedded calculation question unless extra exhibit questions are intentionally reused elsewhere. Recalculate it from stored cells and keep its units/scale consistent.

For embedded visuals, use the structured exhibit rules: dimension columns are text/year, metric columns are numeric, row cells exactly match columns, and chart references resolve. Prefer a table for exact lookup and a simple bar/line chart for comparison or trend. Do not embed images or rely on color alone. Keep the case solvable when rendered in plain labels and values.

Version 2 full cases score four sections at 25 points each. Version 3 scores structure, questioning, calculation, brainstorming, and synthesis at 20 points each. The calculation section is all-or-nothing; other sections reuse their deterministic subtype scoring.

## Authoring quality check

- The package uses v3 exactly when questioning content is present; both schema files accompany external v3 validation.
- Every accepted/correct/priority/model/concept/calculation reference resolves and collection IDs are unique.
- Questioning aliases are specific and unambiguous; groups encode intended AND/OR logic; question limits are ordered.
- Behavioral prompts promise preparation, not automated evaluation.
- Full-case stages share one consistent client, situation, figures, hypotheses, recommendation, and scale.
- The embedded exhibit is readable without an image or color-only cue, and its calculation answer is independently verified.
- The final response follows the Start Here binding output contract and is ready for app validation.
