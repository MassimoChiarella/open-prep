# Contributing

Thank you for helping improve Open Prep.

## Before You Start

- Read the [README](README.md) and [Code of Conduct](CODE_OF_CONDUCT.md).
- For content-pack changes, follow the [content policy](CONTENT_POLICY.md), [community-pack lifecycle](COMMUNITY_PACK_LIFECYCLE.md), [format v2](QUESTION_PACK_FORMAT_V2.md), [format v3](QUESTION_PACK_FORMAT_V3.md), and the [author guide](public/question-pack-author-guide.md) as applicable.
- Open an issue before beginning a large feature or architectural change.
- Keep changes focused and preserve the deterministic, local-first design.

## Local Setup

Requirements:

- Node.js 24.19.0 (see `.node-version`)
- npm 11.17.0 (see `packageManager` in `package.json`)

```bash
npm ci
npm run dev
```

## Project Standards

- Do not add runtime services for AI, grading, question generation, recommendations, content, or progress synchronization.
- The only analytics exception is the existing Vercel Web Analytics integration on `https://openprep.app`: page views for allowlisted static routes with query strings and fragments removed from reported page URLs. Keep custom events disabled, respect Do Not Track and offline operation, and never read or transmit learner records or content for analytics. Do not add other analytics or telemetry.
- Keep user progress and imported content in browser-local storage.
- Use strict TypeScript and pure functions for parsing, generation, validation, scoring, and recommendations where practical.
- Add focused tests when changing shared logic or user-facing workflows.
- Submit only consulting-relevant practice content that you created or may distribute under one approved content license. The MIT software license does not grant practice-content rights.
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

Choose the focused [code](.github/PULL_REQUEST_TEMPLATE/code.md), [translation](.github/PULL_REQUEST_TEMPLATE/translation.md), or [community-pack](.github/PULL_REQUEST_TEMPLATE/content-pack.md) template. Describe the user-facing behavior, explain how the change improves consulting preparation while preserving the runtime guarantees, identify any storage or content-format changes, and list the checks you ran. Keep unrelated refactors out of the same pull request.

Software and applicable project-documentation contributions are submitted under the repository's MIT License. Practice-content contributions require a separate approved license and the rights, provenance, review, accessibility, and conflict declarations in the content-pack template and [content policy](CONTENT_POLICY.md).
