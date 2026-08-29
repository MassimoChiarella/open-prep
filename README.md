# Open Prep

## Overview

Open Prep is a deterministic, local-first web app for comprehensive consulting interview preparation.

The app trains mental arithmetic, percentages, ratios, growth, weighted averages, business formulas, case-style quantitative problems, guided market sizing, exhibit interpretation, case structuring, brainstorming, synthesis, and behavioral interview skills. Question generation, grading, explanations, scoring, and recommendations run entirely in the browser.

Contributions should preserve the app's deterministic, local-first, static architecture and keep official practice content original, accurate, inclusive, and relevant to consulting preparation.

Users only need a current browser and the deployed web address. They do not need Node.js, a terminal, or an operating-system-specific installer.

## Open Source

This project is open source under the [MIT License](LICENSE). Contributions are welcome; read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing a change. Report security issues privately as described in [SECURITY.md](SECURITY.md).

## Practice Coverage

- Generated arithmetic, percentage, ratio, growth and compounding, weighted-average, business-math, and case-math drills from beginner through expert content.
- Arithmetic controls for 2-5 terms, integers or decimals, operand size, multiplication factors, exact/approximate/remainder division, mixed operators, parentheses, negative values, units, hints, timing, feedback, and 5/10/20/30/custom question counts.
- Quick Fire, Accuracy, Interview Math, Weakness, Daily Workout, benchmark, guided market-sizing, and missed-question review workflows.
- Configurable Interview Math across ten industries and 2-6 calculation steps, with equation setup and interpretation requirements plus deterministic partial-credit scoring.
- Table, bar, line, pie, waterfall, scatterplot, stacked-bar, and index-chart exhibits with numeric and strategic multiple-choice questions.
- Timed 3-5 question Exhibit Sprints with local scoring and summaries.
- Original concept lessons, structuring drills, structured brainstorming, synthesis practice, a private fit-story bank, deterministic weekly prep plans, and an integrated full-case simulation.

## Content Packs

Open Prep supports locally imported question packs without uploading their content or the learner's results. Start with the [question-pack author guide](public/question-pack-author-guide.md); the complete contracts are documented in [format v2](QUESTION_PACK_FORMAT_V2.md) and [format v3](QUESTION_PACK_FORMAT_V3.md).

## Local Development

Requirements:

- Node.js 20.19.0 or later.
- npm.

Install and start the development server:

```bash
npm ci
npm run dev
```

Open the URL printed by Next.js, normally `http://localhost:3000`.

## Production Build

Create and verify the static web artifact:

```bash
npm run build
npm run e2e
npm run preview
```

The deployable site is written to `out/`. It contains HTML, JavaScript, CSS, the web app manifest, icons, and the service worker. It does not require Node.js or a server-side application runtime after it is built. `npm run preview` serves that artifact locally at `http://127.0.0.1:3000` for final checks.

## Deployment

Publish the contents of `out/` to any static web host with these settings:

- Serve the app from the origin root, such as `https://practice.example.com/`.
- Enable HTTPS so browsers can register the service worker.
- Preserve the generated directory structure and trailing-slash routes.
- Serve `sw.js` from the origin root.
- Avoid long-lived immutable caching for `sw.js`; the hashed files under `_next/static/` can be cached immutably.

No runtime environment variables, API server, database, account system, or platform-specific launcher are required.

## Privacy And Local Data

Practice history is stored in IndexedDB for the current browser profile and deployed origin. The app does not upload answers, scores, settings, or recommendations.

Local data is specific to the browser, browser profile, device, and site origin. Moving the deployment to a different domain creates a separate browser data store. Use the Settings export/import controls when moving progress between browsers or deployments.

The hosting provider receives ordinary requests for the app's static files. The application does not include analytics, telemetry, external grading, external question generation, external recommendations, or external content APIs.

## Offline And Installation

After a successful online visit, the service worker caches same-origin app routes and assets for offline use. Browsers that support installable web apps can add the app to the home screen or application launcher; this is optional.

Offline behavior should be checked on the final HTTPS deployment because service-worker behavior is tied to the deployed origin.

## Verification

Run the normal checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
```

`npm run e2e` runs against the current `out/` artifact, so run `npm run build` first. `npm run check` runs the authoring validation plus every command above.

## Runtime Guarantees

- No AI runtime features or agent workflows.
- No external APIs for grading, generation, recommendations, explanations, market sizing, or exhibit data.
- Deterministic, bundled practice content.
- Browser-local progress storage using IndexedDB.
- Same-origin service-worker caching only.

## Repository Guide

- [LICENSE](LICENSE) - MIT terms for using, modifying, and distributing the project.
- [CONTRIBUTING.md](CONTRIBUTING.md) - local setup, project standards, and pull-request expectations.
- [SECURITY.md](SECURITY.md) - supported versions and private vulnerability reporting.
- [QUESTION_PACK_FORMAT_V2.md](QUESTION_PACK_FORMAT_V2.md) and [QUESTION_PACK_FORMAT_V3.md](QUESTION_PACK_FORMAT_V3.md) - current content-pack contracts.
- [AGENTS.md](AGENTS.md) - repository guidance for coding assistants.
