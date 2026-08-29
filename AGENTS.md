# AGENTS.md

This file is optional and exists only to guide Codex or other coding assistants while editing this repository. It does not describe the application runtime.

## Project

This repository contains a local-first consulting interview preparation web application.

Use the runtime guarantees in `README.md` and the project standards in `CONTRIBUTING.md` to evaluate whether proposed features and content belong in the project.

The application is not an AI agent, chatbot, tutor agent, or workflow automation product.

## Hard constraints

Do not add:

- AI runtime features
- AI API calls
- LLM SDKs
- Agent frameworks
- Agent workflows
- Speech-to-text APIs
- Text-to-speech APIs for feedback or grading
- External data APIs
- External question-generation APIs
- External grading APIs
- External recommendation APIs

All question generation, validation, scoring, explanations, market sizing grading, exhibit grading, and recommendations must be deterministic and self-contained.

## Preferred stack

- Next.js
- TypeScript
- React
- Tailwind CSS
- IndexedDB
- Vitest
- Playwright

## Engineering standards

- Use strict TypeScript.
- Keep math, validation, parsing, and scoring logic well-tested.
- Prefer pure functions for parser, validator, template engine, formula evaluator, and scoring engine.
- Separate content data from application logic.
- Keep bundled question content original.
- Do not copy proprietary material from consulting prep platforms.
- Do not introduce server dependencies unless explicitly requested.
- Do not transmit user progress externally.

## Testing expectations

Add or update tests when changing:

- Numeric parser
- Formula evaluator
- Answer validator
- Error classifier
- Scoring engine
- Question template engine
- Recommendation engine
- Storage wrapper

## Local-first requirement

The application stores progress locally using IndexedDB.

Preserve the installable PWA and offline-practice support.
