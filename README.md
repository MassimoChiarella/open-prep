# Open Prep

## Overview

Open Prep is a deterministic, local-first web app for comprehensive consulting interview preparation.

The app trains mental arithmetic, percentages, ratios, growth, weighted averages, business formulas, case-style quantitative problems, guided market sizing, exhibit interpretation, case structuring, brainstorming, synthesis, and behavioral interview skills. Question generation, grading, explanations, scoring, and recommendations run entirely in the browser.

Contributions should preserve the app's deterministic, local-first, static architecture and keep official practice content original, accurate, inclusive, and relevant to consulting preparation.

Users only need a current browser and the deployed web address. They do not need Node.js, a terminal, or an operating-system-specific installer.

**Release status:** no official Open Prep release has been published yet. Branch builds and dirty archives are development previews until the tagged release checklist is complete.

## Open Source

Open Prep software is open source under the [MIT License](LICENSE). Original practice material bundled with the app uses the [bundled content license](BUNDLED_CONTENT_LICENSE.md). Community packs retain their own approved content declaration under the [content policy](CONTENT_POLICY.md); neither project license grants rights to unrelated third-party material.

Contributions are welcome. Read the [contribution guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before proposing a change. Report security issues privately as described in [SECURITY.md](SECURITY.md).

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

In Settings, the Question Pool control can keep built-in content only, add selected installed packs to the built-in pool, or restrict matching practice areas to one or more selected packs. Direct links from the Content Packs workspace still open exactly one pack and temporarily override that saved pool preference.

Local import checks file safety and compatibility, not ownership or accuracy. Packs proposed for the repository-reviewed catalog must also follow the [content policy](CONTENT_POLICY.md) and [community-pack lifecycle](COMMUNITY_PACK_LIFECYCLE.md).

The catalog infrastructure is implemented, but no repository-reviewed community packs are currently published. Bundled examples remain available for authoring and validation.

## Local Development

Requirements:

- Node.js 24.19.0 (the version pinned in `.node-version`; compatible 24.x patch updates are accepted by `engines`).
- npm 11.17.0 (the version pinned by `packageManager`; compatible 11.x patch updates are accepted by `engines`).

Install and start the development server:

```bash
npm ci
npm run dev
```

Open the URL printed by Next.js, normally `http://localhost:3000`.

## Production Build

Create and verify a local static web build:

```bash
npm run build
npm run e2e
npm run preview
```

The verified local build is written to the ignored `out/` directory. It contains HTML, JavaScript, CSS, the web app manifest, icons, and the service worker. It does not require Node.js or a server-side application runtime after it is built. `npm run preview` validates the release marker before serving the build at `http://127.0.0.1:3000`.

An arbitrary or previously generated `out/` directory is not a release artifact. Create a checksummed release candidate from clean `main`, or an official archive from an authorized matching `v<version>` tag, with:

```bash
npm run release:artifact
```

This command runs the complete verification suite, removes stale output, creates a new build, runs Chromium E2E tests against that build, and only then writes the archive, its provenance record, and `dist/SHA256SUMS`. Clean branch candidates and dirty rehearsals receive visibly non-official names and provenance; only the matching reviewed tag may use `open-prep-v<version>.tar.gz` with official status. To rehearse from a dirty development tree, append `-- --allow-dirty`. Automated privacy scanning is a focused heuristic for high-confidence paths, secrets, source maps, test output, and mismatched build metadata; manual archive review remains part of the release checklist.

## Deployment

Extract the verified archive and publish the contents of its single top-level directory to a static web host. The archive must be served from an origin-root HTTP(S) address; double-clicking `index.html` with a `file:` URL is unsupported. No server-side application runtime is required.

Use these host settings:

- Serve the app from the origin root, such as `https://practice.example.com/`.
- Enable HTTPS so browsers can register the service worker.
- Preserve the generated directory structure and trailing-slash routes.
- Serve `sw.js` from the origin root.
- Preserve the generated `_headers` file or configure its equivalent as described
  in [DEPLOYMENT_SECURITY.md](DEPLOYMENT_SECURITY.md).
- Avoid long-lived immutable caching for `sw.js`; the hashed files under `_next/static/` can be cached immutably.
- Enable Brotli or gzip for HTML, JavaScript, CSS, JSON, SVG, and text responses.

After deployment, verify the final HTTPS origin with synthetic data:

```bash
npm run postdeploy:check -- https://practice.example.com/
```

The check validates release identity, routes and 404 handling, manifest icons,
security and service-worker cache headers, root scope, request boundaries on
the exercised synthetic routes, local save/reload, and a warmed offline
restart. It rejects credential-bearing or non-root URLs and does not read
learner records. Historical release upgrades, failed worker installation, and
the complete private-data workflow remain separate release-checklist evidence.

No runtime environment variables, API server, database, account system, or platform-specific launcher are required.

### Vercel

Use a prebuilt deployment so Vercel serves the same static files that passed
verification. From a clean, committed checkout with the pinned Node/npm toolchain:

```bash
npm ci
npm run check
npm run vercel:prepare
```

The preparation command validates the clean release marker and current source,
copies `out/` unchanged into `.vercel/output/static/`, and generates Vercel's
Build Output API configuration from that build's exact security headers. It
preserves trailing-slash routes, Next.js navigation payloads, the custom 404,
and service-worker cache rules. It preserves an existing `.vercel/project.json`.
Commit changes and rebuild before preparing another deployment; dirty or stale
builds are rejected.

With the Vercel CLI installed, sign in and link this directory to the intended
Vercel project using `vercel login` and `vercel link`. Use the **Other** framework
preset for this static, prebuilt deployment. Disable Vercel Toolbar for Preview
and Production in the project's General settings: its injected external
resources do not meet this app's same-origin security policy. Keep deployment
credentials in the CLI's credential store or your CI secret store.

```bash
vercel deploy --prebuilt
npm run postdeploy:check -- https://your-preview-host.vercel.app/
```

The smoke command requires a directly accessible HTTPS origin. If the preview
uses Vercel Deployment Protection, provide an approved accessible validation
deployment; the command does not bypass authentication. Select a stable
production hostname before learners start saving progress there. Once all
official release gates are complete, deploy the verified output with
`vercel deploy --prebuilt --prod` and repeat the smoke check on that hostname.
Preview deployment does not complete the official release checklist.

## Privacy And Local Data

Practice history is stored in IndexedDB for the current browser profile and deployed origin. The app does not upload answers, scores, settings, or recommendations.

Local data is specific to the browser, browser profile, device, and site origin. A browser, operating system, or storage policy may still evict or clear it even after persistence is requested. Moving the deployment to a different domain creates a separate browser data store.

Settings offers a Standard Progress Export and a more complete, scope-controlled Complete Backup. Both downloads are unencrypted cleartext JSON outside the app's control and cannot be recalled. Use them intentionally when moving data between browsers or deployments, and protect or delete downloaded copies as appropriate.

The hosting provider receives ordinary requests for the app's static files. The application does not include analytics, telemetry, external grading, external question generation, external recommendations, or external content APIs.

## Offline And Installation

After a successful online visit, the service worker caches same-origin app routes and assets for offline use. Browsers that support installable web apps can add the app to the home screen or application launcher; this is optional.

Offline behavior should be checked on the final HTTPS deployment because service-worker behavior is tied to the deployed origin.

See [BROWSER_SUPPORT.md](BROWSER_SUPPORT.md) for the supported browser families,
automated engine coverage, and bounded branded-browser/PWA release checks.

## Verification

Run the normal checks:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run e2e
```

`npm run e2e` runs against the current verified `out/` build, so run `npm run build` first. `npm run check` runs the authoring validation plus every command above. `npm run release:artifact` is the source-to-archive release gate.

`npm run build` also checks generated locale payloads and enforces dependency-free size budgets for the largest JavaScript chunk, per-route Brotli JavaScript, and the service-worker install precache. Run `npm run i18n:sync` after editing translation catalogs.

## Runtime Guarantees

- No AI runtime features or agent workflows.
- No external APIs for grading, generation, recommendations, explanations, market sizing, or exhibit data.
- Deterministic, bundled practice content.
- Browser-local progress storage using IndexedDB.
- Same-origin service-worker caching only.

## Repository Guide

- [LICENSE](LICENSE) - MIT terms for using, modifying, and distributing the project.
- [CONTRIBUTING.md](CONTRIBUTING.md) - local setup, project standards, and pull-request expectations.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) - community behavior, private reporting, and enforcement.
- [CONTENT_POLICY.md](CONTENT_POLICY.md) - content quality, rights, license, privacy, and review requirements.
- [COMMUNITY_PACK_LIFECYCLE.md](COMMUNITY_PACK_LIFECYCLE.md) - catalog proposal, review, correction, and withdrawal process.
- [SECURITY.md](SECURITY.md) - supported versions and private vulnerability reporting.
- [Issue forms](.github/ISSUE_TEMPLATE) - focused bug, accessibility, content-error, and feature reports.
- [Pull-request templates](.github/PULL_REQUEST_TEMPLATE) - code, translation, and community-pack review checklists.
- [QUESTION_PACK_FORMAT_V2.md](QUESTION_PACK_FORMAT_V2.md) and [QUESTION_PACK_FORMAT_V3.md](QUESTION_PACK_FORMAT_V3.md) - current content-pack contracts.
- [AGENTS.md](AGENTS.md) - repository guidance for coding assistants.
