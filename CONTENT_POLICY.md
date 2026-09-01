# Open Prep Content Policy

This policy applies to practice content bundled with Open Prep or proposed for the repository-reviewed community catalog. It sets the minimum publication standard; passing the app's importer does not make a pack eligible for the catalog.

Open Prep is a consulting interview preparation platform. Content must directly help learners practice a consulting interview skill, including quantitative reasoning, exhibits, market sizing, questioning, structuring, brainstorming, synthesis, full cases, or behavioral preparation. Industry context is welcome when it serves a clear learning objective. General entertainment, advertising, political persuasion, or other unrelated material is not eligible.

## Safety and respectful representation

Content must not be hateful, abusive, harassing, threatening, dehumanizing, or discriminatory. It must not promote hostility or unequal treatment based on identity or protected characteristics.

Do not use stereotypes as assumptions, explanations, distractors, humor, or shortcuts. Demographic attributes must not stand in for ability, behavior, preferences, income, or business performance. A scenario may examine discrimination or another sensitive issue only when that issue is necessary to a legitimate consulting-learning objective, is presented respectfully, and does not ask the learner to endorse harmful treatment.

## Rights, confidentiality, and personal data

Submit only material that is original, in the public domain, or covered by permission that allows the proposed distribution. Do not submit:

- proprietary case books, interview questions, answer keys, or paywalled material copied or closely adapted without permission;
- confidential client, employer, school, or interview-process information, including trade secrets or material covered by an agreement; or
- content that merely paraphrases a protected source while retaining its distinctive facts, structure, or expression.

Use fictional people and organizations unless a real identity is necessary, relevant, and supported by an authorized public source. Do not include private contact details, identifiers, precise locations, account information, health or financial records, learner responses, or other real personal data. Use aggregated, anonymized, or synthetic data where possible, and remove details that could reasonably re-identify someone.

## Accuracy and teaching quality

Authors and reviewers must distinguish sourced facts from hypothetical assumptions. Check names, dates, units, scales, populations, calculations, citations, and claims against suitable sources. Time-sensitive facts must state the applicable period. Estimates must be labeled as estimates rather than presented as observed facts.

Synthetic or hypothetical data must be identified in the pack's source note or accompanying review record. It must be internally consistent, plausible for the exercise, and must not cite an invented publication or imply that a real organization supplied it. When source data is transformed, record the source and describe material calculations or modifications.

Before publication, a human reviewer must independently check every deterministic answer and rubric, including:

- formulas, intermediate steps, units, scales, rounding, tolerances, and explanations;
- correct choices, distractors, scoring weights, references, aliases, and feedback;
- generated-template boundaries and representative combinations; and
- cross-references and the behavior of the completed exercise in Open Prep.

The answer and rubric must reward defensible consulting reasoning. Distractors must be plausible without relying on trick wording, prejudice, or inaccessible context. Explanations should teach the reasoning rather than only reveal a result.

Structural and semantic validation can check file shape, references, limits, formulas, and bounded runtime safety. It cannot prove ownership, permission, factual truth, answer-key correctness, or teaching quality. Import success and catalog review are not warranties of those qualities.

## Accessibility

Use clear language and provide accurate content-language metadata where the format supports it. Define uncommon abbreviations and avoid unnecessary idioms or culture-specific knowledge. Prompts, answer choices, explanations, units, scales, time periods, and instructions must be understandable without relying only on color, position, sound, or visual inference.

Tables and exhibits need meaningful titles, labels, descriptions, source notes, and a logical reading order. Do not estimate unreadable values or encode missing observations as zero. Review content at narrow widths, with keyboard and screen-reader workflows, and in right-to-left presentation when applicable. Automated checks support this review but do not replace it.

## Software and content licensing

The repository's [MIT License](LICENSE) governs the Open Prep software. Original first-party practice material distributed with the application is covered by the separate [bundled content license](BUNDLED_CONTENT_LICENSE.md). These declarations do not establish permission to distribute unrelated third-party material.

Every catalog pack must have its own approved content declaration and supporting provenance. A contributor does not transfer an unrelated private or imported pack into the bundled-content license merely by opening it in Open Prep.

The catalog allowlist is exactly:

- `CC0-1.0`
- `CC-BY-4.0`
- `CC-BY-SA-4.0`

The complete submitted pack must declare one of these three licenses. Public-domain status for reused source material must still be documented as provenance, with an authoritative notice or other supporting evidence where available; it is not the pack's catalog license. `CC0-1.0` is appropriate only when the submitter has authority to apply its dedication and waiver to their contribution.

A catalog submission must declare:

- the exact allowlisted identifier for the complete distributable pack;
- the author or publisher identity presented to users;
- whether the submitter created the material or the basis on which they may distribute it;
- source and provenance information for material facts, data, and adaptations;
- the title, creator, source location, license or public-domain notice, and modification status needed for each reused source; and
- evidence sufficient for maintainers to review the declaration, such as an authorship statement, permission record, or authoritative license or public-domain notice.

Attribution and notices required by the declared terms must travel with the pack. A submission containing material under different terms must show that the complete pack can be distributed under its declared allowlisted identifier and must preserve all applicable attribution and share-alike notices.

Catalog automation and review must reject `NC` or `ND` terms, custom licenses, unknown identifiers, and missing license declarations. They must also reject any identifier outside the three-item allowlist until maintainers explicitly amend this policy. Maintainer review confirms repository policy eligibility; it is not legal advice, a legal determination, or a guarantee of rights.

## Optional external AI assistance

AI assistance is optional and must never be required to create, review, or use Open Prep content. Open Prep has no runtime AI, remote grading, or external content-generation service; its generation and scoring remain deterministic and local.

When an external AI tool assisted with a catalog submission, disclose the tool and how it was used. Provide only inputs that the submitter has the right to share, and do not provide confidential material or personal data. Do not assume generated output is accurate, original, or distributable.

A human author and reviewer must verify every fact, source, answer, formula, unit, rubric, explanation, accessibility consideration, and rights declaration before submission. AI output is not review evidence and cannot serve as the required human verification.

## Local imports and catalog eligibility

Users may locally import arbitrary packs that satisfy the supported file and runtime rules. Local imports do not need catalog-only review metadata or an allowlisted catalog license, and Open Prep does not upload them for moderation. Importing a pack does not grant it a reviewed status or establish that it is accurate, authorized, accessible, or suitable for redistribution.

Repository publication is different. Only packs that meet this policy, provide the required declarations and evidence, and complete repository review may enter the community catalog.

## Corrections and reporting

Report ordinary factual, answer-key, attribution, or accessibility errors through the repository issue tracker. Include the pack ID, pack version, affected item ID, a concise description, and supporting evidence; do not include unnecessary personal data.

Report copyright, confidentiality, privacy, harassment, or other sensitive concerns privately through the route in [SECURITY.md](SECURITY.md) rather than posting sensitive details publicly. Maintainers may request a correction, reject a submission, or remove a catalog version while a concern is reviewed. Catalog removal does not remotely delete copies already installed in a user's browser.

This policy describes repository publication standards, not legal advice. Contributors and publishers remain responsible for confirming that they can submit and distribute their material. When rights or provenance are uncertain, do not submit the content.
