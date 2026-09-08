# Open Prep bug audit — September 7, 2026

**30 confirmed issues: 8 P1, 19 P2, 3 P3. Six improvements are tracked separately.** Reviewed commit `9d25cbe82489bdaaa5678ea7fecd12962f236fb8` on `main`. This records the original audit. Current repair status and validation are maintained in [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md); the backlog below is updated as fixes land.

Repair from the top of the table. P1 means an urgent data-loss, broken-workflow, offline, or material grading problem to address before a release; P2 means a reproducible functional defect to fix in the next repair batch; P3 means a narrower validation/scoring edge case. Order within each priority weighs impact and how readily the condition occurs. No P0 issue was established.

## Ordered repair backlog

| Order | Priority | Issue | Status |
|---|---|---|---|
| BUG-01 | P1 | A stale file read can import the wrong backup after confirmation | Fixed (step 02) |
| BUG-02 | P1 | Standard export/import deletes private records excluded from the export | Fixed (step 02) |
| BUG-03 | P1 | Applying an update can break offline reopening | Fixed (step 05) |
| BUG-04 | P1 | Fit Story textareas lose focus after every character | Fixed (step 03) |
| BUG-05 | P1 | Reloading after the final answer strands a completed drill | Fixed (step 06) |
| BUG-06 | P1 | Nine built-in exhibit questions hide required input figures | Fixed (step 07) |
| BUG-07 | P1 | Decimal multiplication rejects both the exact answer and its explanation | Fixed (step 08) |
| BUG-08 | P1 | A built-in four-percentage-point gap is graded as 0.04 and displayed as zero | Fixed (step 07) |
| BUG-09 | P2 | Backup preparation can retain private text after the scope is unchecked | Fixed (step 02) |
| BUG-10 | P2 | Reset and restore leave stale views able to resurrect or overwrite records | Fixed (step 02) |
| BUG-11 | P2 | Growing practice history exceeds the app's own backup/import limits | Fixed (step 09) |
| BUG-12 | P2 | A completed Fit save discards newer edits | Fixed (step 03) |
| BUG-13 | P2 | Session timers inflate per-question times and distort benchmark scoring | Fixed (step 06) |
| BUG-14 | P2 | Interview Math rejects the monetary scale syntax its prompt requests | Fixed (step 04) |
| BUG-15 | P2 | Exact imported exhibits hide precision and reject the displayed answer | Fixed (step 07) |
| BUG-16 | P2 | Reloading a drill resets its per-question time allowance | Fixed (step 06) |
| BUG-17 | P2 | Fit rehearsal timers undercount time during throttling or sleep | Fixed (step 03) |
| BUG-18 | P2 | Direct pack practice resumes questions from an obsolete pack version | Fixed (step 09) |
| BUG-19 | P2 | Mixed Daily Workouts record beginner work as expert personal bests | Fixed (step 10) |
| BUG-20 | P2 | Beginner percentage-point drills accept the wrong percentage unit | Fixed (step 08) |
| BUG-21 | P2 | Hindi grouping and Arabic formatted negatives fail numeric parsing | Fixed (step 04) |
| BUG-22 | P2 | Unary minus has the wrong precedence relative to exponentiation | Fixed (step 04) |
| BUG-23 | P2 | Accepted fractional market-sizing rubrics can exceed their maximum score | Fixed (step 07) |
| BUG-24 | P2 | A previous exhibit save labels a new unanswered exercise correct and saved | Fixed (step 07) |
| BUG-25 | P2 | CAGR and Rule of 72 practice links select unrelated skills | Fixed (step 08) |
| BUG-26 | P2 | Custom arithmetic can repeat an identical question in one session | Fixed (step 08) |
| BUG-27 | P2 | Clear-data controls retain an empty inventory after a successful import | Fixed (step 02) |
| BUG-28 | P3 | Formula validation accepts malformed infix expressions | Fixed (step 04) |
| BUG-29 | P3 | Decimal stepped ranges can omit valid upper endpoints | Fixed (step 08) |
| BUG-30 | P3 | Identical unrecognized questions receive full distinctness credit | Fixed (step 10) |

## Verification

- Existing unit/component suite: **1,069 tests in 151 files passed**.
- Existing Chromium suite: **143 tests passed**, including accessibility, keyboard, visual baselines, migrations, packs, privacy, offline use, and full practice journeys.
- Additional Firefox/WebKit/backup-portability run: **35/37 passed initially**. The two failures were 30-second overall timeouts in multi-route navigation/icon tests. **Both passed on a focused rerun with the original 30-second limit** (14.1 and 10.5 seconds). All 37 scenarios therefore passed at least once; the original run was not clean, and its timing instability is retained as IMP-05.
- Lint and TypeScript checks passed. Version, Action pins, authoring assets, and product identity checks passed. Catalog and generated locale checks passed.
- Verified static build identifies the audited commit and clean source, with 225 artifact files. My initial build attempt collided with another build already running in the shared workspace; I used its completed, integrity-validated artifact for the isolated browser suites, without interrupting that run. This is not recorded as an application defect.
- Performance budgets passed: largest JS chunk **394.0/500.0 KiB**; largest Brotli route JS **399.9/480.0 KiB**; install precache **707.1/1,350.0 KiB**. Passing the size budget does not prove that the offline dependency set is complete (BUG-03).
- Authorized npm advisory audit: **zero reported known vulnerabilities**, across the installed tree (637 dependency entries reported by npm). This is an advisory database result, not proof that dependencies cannot contain vulnerabilities.
- Additional focused probes: **11 core + 9 practice + 6 storage + 2 formula-link checks passed**, plus a Chromium update/offline reproduction. These 28 checks deliberately assert the observed defects; passing means the bugs were reproduced. Some checks cover multiple findings. Convert their assertions to expected-correct behavior when implementing fixes.

