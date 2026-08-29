# Contributing

Thank you for helping improve Open Prep.

## Before You Start

- Read the [README](README.md), especially its runtime guarantees.
- For content-pack changes, follow [format v2](QUESTION_PACK_FORMAT_V2.md), [format v3](QUESTION_PACK_FORMAT_V3.md), and the [author guide](public/question-pack-author-guide.md) as applicable.
- Open an issue before beginning a large feature or architectural change.
- Keep changes focused and preserve the deterministic, local-first design.

## Local Setup

Requirements:

- Node.js 20.19.0 or later
- npm

```bash
npm ci
npm run dev
```

## Project Standards

- Do not add runtime services for AI, grading, question generation, recommendations, analytics, content, or progress synchronization.
- Keep user progress and imported content in browser-local storage.
- Use strict TypeScript and pure functions for parsing, generation, validation, scoring, and recommendations where practical.
- Add focused tests when changing shared logic or user-facing workflows.
- Submit only consulting-relevant practice content that you created or have permission to distribute under the MIT License. Do not copy proprietary prep material.
- Verify contributed questions, units, formulas, answers, explanations, and cross-references.
- Do not submit hateful, harassing, discriminatory, dehumanizing, threatening, or unrelated content.
- Use inclusive language and avoid real personal data unless it is clearly fictionalized and necessary to the exercise.
- Keep imported content data separate from application logic.

## Verification

Run the complete verification suite before opening a pull request:

```bash
npm run check
```

This runs linting, type checking, unit tests, the static production build, and Playwright. Update visual baselines only when the rendered change is intentional and has been inspected at every covered viewport.

## Pull Requests

Describe the user-facing behavior, explain how the change improves consulting preparation while preserving the runtime guarantees, identify any storage or content-format changes, and list the checks you ran. Keep unrelated refactors out of the same pull request.

By submitting a contribution, you agree that it may be distributed under the MIT License.