## Findings and repair guidance

### BUG-01 — P1: A stale file read can import the wrong backup after confirmation

[src/features/settings/LocalSettingsView.tsx:505](src/features/settings/LocalSettingsView.tsx#L505) (standard import), also `:360` (complete restore). Choose file A with a pending read, choose B, let B validate and check confirmation, then let A finish: A overwrites `pendingImport`, while B's confirmation stays checked. The next Import And Replace clears current stores and restores A even though the picker shows B. The complete-backup handler has the same unguarded asynchronous state publication. Verified with controlled File.text promises and distinct saved question counts; confirmed B=3 but actual restored settings were A=2. Reuse the generation guard already implemented in QuestionPackManager.handleFile, invalidate stale results/errors, and tie confirmation to the selected payload. Also disable file replacement during an active restore.

### BUG-02 — P1: Standard export/import deletes private records excluded from the export

[src/features/settings/localProgressExport.ts:92](src/features/settings/localProgressExport.ts#L92). Standard export strips Fit stories, prep profiles, and market-sizing notes at lines 67–72, but standard replacement unconditionally clears all progress stores and restores only the stripped records. Exporting and then reimporting on the same device erases the private originals with no copy in the downloaded file. UI confirmation says only 'replaces local progress'; the nearby export description calls private text excluded. Verified a stored Fit story and sizing note disappear after the valid default export→import round trip. Preserve excluded private fields/records when privacyScope is standard, as completeBackupStorage.preservePrivateData already does, or require an explicit private-data deletion preview/confirmation before destructive replacement.

### BUG-03 — P1: Applying an update can break offline reopening

[public/sw.js:176](public/sw.js#L176) and `:199`. Installation adds only PRECACHED_URLS (HTML, manifest, icons); activation immediately deletes all older generation caches including their JS/CSS. A new release normally changes hashed dependency URLs, but those new assets were never loaded by the currently open old page or precached by the waiting worker. Follow the advertised close-all-tabs update instruction, then reopen offline: the new HTML loads but its dependencies fail. Verified in Chromium with the existing build, a new cache identity, and new asset URL aliases representing a next release: update reached installed, all old tabs closed, new worker activated and was the sole remaining cache, offline /drills returned 200 but main JS and CSS requests failed. UI remained unstyled and stuck on 'Loading your saved drill defaults...' and 'Checking connection...'. Repro: `.runtime-cache/bug-audit/storage/offline-upgrade-repro.mjs`; screenshot: `.runtime-cache/bug-audit/storage/offline-upgrade.png`. Precache the dependency closure for promised offline routes before marking the generation ready and deleting prior assets. Add an upgrade/offline-reopen test that checks hydration and answer submission, not HTML headings alone.

### BUG-04 — P1: Fit Story textareas lose focus after every character

- Location: [src/features/case-practice/fit/FitPracticeView.tsx:745–763](src/features/case-practice/fit/FitPracticeView.tsx#L745); usages lines 715–720.
- `StoryTextArea` is declared inside `StoryForm` and rendered as a React component. Each draft update creates a new component type, causing all five textareas to unmount/remount.
- Reproduction: focus Situation, type one character, then continue typing. The textarea is replaced and focus moves to the document body. Same defect affects Task, Action, Result, Reflection; any parent timer tick can also remount them.
- Impact: basic story creation/editing is effectively unusable from keyboard without refocusing after each character; selection/caret are lost.
- Smallest fix: move `StoryTextArea` to module scope and pass draft/error/onChange props, or inline the textarea JSX. Existing tests use whole-value `fireEvent.change`, so they missed focus behavior.
- Repro test asserts the old/new DOM nodes differ and `document.activeElement === document.body` after one change.

### BUG-05 — P1: Reloading after the final answer strands a completed drill

- Location: [src/features/drills/ActiveDrillSession.tsx:359](src/features/drills/ActiveDrillSession.tsx#L359), `:380`, `:585`, `:671`.
- Reproduce: start an instant-feedback or retry-first drill, answer its last question, reload before clicking **View summary**, then revisit the same drill URL/settings.
- Final answer is persisted as an in-progress session with all questions answered but no score. Draft restoration restores neither feedback nor a completion transition. `currentQuestion` is undefined, and the UI displays **No unanswered question is available for this session.** There is no View summary or Submit action. Reusing the same settings restores this stranded draft again.
- Impact: completed work is stuck outside completed history, scores, mistake processing and recommendations.
- Small fix: restore fully answered drafts directly into completion (or preserve/recover final feedback state), with a regression test for final-answer reload. Do not rely on a transient UI click to make a completed queue recoverable.

### BUG-06 — P1: Nine built-in exhibit questions hide required input figures

- Primary location: [src/features/exhibits/ExhibitChartRenderer.tsx:82](src/features/exhibits/ExhibitChartRenderer.tsx#L82); value-list loop at lines 340–366.
- Callers: [src/features/exhibits/ExhibitQuestionFlow.tsx:166–170](src/features/exhibits/ExhibitQuestionFlow.tsx#L166), [src/features/exhibits/ExhibitSprint.tsx:399–403](src/features/exhibits/ExhibitSprint.tsx#L399), and chart-based imported full cases.
- Chart data and its accessible value list contain only plotted series. Neither caller renders the underlying table, and Dataset details lists column names without cell values.
- Reproduction: open Exhibits → Quick Service Daypart Economics → “What revenue does Lunch generate?” The only numeric data shown are transactions; the required $11 average ticket is absent. Switch to Dinner labor cost: the $14 average ticket and 31% labor rate are also absent. The answer becomes available only after submitting, when the explanation reveals the hidden operands.
- Confirmed scope in bundled content (9 questions across 7 datasets): `west_route_revenue` (data file line 212, missing average fare); `plant_c_utilization` (254, capacity); `outpatient_revenue` (382, average revenue); `lunch_revenue` (529, average ticket); `dinner_labor_cost` (546, ticket + labor rate); `april_total_shipping_cost` (607, shipments); `wealth_revenue_per_customer` (668, customers); `plant_c_yield` (712, input units); `plant_b_defects` (729, input units). All are in [src/data/exhibits/exhibitDatasets.ts](src/data/exhibits/exhibitDatasets.ts).
- Impact: these exercises cannot be solved from the displayed evidence; users accumulate incorrect answers/timeouts and misleading progress. Sprint uses the same renderer.
- Smallest fix: expose all authored metric values alongside the chart (reuse the table renderer or extend the value list using dataset columns/rows), keeping chart series independent. Add a check that each authored question's required evidence is visible before submission.
- Repro test: “built-in chart questions omit the data needed to calculate answers”; verifies absent $11/$14/31%, present transactions, and no underlying table.

### BUG-07 — P1: Decimal multiplication rejects both the exact answer and its explanation

- Location: [src/features/questions/arithmeticQuestionGenerator.ts:365](src/features/questions/arithmeticQuestionGenerator.ts#L365), `:393`, `:520`; [src/lib/format.ts:8](src/lib/format.ts#L8).
- Reproduce: generate custom multiplication with beginner, decimal, small operands, five terms and seed `decimal-audit-1`. Prompt: **What is 6.2 x 9.9 x 2.4 x 8.3 x 7.4?**
- True product **9047.90304** is rejected. `roundValue()` secretly rounds to four decimal places, making the stored answer **9047.903**. The explanation renders **9047.9**, which is also rejected. There is neither a rounding instruction nor a tolerance on the custom answer.
- Impact: valid arithmetic is graded wrong in a supported configuration; feedback cannot supply an acceptable answer.
- Small fix: define one precision/rounding contract for generated answers, prompt instructions, tolerance and display. Preserve exact decimal products where exactness is requested, or explicitly request and consistently grade the chosen precision.

### BUG-08 — P1: A built-in four-percentage-point gap is graded as 0.04 and displayed as zero

- Location: [src/data/exhibits/exhibitDatasets.ts:837–853](src/data/exhibits/exhibitDatasets.ts#L837), especially `answer.value: 0.04` at line 843.
- Reproduction: select exhibit `exhibit_regional_productivity_003`, numeric question `north_west_conversion_gap`. Exhibit rates are North 18%, West 14%; explanation correctly says 4 percentage points. Enter `4`: incorrect. Bare `0.04`: correct. The solution formatter rounds the authored 0.04 to `0 pp`.
- This is a content scale error: the rest of the app represents percentage-point answers in points, e.g. `starterTemplates.ts:929–944` computes `newRate - oldRate`, and `businessTemplates.ts:710` multiplies ROI ratios by 100. `formatExhibitAnswerValue` also uses the point count directly.
- Impact: teaches an incorrect answer and penalizes correct work in normal practice and Sprint.
- Smallest fix: set this answer to `4` and choose a suitable tolerance in points (e.g. 0.1 if preserving the old fractional tolerance). Test the authored arithmetic, not just echoing the answer specification into the validator.
- Additional related issue: `4 pp` is also rejected because the shared parser has no physical-unit suffix handling; coordinate with the numerical auditor. `ExhibitAnswerInput.tsx:74–75` uses a percent placeholder even for point answers.
- Repro checks `4`/`4 pp`/`4%` rejected, `0.04` accepted, displayed answer `0 pp` rejected. Do not interpret `4 pp` rejection alone as proof of the content scale bug.

### BUG-09 — P2: Backup preparation can retain private text after the scope is unchecked

[src/features/settings/LocalSettingsView.tsx:313](src/features/settings/LocalSettingsView.tsx#L313). Start Prepare Complete Backup with private text selected, uncheck the private scope while IndexedDB snapshot/checksum work is pending, then let it finish. updateCompleteBackupScope clears the preview but does not invalidate the pending request; the old private-inclusive result is published after the checkbox is off. Verified the unchecked private selector with a resulting preview containing one private entry. The user can then download that payload. Version preparation requests against current scopes or disable scope editing until preparation finishes; bind cleartext confirmation to the exact resulting scope set.

### BUG-10 — P2: Reset and restore leave stale views able to resurrect or overwrite records

[src/features/settings/LocalSettingsView.tsx:249](src/features/settings/LocalSettingsView.tsx#L249), `:380`, `:524`; [src/features/settings/settingsPersistence.ts:25](src/features/settings/settingsPersistence.ts#L25). Practice Reset, standard import, and complete restore omit the invalidation notification used by Clear Personal Data and Clear All. Existing Fit/prep/drill views retain their old state. Verified: render a saved Fit story, reset storage, see count zero, click its still-present Edit then Update Story, and the old private story is stored again. Similarly, restored records can be overwritten by old edit forms. Publish appropriate same-tab/cross-tab invalidation on successful replacement/reset and ensure stale in-flight writers cannot reapply old records. Reset also clears each store in independent transactions; use the existing atomic mutate API so a failed reset cannot leave half-cleared cross-store references. Partial Clear All skips invalidation entirely when a preference removal fails (`localDataClear.ts:86`), so that path needs the same audit.

### BUG-11 — P2: Growing practice history exceeds the app's own backup/import limits

[src/features/settings/localProgressExport.ts:16](src/features/settings/localProgressExport.ts#L16), `:59`, `:212`; complete-backup validation inherits the same limit through `completeBackup.ts:125`. Responses grow without a retention bound, but imports reject any store over 10,000 records (and >20,000 total). A 10,001-response history still exports successfully as a roughly 3 MB Standard Progress file, then the app rejects that own file. Complete Backup instead fails to prepare because it self-validates against those limits. Verified with 10,001 individually valid responses below the byte cap. Support bounded/chunked or streamed complete history backups, or a user-controlled date-range export; at minimum validate before offering a successful download and explain the concrete recovery path. Do not silently prune learner history.

### BUG-12 — P2: A completed Fit save discards newer edits

- Location: [src/features/case-practice/fit/FitPracticeView.tsx:183–201](src/features/case-practice/fit/FitPracticeView.tsx#L183), especially unconditional `setDraft(createEmptyDraft())` at 197.
- Story controls at 677–763 remain enabled while saving; only the save/rehearse buttons disable.
- Reproduction with delayed IndexedDB write: fill a valid story and Save Story; while Saving, change Story title (or edit another story). Let the original write finish. The newly typed changes disappear and are not present in the saved record.
- Impact: silent loss of text the user entered after submission. Delayed writes are feasible when IndexedDB is busy/blocked. Older completions can also clear another selected edit.
- Smallest fix: disable all story-editing/navigation controls for the pending operation, or clear only if the draft still equals the submitted snapshot. Preserve newer drafts explicitly.
- Repro test delays `storage.put`, types “New unsaved edit”, releases the write, and verifies the field is empty while storage holds only the original title.

### BUG-13 — P2: Session timers inflate per-question times and distort benchmark scoring

- Location: [src/features/drills/ActiveDrillSession.tsx:505](src/features/drills/ActiveDrillSession.tsx#L505), `:571`; [src/features/drills/drillTimer.ts:100-102](src/features/drills/drillTimer.ts#L100); [src/features/scoring/scoringEngine.ts:62](src/features/scoring/scoringEngine.ts#L62).
- Reproduce: session timer, end-of-session feedback, answer question one after 10 seconds and question two 10 seconds later. Persisted responses are `[10, 20]` seconds and average is 15 seconds, instead of `[10, 10]` and 10 seconds.
- All benchmarks use session timing. `submissionTimer.elapsedSeconds` is calculated from session start in this mode, then saved as `timeTakenSeconds`. Skip has the same problem.
- Impact: session/benchmark pace, speed bonuses, category timing, personal bests and recommendations are systematically distorted, increasingly with question position.
- Small fix: use session time only to enforce the overall deadline; compute response duration from `questionStartedAt` for submission and skipping.

### BUG-14 — P2: Interview Math rejects the monetary scale syntax its prompt requests

- Location: [src/lib/validation/validateAnswer.ts:134-135](src/lib/validation/validateAnswer.ts#L134); example authored prompt [src/data/questionTemplates/caseStyleTemplates.ts:48](src/data/questionTemplates/caseStyleTemplates.ts#L48); scoring [src/features/drills/interviewMathEvaluation.ts:74](src/features/drills/interviewMathEvaluation.ts#L74).
- Reproduce: `$800M` market, 25% share, 25% margin; prompt says **Enter $M.** Choose the correct equation and interpretation, select Millions, and enter **$50M**.
- Numeric normalization correctly obtains 50 and `numericMatch: true`, but scale-unit validation rejects every explicit currency token. Outcome is `unit_error`, 55/100 rather than 100/100. Plain `50` or `50M` works.
- Impact: natural correct answers receive a unit error and lose both calculation and unit points.
- Small fix: carry and honor currency-plus-scale semantics where the authored answer is monetary, and verify the exact syntax promised by the prompt.

### BUG-15 — P2: Exact imported exhibits hide precision and reject the displayed answer

- Location: [src/features/exhibits/exhibitFormatting.ts:12–22,65–77,93–106](src/features/exhibits/exhibitFormatting.ts#L12).
- Reproduction uses a fully valid v2 exhibit pack checked with `validateExhibitQuestionPackPayload`: one currency cell/answer `$1,234,567`, exact rounding, zero absolute tolerance. Both table cell and “Correct answer” display `$1.23M`, and entering that displayed answer is incorrect. Plain exact decimal answers have the same problem because `formatCompactNumber` limits them to one decimal.
- Impact: supported exact questions cannot be solved accurately from visible data, and feedback contradicts grading. Existing built-in formatter tests use friendly values like $1.35M and do not expose this.
- Smallest fix: retain full necessary precision in evidence and solution values (keep compact rounded labels only on axes), or make formatting tolerance-aware. Avoid loosening grading to match silently rounded evidence.
- Repro test proves pack validity, both displayed values, and rejected displayed answer.

### BUG-16 — P2: Reloading a drill resets its per-question time allowance

- Location: [src/features/drills/ActiveDrillSession.tsx:137](src/features/drills/ActiveDrillSession.tsx#L137), `:359`; draft shape [src/features/drills/drillPersistence.ts:79](src/features/drills/drillPersistence.ts#L79).
- Reproduce: complete q1 of a two-question drill with a 20-second per-question limit; advance to q2 and spend 19 seconds; reload. Q2 is restored with **0:20** remaining instead of 0:01.
- The active question timestamp is initialized from `Date.now()` on every mount and never stored/restored with the draft.
- Impact: timed practice can gain unlimited time on reload and restored response times can become artificially fast, polluting scores/bests.
- Small fix: persist active timing state and restore the authored deadline/duration consistently; define whether offline time counts, then test reload just before and after expiry.

### BUG-17 — P2: Fit rehearsal timers undercount time during throttling or sleep

- Location: [src/features/case-practice/fit/FitPracticeView.tsx:147–167](src/features/case-practice/fit/FitPracticeView.tsx#L147), especially line 151.
- Reproduction: start a 90-second rehearsal, suspend/throttle the tab or sleep the device for two minutes, then resume. The next callback increments elapsed by only one second; the timer still shows 89 seconds and remains running.
- Impact: authored time limits do not hold, accommodated durations drift, and saved rehearsal duration undercounts. Untimed sessions also record only delivered callback time.
- Smallest fix: retain start timestamp/deadline and derive elapsed on every callback and Finish action, as ExhibitSprint already does. Recompute on visibility resume if useful.
- Repro uses fake timers plus an independent 120-second system-time jump followed by one timer tick; existing tests advance every timer callback and therefore miss throttling.

### BUG-18 — P2: Direct pack practice resumes questions from an obsolete pack version

[src/features/question-packs/QuestionPackDrillSession.tsx:104](src/features/question-packs/QuestionPackDrillSession.tsx#L104); [src/features/drills/drillPersistence.ts:30](src/features/drills/drillPersistence.ts#L30) and `:46`. The direct-pack loader passes no draftKeyScope; its route and settings encode pack ID/difficulty/count but no packVersion/importedAt. Open an incomplete version-1 pack drill, replace the installed pack with version 2 changing its questions but retaining count/categories, and open the same direct link. The newly generated version-2 session has the same draft key, so ActiveDrillSession loads the old questions and answer key. Verified a pure persistence probe: new session asks 3+3, but its computed draft key matches v1 and loads 1+1. The pool loader already scopes drafts by pack version/import timestamp. Reuse that scope for direct packs and test replacement/import of the same version as well.

### BUG-19 — P2: Mixed Daily Workouts record beginner work as expert personal bests

- Location: [src/features/progress/personalBests.ts:108](src/features/progress/personalBests.ts#L108), `:122`; source mix [src/features/drills/dailyWorkout.ts:97](src/features/drills/dailyWorkout.ts#L97), `:161`.
- Reproduce: Daily Workout with one due expert growth question and no other history. The other nine questions are beginner balanced fill. Finish correctly. Arithmetic category/skill bests are recorded under **expert** even though every arithmetic question was beginner.
- Personal best grouping takes `session.settings.difficulty` for every response, while Daily Workout sets that field to the highest difficulty in the mixed queue. Retry Missed also defaults the whole session to beginner regardless of question difficulty.
- Impact: bests across difficulty bands are incomparable and easy beginner work can overwrite expert performance.
- Small fix: derive per-question difficulty from stored questions when grouping records, with a legacy fallback only when question snapshots are unavailable.

### BUG-20 — P2: Beginner percentage-point drills accept the wrong percentage unit

- Location: [src/data/questionTemplates/starterTemplates.ts:721](src/data/questionTemplates/starterTemplates.ts#L721), `:737`; permissive legacy match [src/lib/validation/validateAnswer.ts:54](src/lib/validation/validateAnswer.ts#L54).
- Reproduce: beginner percentage-points question **A conversion rate moves from 15% to 40%. How many percentage points did it change?** Submit **25%**. It is marked correct.
- Both beginner templates use `answerUnit: "none"`, which enables the legacy percent-value acceptance path. Later difficulty templates already use `percentage_points`.
- Impact: the app explicitly rewards the unit confusion this skill should correct.
- Small fix: use `percentage_points` for those two templates and add wrong-% versus correct-plain-number regression coverage.

### BUG-21 — P2: Hindi grouping and Arabic formatted negatives fail numeric parsing

- Location: [src/lib/parser/parseAnswer.ts:256](src/lib/parser/parseAnswer.ts#L256), `:276`; app locale formatting [src/features/i18n/I18nProvider.tsx:142](src/features/i18n/I18nProvider.tsx#L142).
- Reproduce Hindi: `parseAnswer(new Intl.NumberFormat("hi").format(123456), {locale:"hi"})` rejects **1,23,456**. Group validation always demands three-digit groups.
- Reproduce Arabic: `parseAnswer(new Intl.NumberFormat("ar").format(-1234), {locale:"ar"})` rejects the locale-formatted negative due to its invisible bidi marker (LRM in this Windows runtime; ALM occurs in other Arabic number-format outputs). The digit normalizer does not strip these formatting marks.
- Impact: learners using supported Hindi number grouping or copying a supported Arabic formatted negative receive arithmetic errors for a valid number.
- Small fix: infer grouping widths from locale number-format parts, and remove recognized numeric bidi-format characters without joining unrelated numeric runs. Keep locale round-trip tests for all supported locales.

### BUG-22 — P2: Unary minus has the wrong precedence relative to exponentiation

- Location: [src/lib/math/formulaEvaluator.ts:28-36](src/lib/math/formulaEvaluator.ts#L28).
- Reproduce: `evaluateFormulaExpression("-2^2", {})` returns **4**, whereas arithmetic notation gives **-4**; parentheses should be required for `(-2)^2`.
- Full generated-template pack validation accepts the expression. Shared evaluator is used by imported generated questions and market-sizing formulas.
- Impact: a valid authored expression can silently produce the wrong answer key.
- Small fix: handle unary operators and exponentiation according to arithmetic precedence while preserving negative exponents; test `-2^2`, `(-2)^2`, `2^-2` and chained powers together.

### BUG-23 — P2: Accepted fractional market-sizing rubrics can exceed their maximum score

- Location: [src/features/market-sizing/marketSizingScoring.ts:220–225](src/features/market-sizing/marketSizingScoring.ts#L220); validator [src/features/question-packs/questionPackMarketSizing.ts:294–295](src/features/question-packs/questionPackMarketSizing.ts#L294) permits finite fractional maxPoints.
- Reproduction: valid imported copy of the first bundled market-sizing template with every maxPoints=0.6. Complete all inputs in range and provide the correct final answer/interpretation. Structure and assumptions each award 1/0.6 because the proportional helper rounds to the nearest integer; aggregate score exceeds aggregate maximum (4.4 vs 3.6).
- Impact: invalid percentage scores/progress and potentially non-restorable records if backup constraints require score<=maxScore. Small maxPoints such as0.4 can instead yield zero credit for perfect work.
- Smallest fix: either require integral point maxima in the pack contract with clear validation, or preserve fractional proportions without integer rounding, capping each dimension at its maximum. Test every completed dimension against its maximum.
- Repro first verifies the pack is valid, then asserts the actual total exceeds maxScore and identifies structure/assumptions as over-awarding.

### BUG-24 — P2: A previous exhibit save labels a new unanswered exercise correct and saved

- Confirmed location: [src/features/exhibits/ExhibitQuestionFlow.tsx:376–381](src/features/exhibits/ExhibitQuestionFlow.tsx#L376); reset/select paths lines 57–64,93–102,116–119,180–186 remain available while awaiting persistence.
- Reproduction: submit a correct first exhibit answer with a delayed write; select another exhibit before completion. After the old save resolves, the new blank question shows “Correct. Attempt saved on this device.” Only the old question exists in storage.
- Impact: misleading correctness/save confirmation; users may believe the current answer has been saved when it has not. Changing the answer while saving can also reset the `saving` guard and allow overlapping submissions.
- Smallest fix: associate completion with an attempt generation/token and ignore stale UI completions, or lock changing/clearing exercise state until save finishes.
- Similar unguarded patterns were observed (not separately reproduced) in market sizing (`updateDraft` and `persistReviewedAttempt`), synthesis (`selectOption/resetAttempt` and final status setters), brainstorming (`reset/toggle` and final status setters), and lesson switching. Audit sibling paths when fixing.
- Repro delays put, switches to another dataset, verifies its answer stays blank while the old success status appears and storage contains only the old exhibit ID.

### BUG-25 — P2: CAGR and Rule of 72 practice links select unrelated skills

- Location: [src/features/formulas/formulaFilters.ts:22](src/features/formulas/formulaFilters.ts#L22), `:90`; related tests [src/tests/unit/formulaFilters.test.ts:31](src/tests/unit/formulaFilters.test.ts#L31).
- Reproduce: open Formula Library and use Start Related Drill on CAGR or Rule of 72. Their generated links explicitly choose percentages/percentage_change and percentages/percentage_of_number, respectively. Both five-question sets contain none of the requested growth skill.
- Beginner CAGR and Rule of 72 templates already exist in [src/data/questionTemplates/growthTemplates.ts:98](src/data/questionTemplates/growthTemplates.ts#L98) and `:215`. The override and growth-tag blacklist are stale, and the existing test asserts the incorrect mapping.
- Impact: users deliberately trying to practice these formulas receive unrelated percentage exercises.
- Small fix: remove the obsolete overrides/blacklist, target the corresponding growth_compounding skill, and test the generated questions rather than the URL alone.
- Evidence: two isolated tests in `.runtime-cache/bug-audit/root/formula-links.test.ts` generate the linked sessions and confirm their missing target tags.

### BUG-26 — P2: Custom arithmetic can repeat an identical question in one session

- Location: [src/features/questions/arithmeticQuestionGenerator.ts:495](src/features/questions/arithmeticQuestionGenerator.ts#L495); uniqueness gate [src/features/questions/questionGenerator.ts:137](src/features/questions/questionGenerator.ts#L137).
- Reproduce: beginner, integer, two terms, single-digit multiplication, 10 questions, seed `audit-duplicates-0`. **What is 3 x 4?** appears twice.
- IDs differ only because the randomly selected starter template is `_007` on one and `_001` on the other. Once custom generation overrides the template content, this ID distinction no longer identifies a distinct question.
- Impact: duplicate exercises inflate apparent variation and can immediately repeat memorized answers; small operand spaces make it common.
- Small fix: deduplicate custom arithmetic by expression/content, or remove the irrelevant source-template component from custom identity; align capacity with the same identity.

### BUG-27 — P2: Clear-data controls retain an empty inventory after a successful import

[src/features/settings/LocalSettingsView.tsx:544](src/features/settings/LocalSettingsView.tsx#L544) and `:992` (also private preview at `:914`). Clear-data previews load at mount and are updated only by clear operations. Import/restore/reset handlers never refresh those counts. Starting with an empty Settings page and successfully importing a saved settings record leaves Clear All confirmation disabled and the page claiming there is no saved data. Verified alongside the import race probe: IndexedDB contains the imported record but the clear-all checkbox stays disabled. Complete restores that add personal records likewise leave personal-clear counts stale. Recompute inventories after successful mutations or invalidate/remount Settings.

### BUG-28 — P3: Formula validation accepts malformed infix expressions

- Location: [src/lib/math/formulaEvaluator.ts:122-130](src/lib/math/formulaEvaluator.ts#L122); pack validation [src/features/question-packs/questionPackTemplate.ts:585](src/features/question-packs/questionPackTemplate.ts#L585).
- Reproduce: **1 2 +** and **1 + () 2** both evaluate to 3 and both pass full generated-template pack validation.
- Conversion to RPN checks final stack size but never enforces the grammar's expected operand/operator transitions, nonempty parentheses or adjacency.
- Impact: malformed author input is accepted and interpreted as an unintended formula instead of producing actionable validation feedback.
- Small fix: reject invalid token transitions during compilation rather than inferring validity only from the final stack.

### BUG-29 — P3: Decimal stepped ranges can omit valid upper endpoints

- Location: [src/features/questions/variableResolver.ts:37](src/features/questions/variableResolver.ts#L37); repeated capacity arithmetic [src/features/questions/questionGenerator.ts:198](src/features/questions/questionGenerator.ts#L198); representative checks [src/features/question-packs/questionPackTemplate.ts:615](src/features/question-packs/questionPackTemplate.ts#L615).
- Reproduce: variable `{type:"decimal", min:0.1, max:0.3, step:0.1}` with RNG forced to its largest index resolves to **0.2**, never 0.3.
- `(0.3 - 0.1) / 0.1` is slightly below 2 in binary floating point; `Math.floor` drops one step. Capacity also reports two variants instead of three, and representative validation misses the excluded boundary.
- Impact: valid user-authored ranges have missing content/capacity and do not honor their declared endpoints.
- Small fix: use an explicit precision-aware step-count calculation shared by generation, capacity and representative validation.

### BUG-30 — P3: Identical unrecognized questions receive full distinctness credit

- Location: [src/features/case-practice/questioning/questioningScoring.ts:421–424](src/features/case-practice/questioning/questioningScoring.ts#L421).
- Reproduction: submit “What is your name?” in all three questioning fields. All three are unrecognized, but duplicateQuestionIds is empty and distinctness earns 10/10. The guard skips exact-text duplicate detection whenever no intent matched.
- Impact: incorrect feedback and inflated distinctness, particularly for questions missing a rubric alias; same scorer powers full-case simulation. Other dimensions correctly award no relevance/coverage, so lower priority.
- Smallest fix: check exact normalized duplicates before the recognized-intent guard; retain intent restrictions for fuzzy duplicate matching.
- Repro test verifies three identical texts yield zero recognized IDs, no duplicates, and full distinctness.

## Improvements (not included in the 30 confirmed bugs)

- **IMP-01 — Clarify ROI wording.** [businessTemplates.ts](src/data/questionTemplates/businessTemplates.ts#L256) calls the total proceeds a “gain” but subtracts the original investment again. Say “total return including the initial investment” if that is intended, or use net gain consistently. Align the Formula Library example too. Resolve wording before changing the numerical answer key.
- **IMP-02 — Retry saving without repeating the exercise.** Several case modules require retrying the exercise or editing a response after persistence failure. Keep the completed attempt and its stable ID available for a save-only retry; verify retries are idempotent.
- **IMP-03 — Optional local resume for long full cases.** Intermediate full-case answers live in component state. A local draft would reduce accidental work loss on refresh or navigation. This is an enhancement, not a claim that the app promises current full-case draft persistence.
- **IMP-04 — Add independent content and boundary checks.** Derive expected answers from original exhibit rows and mathematical expressions, assert necessary figures are visible before submission, round-trip localized numbers and displayed answers, test clock jumps, and test slow/out-of-order reads and writes. Tests that simply submit the configured answer key cannot catch a wrong key.
- **IMP-05 — Split long browser smoke tests into smaller journeys.** Multi-route arrow/navigation checks exceeded their shared 30-second limit in Firefox/WebKit during this audit. Preserve meaningful assertions and investigate timing separately from functional failure; do not silently mark flaky runs green or raise every timeout without evidence.
- **IMP-06 — Explain prep-plan target firms.** Target firms are stored/displayed but do not currently change deterministic priorities. Clarify that they are reference notes, or implement a deliberate bundled rule if useful.

## Reproduction files and scope

All test data were synthetic. No learner browser database was inspected or changed, no production deployment was made, and no runtime services or dependencies were added. The only external audit was the user-authorized npm advisory request containing dependency metadata.

Reproduction harnesses and logs are local ignored audit artifacts under bug-audit (`.runtime-cache/bug-audit`, local audit artifact) and practice-audit (`.runtime-cache/practice-audit`, local audit artifact). They will not be included by git unless explicitly moved/added. This Markdown report is the durable tracked-file candidate. Useful evidence:

- Core probes (`.runtime-cache/bug-audit/core/repro.test.tsx`, local audit artifact) and numeric examples (`.runtime-cache/bug-audit/core/examples.jsonl`, local audit artifact).
- Practice probes (`.runtime-cache/practice-audit/practice.test.tsx`, local audit artifact).
- Storage probes (`.runtime-cache/bug-audit/storage/settings-repro.test.tsx`, local audit artifact).
- Formula-link probes (`.runtime-cache/bug-audit/root/formula-links.test.ts`, local audit artifact).
- Offline upgrade harness (`.runtime-cache/bug-audit/storage/offline-upgrade-repro.mjs`, local audit artifact) and failure screenshot (`.runtime-cache/bug-audit/storage/offline-upgrade.png`, local audit artifact).
- Unit log (`.runtime-cache/bug-audit/unit.log`, local audit artifact), Chromium log (`.runtime-cache/bug-audit/e2e.log`, local audit artifact), initial cross-browser log (`.runtime-cache/bug-audit/cross-browser.log`, local audit artifact), focused retry log (`.runtime-cache/bug-audit/cross-browser-retry.log`, local audit artifact), preserved first-run failure artifacts (`.runtime-cache/bug-audit/cross-first-run`, local audit artifact), and dependency audit (`.runtime-cache/bug-audit/dependency-audit.json`, local audit artifact).

Use the pinned Node 24.19.0/npm 11.17.0 toolchain. From the repository root:

```powershell
node node_modules/vitest/vitest.mjs run --config .runtime-cache/bug-audit/core/vitest.config.ts
node node_modules/vitest/vitest.mjs run --config .runtime-cache/practice-audit/vitest.config.ts
node node_modules/vitest/vitest.mjs run --config .runtime-cache/bug-audit/storage/vitest.config.mts .runtime-cache/bug-audit/storage/settings-repro.test.tsx
node node_modules/vitest/vitest.mjs run --config .runtime-cache/bug-audit/root/vitest.config.ts
node .runtime-cache/bug-audit/storage/offline-upgrade-repro.mjs
```

The offline harness requires the existing verified `out/` build and free local port 3004. It simulates a next release by changing worker identity and required asset URLs; it is not a test of two independently built historical releases. It demonstrates lost offline interactivity when the new assets have not warmed, not deletion of IndexedDB progress or necessarily deletion of browser HTTP caches.

The review covered runtime logic and caller flows, all major practice modules, storage and imports, service workers, pack validation and selection, localization, settings, accessibility tests, build/release scripts, and existing automation. It did not solve every variable combination, perform manual screen-reader/OS installation checks, or verify all final-host/browser-eviction scenarios. No audit can prove the absence of further defects.

Unconfirmed follow-ups, excluded from the bug count: completion retries may repeat review bookkeeping after a later persistence stage fails; IndexedDB open-failure cleanup and versionchange reuse need browser fault injection; partial clearing when preference removal fails needs stale-writer testing. Related async save patterns in other case modules should be checked when repairing BUG-24. A suspicion about ordinary unvisited routes failing after a warmed install was tested and not confirmed.
