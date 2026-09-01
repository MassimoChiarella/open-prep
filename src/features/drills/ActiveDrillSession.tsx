"use client";

import { FormEvent, type RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { LocalSaveNotice } from "@/components/LocalSaveNotice";
import { submitAnswer } from "@/features/drills/answerSubmission";
import {
  buildDrillDraftKey,
  loadInProgressDrillSession,
  persistCompletedDrillSession,
  persistInProgressDrillSession
} from "@/features/drills/drillPersistence";
import { InterviewMathScoreBreakdown } from "@/features/drills/InterviewMathScoreBreakdown";
import {
  evaluateInterviewMath,
  type InterviewMathSubmission
} from "@/features/drills/interviewMathEvaluation";
import { persistBenchmarkResult } from "@/features/benchmarks/benchmarkPersistence";
import { buildBenchmarkSelectionHref } from "@/features/benchmarks/benchmarkSession";
import type { BenchmarkId } from "@/features/benchmarks/benchmarkTypes";
import {
  createTimerSnapshot,
  getTimeLimitSeconds,
  timingAccommodationLabel
} from "@/features/drills/drillTimer";
import { unitPreferenceOptions } from "@/features/drills/drillSettingsOptions";
import { SessionSummaryView } from "@/features/drills/SessionSummaryView";
import { completeDrillSession } from "@/features/drills/sessionCompletion";
import {
  getCurrentQuestion,
  getDrillProgressSummary,
  isDrillSessionComplete
} from "@/features/drills/sessionProgress";
import { createSessionSummarySnapshot } from "@/features/drills/sessionSummary";
import { resolveStrategyTip } from "@/features/drills/strategyTips";
import { starterQuestionTemplates } from "@/data/questionTemplates/starterTemplates";
import { generateSimilarQuestionFromTemplates } from "@/features/questions/questionGenerator";
import { createPersonalBestRecords, findSourcePersonalBests } from "@/features/progress/personalBests";
import { useI18n } from "@/features/i18n/I18nProvider";
import {
  isStandardPersonalBestEligible,
  normalizeTimingAccommodation
} from "@/features/timing/timingAccommodation";
import type {
  DrillSession,
  DrillSettings,
  ErrorType,
  InterviewMathSpec,
  Question,
  QuestionTemplate,
  RoundingRule,
  UnitType,
  UserResponse
} from "@/lib/domain";
import { formatNumber } from "@/lib/format";
import type { AppStorage } from "@/lib/storage/appStorageTypes";
import { createIndexedDbAppStorage } from "@/lib/storage/indexedDbAppStorage";
import { validateAnswer, type ValidationResult } from "@/lib/validation/validateAnswer";

interface ActiveDrillSessionProps {
  benchmarkId?: BenchmarkId;
  draftKeyScope?: string;
  initialSession: DrillSession;
  interviewMathMode?: boolean;
  lockedModeSummary?: LockedModeSummaryItem[];
  questions: Question[];
  queueTitle?: string;
  sessionEyebrow?: string;
  sessionTimerDescription?: string;
  sessionTitle?: string;
  similarQuestionTemplates?: readonly QuestionTemplate[];
  storageFactory?: () => AppStorage;
  warnings?: string[];
}

interface FeedbackState {
  question: Question;
  rawInput: string;
  recorded: boolean;
  response?: UserResponse;
  selectedUnit?: UnitType;
  validation: ValidationResult;
}

interface LockedModeSummaryItem {
  label: string;
  value: string;
}

const expectedUnitLabels: Partial<Record<UnitType, string>> = {
  b: "Billions (B)",
  currency: "Currency ($)",
  k: "Thousands (K)",
  m: "Millions (M)",
  none: "No unit",
  percentage: "Percentage (%)"
};

const roundingRuleLabels: Record<RoundingRule, string> = {
  exact: "Exact",
  nearest_0_1: "Nearest 0.1",
  nearest_1k: "Nearest 1K",
  nearest_1m: "Nearest 1M",
  nearest_whole: "Nearest whole number"
};

export function ActiveDrillSession({
  benchmarkId,
  draftKeyScope,
  initialSession,
  interviewMathMode = false,
  lockedModeSummary = [],
  queueTitle = "Generated Questions",
  questions: initialQuestions,
  sessionEyebrow = "Practice",
  sessionTimerDescription,
  sessionTitle = "Active Drill Session",
  similarQuestionTemplates = starterQuestionTemplates,
  storageFactory = createIndexedDbAppStorage,
  warnings = []
}: ActiveDrillSessionProps) {
  const { formatNumber: formatLocaleNumber, locale, t } = useI18n();
  const [session, setSession] = useState<DrillSession>(initialSession);
  const [questionQueue, setQuestionQueue] = useState<Question[]>(() => initialQuestions);
  const [answer, setAnswer] = useState("");
  const [equationOptionId, setEquationOptionId] = useState("");
  const [interpretationOptionId, setInterpretationOptionId] = useState("");
  const [selectedUnit, setSelectedUnit] = useState<UnitType | "">("");
  const [feedback, setFeedback] = useState<FeedbackState | undefined>();
  const [newBestLabels, setNewBestLabels] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [retryQuestionIds, setRetryQuestionIds] = useState<Set<string>>(() => new Set());
  const [showHint, setShowHint] = useState(false);
  const [scratchpad, setScratchpad] = useState("");
  const [questionStartedAt, setQuestionStartedAt] = useState(() => Date.now());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const answerInputRef = useRef<HTMLInputElement>(null);
  const firstEquationInputRef = useRef<HTMLInputElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);
  const pendingSessionIds = useRef<Set<string>>(new Set());
  const persistedSessionIds = useRef<Set<string>>(new Set());
  const draftSavePromise = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef(session);

  const draftKey = useMemo(
    () =>
      buildDrillDraftKey(
        typeof window === "undefined" ? "" : `${window.location.pathname}${window.location.search}`,
        initialSession.settings,
        draftKeyScope
      ),
    [draftKeyScope, initialSession.settings]
  );

  const progress = useMemo(() => getDrillProgressSummary(session), [session]);
  const currentQuestion = getCurrentQuestion(session, questionQueue);
  const completedSession = session.score === undefined ? undefined : session;
  const completedSummary = useMemo(
    () =>
      completedSession?.score === undefined
        ? undefined
        : createSessionSummarySnapshot(completedSession, questionQueue),
    [completedSession, questionQueue]
  );
  const sessionStartedAtMs = useMemo(() => parseSessionStartedAt(session.startedAt, questionStartedAt), [
    questionStartedAt,
    session.startedAt
  ]);
  const timerAt = useCallback(
    (timestamp: number) =>
      createTimerSnapshot({
        settings: session.settings,
        nowMs: timestamp,
        questionStartedAtMs: questionStartedAt,
        sessionStartedAtMs
      }),
    [questionStartedAt, session.settings, sessionStartedAtMs]
  );
  const timer = useMemo(() => timerAt(nowMs), [nowMs, timerAt]);
  const timerIsActive =
    completedSession?.score === undefined &&
    currentQuestion !== undefined &&
    feedback?.recorded !== true;
  const similarQuestion = useMemo(
    () =>
      feedback?.recorded === true &&
      benchmarkId === undefined &&
      lockedModeSummary.length === 0 &&
      session.settings.questionPackId === undefined
        ? generateSimilarQuestionFromTemplates(
            similarQuestionTemplates,
            feedback.question,
            session.settings,
            `${session.id}:similar:${feedback.question.id}:${session.responses.length}`,
            questionQueue.map((question) => question.id)
          )
        : undefined,
    [benchmarkId, feedback, lockedModeSummary.length, questionQueue, session.id, session.responses.length, session.settings, similarQuestionTemplates]
  );

  const prepareNextQuestion = useCallback(() => {
    setAnswer("");
    setEquationOptionId("");
    setInterpretationOptionId("");
    setSelectedUnit("");
    setShowHint(false);
    setFeedback(undefined);
    const nextStartedAt = Date.now();
    setQuestionStartedAt(nextStartedAt);
    setNowMs(nextStartedAt);
  }, []);

  const recordCurrentQuestionTimeout = useCallback(
    (question: Question) => {
      const interviewMath = isInterviewMathQuestion(question, interviewMathMode)
        ? createInterviewMathSubmission(equationOptionId, interpretationOptionId, session.settings)
        : undefined;
      const submitted = submitAnswer({
        ...(interviewMath === undefined ? {} : { interviewMath }),
        locale,
        session,
        question,
        rawInput: "",
        selectedUnit: selectedUnit || undefined,
        timeTakenSeconds: timeoutSeconds(session.settings, timer.elapsedSeconds),
        timedOut: true
      });
      const isComplete = isDrillSessionComplete(submitted.session);
      const nextSession =
        isComplete && session.settings.feedbackMode === "end_of_session"
          ? completeDrillSession({ session: submitted.session, questions: questionQueue })
          : submitted.session;

      setSession(nextSession);

      if (session.settings.feedbackMode === "end_of_session") {
        if (!isComplete) prepareNextQuestion();
        return;
      }

      setFeedback({
        question,
        rawInput: "",
        recorded: true,
        response: submitted.response,
        selectedUnit: selectedUnit || undefined,
        validation: submitted.validation
      });
    },
    [
      equationOptionId,
      interpretationOptionId,
      interviewMathMode,
      locale,
      prepareNextQuestion,
      questionQueue,
      selectedUnit,
      session,
      timer.elapsedSeconds
    ]
  );

  const recordSessionTimeout = useCallback(
    (question: Question) => {
      const answeredQuestionIds = new Set(session.responses.map((response) => response.questionId));
      const unansweredQuestions = questionQueue.filter(
        (queuedQuestion) => !answeredQuestionIds.has(queuedQuestion.id)
      );
      let nextSession = session;

      for (const queuedQuestion of unansweredQuestions) {
        const isCurrentQuestion = queuedQuestion.id === question.id;
        const interviewMath = isInterviewMathQuestion(queuedQuestion, interviewMathMode)
          ? createInterviewMathSubmission(
              isCurrentQuestion ? equationOptionId : "",
              isCurrentQuestion ? interpretationOptionId : "",
              session.settings
            )
          : undefined;
        const submitted = submitAnswer({
          ...(interviewMath === undefined
            ? {}
            : {
                interviewMath,
                selectedUnit: isCurrentQuestion ? selectedUnit || undefined : undefined
              }),
          locale,
          session: nextSession,
          question: queuedQuestion,
          rawInput: "",
          timeTakenSeconds: queuedQuestion.id === question.id ? elapsedSeconds(questionStartedAt, Date.now()) : 0,
          timedOut: true
        });
        nextSession = submitted.session;
      }

      setSession(completeDrillSession({ session: nextSession, questions: questionQueue }));
    },
    [
      equationOptionId,
      interpretationOptionId,
      interviewMathMode,
      locale,
      questionQueue,
      questionStartedAt,
      selectedUnit,
      session
    ]
  );

  useEffect(() => {
    if (!timerIsActive) {
      return;
    }

    const intervalId = window.setInterval(() => setNowMs(Date.now()), 250);

    return () => window.clearInterval(intervalId);
  }, [timerIsActive]);

  useEffect(() => {
    if (!timerIsActive || !timer.isExpired || currentQuestion === undefined) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      if (session.settings.timeMode === "session") {
        recordSessionTimeout(currentQuestion);
      } else {
        recordCurrentQuestionTimeout(currentQuestion);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [
    currentQuestion,
    recordCurrentQuestionTimeout,
    recordSessionTimeout,
    session.settings.timeMode,
    timer.isExpired,
    timerIsActive
  ]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    try {
      const storage = storageFactory();

      void loadInProgressDrillSession(storage, draftKey)
        .then((draft) => {
          if (!cancelled && draft !== undefined && sessionRef.current.responses.length === 0) {
            setSession(draft.session);
            setQuestionQueue(draft.questions);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          storage.close();
          if (!cancelled) setDraftLoaded(true);
        });
    } catch {
      void Promise.resolve().then(() => {
        if (!cancelled) setDraftLoaded(true);
      });
    }

    return () => {
      cancelled = true;
    };
  }, [draftKey, storageFactory]);

  useEffect(() => {
    if (!draftLoaded || session.score !== undefined || session.responses.length === 0) {
      return;
    }

    draftSavePromise.current = draftSavePromise.current
      .then(async () => {
        const storage = storageFactory();

        try {
          await persistInProgressDrillSession({ draftKey, questions: questionQueue, session, storage });
        } finally {
          storage.close();
        }
      })
      .catch(() => undefined);
  }, [draftKey, draftLoaded, questionQueue, session, storageFactory]);

  useEffect(() => {
    if (completedSession?.score === undefined || completedSummary === undefined) {
      return;
    }

    if (
      pendingSessionIds.current.has(completedSession.id) ||
      persistedSessionIds.current.has(completedSession.id)
    ) {
      return;
    }

    pendingSessionIds.current.add(completedSession.id);
    setNewBestLabels([]);
    setSaveStatus("saving");

    try {
      void draftSavePromise.current
        .then(async () => {
          const storage = storageFactory();

          try {
            await persistCompletedDrillSession({
              questions: questionQueue,
              session: completedSession,
              storage
            });
            const sourceIds = [completedSession.id];

            if (benchmarkId !== undefined) {
              const result = await persistBenchmarkResult({
                benchmarkId,
                session: completedSession,
                storage
              });

              sourceIds.push(result.id);
            }

            const [sessions, responses, benchmarkResults] = await Promise.all([
              storage.getAll("drill_sessions"),
              storage.getAll("responses"),
              storage.getAll("benchmark_results")
            ]);
            const bests = findSourcePersonalBests(
              createPersonalBestRecords({
                benchmarkResults: benchmarkResults.filter((result) =>
                  isStandardPersonalBestEligible(result.timingAccommodation)
                ),
                responses,
                sessions: sessions.filter((storedSession) =>
                  isStandardPersonalBestEligible(storedSession.settings.timingAccommodation)
                )
              }),
              sourceIds
            );

            setNewBestLabels(bests.map((best) => best.label));
          } finally {
            storage.close();
          }
        })
        .then(() => {
          pendingSessionIds.current.delete(completedSession.id);
          persistedSessionIds.current.add(completedSession.id);
          setSaveStatus("saved");
        })
        .catch(() => {
          pendingSessionIds.current.delete(completedSession.id);
          setSaveStatus("error");
        });
    } catch {
      pendingSessionIds.current.delete(completedSession.id);
      void Promise.resolve().then(() => setSaveStatus("error"));
    }
  }, [benchmarkId, completedSession, completedSummary, questionQueue, saveAttempt, storageFactory]);

  useEffect(() => {
    if (feedback?.recorded === false) {
      answerInputRef.current?.focus();
      answerInputRef.current?.select();
      return;
    }

    if (feedback?.recorded === true) {
      nextButtonRef.current?.focus();
      return;
    }

    if (feedback === undefined && currentQuestion !== undefined) {
      if (isInterviewMathQuestion(currentQuestion, interviewMathMode) && session.settings.caseRequireEquationSetup !== false) {
        firstEquationInputRef.current?.focus();
      } else {
        answerInputRef.current?.focus();
      }
    }
  }, [currentQuestion, feedback, interviewMathMode, session.settings.caseRequireEquationSetup]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedAtMs = currentTimestampMs();
    const submissionTimer = timerAt(submittedAtMs);

    if (currentQuestion === undefined || feedback?.recorded || submissionTimer.isExpired) {
      if (submissionTimer.isExpired) setNowMs(submittedAtMs);
      return;
    }

    const timeTakenSeconds = submissionTimer.elapsedSeconds;
    const interviewMath = isInterviewMathQuestion(currentQuestion, interviewMathMode)
      ? createInterviewMathSubmission(equationOptionId, interpretationOptionId, session.settings)
      : undefined;
    const submittedUnit =
      selectedUnit || (interviewMath === undefined ? currentQuestion.answer.unit : undefined);
    const validation =
      interviewMath === undefined
        ? validateAnswer(answer, currentQuestion.answer, { locale, selectedUnit: submittedUnit })
        : evaluateInterviewMath({
            ...interviewMath,
            locale,
            question: currentQuestion,
            rawInput: answer,
            selectedUnit: submittedUnit
          }).validation;
    const canRetry =
      session.settings.feedbackMode === "retry_first" &&
      !validation.isCorrect &&
      !retryQuestionIds.has(currentQuestion.id);

    if (canRetry) {
      setRetryQuestionIds((current) => new Set(current).add(currentQuestion.id));
      setFeedback({
        question: currentQuestion,
        rawInput: answer,
        recorded: false,
        selectedUnit: submittedUnit,
        validation
      });
      return;
    }

    const submitted = submitAnswer({
      ...(interviewMath === undefined ? {} : { interviewMath }),
      locale,
      session,
      question: currentQuestion,
      rawInput: answer,
      selectedUnit: submittedUnit,
      timeTakenSeconds
    });
    recordSubmission(submitted, currentQuestion, answer, submittedUnit);
  }

  function handleSkip() {
    const skippedAtMs = currentTimestampMs();
    const skipTimer = timerAt(skippedAtMs);

    if (currentQuestion === undefined || feedback !== undefined || skipTimer.isExpired) {
      if (skipTimer.isExpired) setNowMs(skippedAtMs);
      return;
    }

    const interviewMath = isInterviewMathQuestion(currentQuestion, interviewMathMode)
      ? createInterviewMathSubmission(equationOptionId, interpretationOptionId, session.settings)
      : undefined;
    const submittedUnit =
      selectedUnit || (interviewMath === undefined ? currentQuestion.answer.unit : undefined);
    const submitted = submitAnswer({
      ...(interviewMath === undefined ? {} : { interviewMath }),
      locale,
      session,
      question: currentQuestion,
      rawInput: "",
      selectedUnit: submittedUnit,
      timeTakenSeconds: skipTimer.elapsedSeconds
    });

    recordSubmission(submitted, currentQuestion, "", submittedUnit);
  }

  function recordSubmission(
    submitted: ReturnType<typeof submitAnswer>,
    question: Question,
    rawInput: string,
    submittedUnit: UnitType | undefined
  ) {
    const isComplete = isDrillSessionComplete(submitted.session);
    const nextSession =
      isComplete && session.settings.feedbackMode === "end_of_session"
        ? completeDrillSession({ session: submitted.session, questions: questionQueue })
        : submitted.session;

    setSession(nextSession);

    if (session.settings.feedbackMode === "end_of_session") {
      if (!isComplete) prepareNextQuestion();
      return;
    }

    setFeedback({
      question,
      rawInput,
      recorded: true,
      response: submitted.response,
      selectedUnit: submittedUnit,
      validation: submitted.validation
    });
  }

  function handleNextQuestion() {
    if (isDrillSessionComplete(session)) {
      setSession(completeDrillSession({ session, questions: questionQueue }));
      return;
    }

    prepareNextQuestion();
  }

  function handleRetrySimilar() {
    if (feedback?.recorded !== true || similarQuestion === undefined) {
      return;
    }

    setQuestionQueue((current) => insertAfterQuestion(current, feedback.question.id, similarQuestion));
    setSession((current) => ({
      ...current,
      endedAt: undefined,
      questionIds: insertAfterId(current.questionIds, feedback.question.id, similarQuestion.id),
      score: undefined
    }));
    prepareNextQuestion();
  }

  if (completedSummary !== undefined) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <SessionHeader
          eyebrow={t(sessionEyebrow)}
          lockedModeSummary={lockedModeSummary.map((item) => ({ label: t(item.label), value: t(item.value) }))}
          title={t(sessionTitle)}
          warnings={warnings.map((warning) => t(warning))}
        />
        <LocalSaveStatus
          onRetry={saveStatus === "error" ? () => setSaveAttempt((current) => current + 1) : undefined}
          status={saveStatus}
        />
        <SessionSummaryView
          newBestLabels={newBestLabels}
          repeatAction={
            benchmarkId === undefined
              ? undefined
              : {
                  href: buildBenchmarkSelectionHref(benchmarkId, completedSummary.settings.questionPackId),
                  label: "Repeat Benchmark"
                }
          }
          snapshot={completedSummary}
        />
      </main>
    );
  }

  const displayedQuestion = feedback?.question ?? currentQuestion;

  if (displayedQuestion === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <SessionHeader
          eyebrow={t(sessionEyebrow)}
          lockedModeSummary={lockedModeSummary.map((item) => ({ label: t(item.label), value: t(item.value) }))}
          title={t(sessionTitle)}
          warnings={warnings.map((warning) => t(warning))}
        />
        <p className="border border-s-2 border-coral/30 border-s-coral bg-coral/10 p-4 text-sm leading-6 text-ink">
          {t("No unanswered question is available for this session.")}
        </p>
      </main>
    );
  }

  const displayedInterviewMathMode = isInterviewMathQuestion(displayedQuestion, interviewMathMode);
  const interviewMathSpec = displayedInterviewMathMode
    ? displayedQuestion.metadata?.caseStyle?.interviewMath
    : undefined;
  const progressPercent = Math.round((progress.answeredCount / progress.totalQuestions) * 100);
  const displayedQuestionNumber = Math.max(1, questionQueue.findIndex((question) => question.id === displayedQuestion.id) + 1);
  const inputDisabled = feedback?.recorded === true || timer.isExpired;
  const requiresUnit = displayedQuestion.answer.unit !== undefined && displayedQuestion.answer.unit !== "none";
  const requiresEquationSetup = session.settings.caseRequireEquationSetup !== false;
  const requiresInterpretation = session.settings.caseRequireInterpretation === true;
  const submitDisabled =
    answer.trim() === "" ||
    inputDisabled ||
    (interviewMathSpec !== undefined &&
      ((requiresEquationSetup && equationOptionId === "") ||
        (requiresInterpretation && interpretationOptionId === "") ||
        selectedUnit === ""));

  if (displayedInterviewMathMode && interviewMathSpec === undefined) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <SessionHeader
          eyebrow={t(sessionEyebrow)}
          lockedModeSummary={lockedModeSummary.map((item) => ({ label: t(item.label), value: t(item.value) }))}
          title={t(sessionTitle)}
          warnings={warnings.map((warning) => t(warning))}
        />
        <p className="border border-s-2 border-coral/30 border-s-coral bg-coral/10 p-4 text-sm leading-6 text-ink">
          {t("Interview Math requires case-style questions with equation and interpretation choices.")}
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <SessionHeader
        eyebrow={t(sessionEyebrow)}
        lockedModeSummary={lockedModeSummary.map((item) => ({ label: t(item.label), value: t(item.value) }))}
        title={t(sessionTitle)}
        warnings={warnings.map((warning) => t(warning))}
      />

      <div
        className="grid max-w-full min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_18rem] xl:grid-cols-[minmax(0,1fr)_20rem]"
        data-testid="active-session-layout"
      >
        <section className="min-w-0 space-y-5" data-testid="active-session-workspace">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_13rem]">
            <ProgressCard
              answeredCount={progress.answeredCount}
              currentQuestionNumber={displayedQuestionNumber}
              progressPercent={progressPercent}
              remainingCount={progress.remainingCount}
              reviewing={feedback?.recorded === true}
              totalQuestions={progress.totalQuestions}
            />
            <TimerPanel
              settings={session.settings}
              timer={timer}
              timerDescriptionOverride={sessionTimerDescription}
            />
          </div>

          <section className="min-w-0 border border-ink/15 border-t-2 border-t-teal bg-white p-4 sm:p-6">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal">{t("Current Question")}</p>
                <p
                  className="min-w-0 max-w-3xl text-2xl font-semibold leading-9 text-ink [overflow-wrap:anywhere] sm:text-3xl sm:leading-10"
                  data-testid="active-question-prompt"
                  dir="auto"
                  id="active-question-prompt"
                >
                  {displayedQuestion.prompt}
                </p>
                <dl
                  aria-label={t("Question answer expectations")}
                  className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-6 text-ink/65"
                  data-testid="active-question-expectations"
                  id="active-question-expectations"
                >
                  <QuestionExpectation
                    label={t("Expected unit")}
                    value={t(formatExpectedUnit(displayedQuestion.answer.unit))}
                  />
                  {displayedQuestion.metadata?.expectedTimeSeconds === undefined ? null : (
                    <QuestionExpectation
                      label={t("Expected time")}
                      value={t("{seconds} seconds", {
                        seconds: formatLocaleNumber(displayedQuestion.metadata.expectedTimeSeconds)
                      })}
                    />
                  )}
                  {displayedQuestion.answer.roundingRule === undefined ? null : (
                    <QuestionExpectation
                      label={t("Rounding")}
                      value={formatRoundingRule(
                        displayedQuestion.answer.roundingRule,
                        displayedQuestion.answer.unit
                      )}
                    />
                  )}
                </dl>
              </div>
              {session.settings.hintsEnabled === true && feedback?.recorded !== true ? (
                <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
                  <button
                    aria-controls="active-question-hint"
                    aria-expanded={showHint}
                    className="min-h-11 w-fit rounded-md border border-teal/40 bg-white px-4 text-sm font-semibold text-teal transition hover:border-teal hover:bg-mint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2"
                    onClick={() => setShowHint((current) => !current)}
                    type="button"
                  >
                    {showHint ? t("Hide hint") : t("Show hint")}
                  </button>
                  {showHint ? (
                    <p
                      className="min-w-0 rounded-md border border-teal/20 bg-mint/50 px-3 py-2 text-sm leading-6 text-ink [overflow-wrap:anywhere]"
                      dir="auto"
                      id="active-question-hint"
                    >
                      {displayedQuestion.explanation.short}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <form
                aria-describedby="active-question-expectations"
                aria-labelledby="active-question-prompt"
                className="border-y border-ink/20 bg-paper/70 p-2 sm:p-4"
                data-testid="active-answer-panel"
                onSubmit={handleSubmit}
              >
                {interviewMathSpec === undefined ? (
                  <div
                    className={[
                      "grid gap-3 sm:items-end",
                      requiresUnit
                        ? "sm:grid-cols-[minmax(0,1fr)_minmax(9rem,12rem)_minmax(8rem,10rem)]"
                        : "sm:grid-cols-[minmax(0,1fr)_minmax(8rem,10rem)]"
                    ].join(" ")}
                  >
                    <label className="grid gap-2 text-sm font-semibold text-ink/80">
                      {t("Answer")}
                      <input
                        aria-describedby="active-question-prompt active-question-expectations"
                        autoComplete="off"
                        autoFocus
                        className="h-14 w-full rounded-md border border-ink/50 bg-white px-4 text-xl font-semibold text-ink outline-none transition placeholder:text-ink/65 focus:border-teal focus:ring-2 focus:ring-mint disabled:bg-white/70 disabled:text-ink/65"
                        disabled={inputDisabled}
                        inputMode="decimal"
                        onChange={(event) => setAnswer(event.currentTarget.value)}
                        placeholder="0"
                        ref={answerInputRef}
                        spellCheck={false}
                        value={answer}
                      />
                    </label>
                    {requiresUnit ? (
                      <label className="grid gap-2 text-sm font-semibold text-ink/80">
                        {t("Answer unit")}
                        <select
                          aria-describedby="active-question-prompt active-question-expectations"
                          className="h-14 rounded-md border border-ink/50 bg-white px-3 text-sm font-semibold text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-mint disabled:bg-white/70"
                          disabled={inputDisabled}
                          onChange={(event) => setSelectedUnit(event.currentTarget.value as UnitType | "")}
                          value={selectedUnit}
                        >
                          <option value="">{t("Use prompt unit")}</option>
                          {unitPreferenceOptions
                            .filter((option) => option.value !== "none")
                            .map((option) => (
                              <option key={option.value} value={option.value}>
                                {t(option.label)}
                              </option>
                            ))}
                        </select>
                      </label>
                    ) : null}
                    <button
                      className="inline-flex h-14 w-full items-center justify-center rounded-md bg-ink px-5 text-base font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink/30"
                      disabled={submitDisabled}
                      type="submit"
                    >
                      {t("Submit")}
                    </button>
                  </div>
                ) : (
                  <InterviewMathAnswerFields
                    answer={answer}
                    answerInputRef={answerInputRef}
                    disabled={inputDisabled}
                    describedBy="active-question-prompt active-question-expectations"
                    equationOptionId={equationOptionId}
                    firstEquationInputRef={firstEquationInputRef}
                    interpretationOptionId={interpretationOptionId}
                    onAnswerChange={setAnswer}
                    onEquationChange={setEquationOptionId}
                    onInterpretationChange={setInterpretationOptionId}
                    onUnitChange={setSelectedUnit}
                    requireEquationSetup={requiresEquationSetup}
                    requireInterpretation={requiresInterpretation}
                    selectedUnit={selectedUnit}
                    spec={interviewMathSpec}
                    submitDisabled={submitDisabled}
                  />
                )}
                <div className="mt-3 flex min-h-11 flex-wrap gap-3">
                  {feedback === undefined ? (
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-ink/30 bg-white px-4 text-sm font-semibold text-ink transition hover:border-coral hover:bg-coral/10 hover:text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 sm:w-auto sm:min-w-24"
                      onClick={handleSkip}
                      type="button"
                    >
                      {t("Skip")}
                    </button>
                  ) : null}
                  {feedback?.recorded ? (
                    <button
                      className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-ink/30 bg-white px-4 text-sm font-semibold text-ink transition hover:border-teal hover:bg-mint hover:text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 sm:w-auto sm:min-w-24"
                      onClick={handleNextQuestion}
                      ref={nextButtonRef}
                      type="button"
                    >
                      {isDrillSessionComplete(session) ? t("View summary") : t("Next")}
                    </button>
                  ) : null}
                </div>
              </form>
              <details className="group border-y border-ink/20 bg-paper/70 p-3">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between text-sm font-semibold text-ink marker:content-none">
                  {t("Scratchpad")}
                  <span aria-hidden="true" className="text-lg text-teal transition-transform motion-reduce:transition-none group-open:rotate-45">+</span>
                </summary>
                <label className="mt-3 grid gap-2 text-sm font-medium text-ink/75">
                  {t("Private notes for this session")}
                  <textarea
                    className="min-h-28 resize-y rounded-md border border-ink/50 bg-white p-3 text-sm leading-6 text-ink outline-none focus:border-teal focus:ring-2 focus:ring-mint"
                    dir="auto"
                    onChange={(event) => setScratchpad(event.currentTarget.value)}
                    value={scratchpad}
                  />
                </label>
              </details>
            </div>
          </section>

          {feedback !== undefined && session.settings.feedbackMode !== "end_of_session" ? (
            <FeedbackPanel
              feedback={feedback}
              onRetrySimilar={
                feedback.recorded && similarQuestion !== undefined ? handleRetrySimilar : undefined
              }
            />
          ) : null}
        </section>

        <aside
          aria-labelledby="active-session-queue-heading"
          className="h-fit min-w-0 border border-ink/15 border-t-2 border-t-coral bg-white p-4 sm:p-5 lg:sticky lg:top-6"
          data-testid="active-session-queue"
        >
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-5">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-coral">{t("Queue")}</p>
              <h2 className="mt-2 text-xl font-semibold text-ink" id="active-session-queue-heading">
                {t(queueTitle)}
              </h2>
            </div>
            <ol
              aria-labelledby="active-session-queue-heading"
              className="grid max-h-[28rem] min-w-0 grid-cols-[minmax(0,1fr)] gap-2 overflow-y-auto pr-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
              tabIndex={0}
            >
              {questionQueue.map((question, index) => {
                const response = session.responses.find((item) => item.questionId === question.id);
                const active = question.id === displayedQuestion.id;

                return (
                  <li
                    className={[
                      "min-w-0 border border-s-2 px-3 py-2 text-sm leading-6 [overflow-wrap:anywhere]",
                      active ? "border-teal bg-mint text-ink" : "border-ink/10 bg-paper text-ink/75"
                    ].join(" ")}
                    key={question.id}
                  >
                    <span className="font-semibold">{formatLocaleNumber(index + 1)}.</span>{" "}
                    {active || response !== undefined ? <bdi dir="auto">{question.prompt}</bdi> : t("Upcoming question")}
                    {response !== undefined ? <ResponseBadge response={response} /> : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </aside>
      </div>
    </main>
  );
}

function InterviewMathAnswerFields({
  answer,
  answerInputRef,
  disabled,
  describedBy,
  equationOptionId,
  firstEquationInputRef,
  interpretationOptionId,
  onAnswerChange,
  onEquationChange,
  onInterpretationChange,
  onUnitChange,
  requireEquationSetup,
  requireInterpretation,
  selectedUnit,
  spec,
  submitDisabled
}: {
  answer: string;
  answerInputRef: RefObject<HTMLInputElement>;
  disabled: boolean;
  describedBy: string;
  equationOptionId: string;
  firstEquationInputRef: RefObject<HTMLInputElement>;
  interpretationOptionId: string;
  onAnswerChange: (value: string) => void;
  onEquationChange: (value: string) => void;
  onInterpretationChange: (value: string) => void;
  onUnitChange: (value: UnitType | "") => void;
  requireEquationSetup: boolean;
  requireInterpretation: boolean;
  selectedUnit: UnitType | "";
  spec: InterviewMathSpec;
  submitDisabled: boolean;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-5" data-testid="interview-math-fields">
      <div className="grid min-w-0 gap-5 xl:grid-cols-2 xl:items-start">
        <div className="grid min-w-0 gap-5">
          <fieldset aria-describedby={describedBy} className="grid min-w-0 gap-2" disabled={disabled}>
            <legend className="text-sm font-semibold text-ink">
              {t("1. Equation setup ({requirement})", { requirement: t(requireEquationSetup ? "required" : "optional") })}
            </legend>
            {spec.equationOptions.map((option, index) => (
              <label
                className={[
                  "grid min-h-11 min-w-0 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2 rounded-md border px-3 py-3 text-sm leading-6 transition",
                  equationOptionId === option.id
                    ? "border-teal bg-mint/70 text-ink"
                    : "border-ink/15 bg-white text-ink/75 hover:border-teal"
                ].join(" ")}
                key={option.id}
              >
                <input
                  checked={equationOptionId === option.id}
                  className="mt-1 h-4 w-4 accent-teal"
                  name="interview-equation"
                  onChange={() => onEquationChange(option.id)}
                  ref={index === 0 ? firstEquationInputRef : undefined}
                  required={requireEquationSetup}
                  type="radio"
                  value={option.id}
                />
                <span className="min-w-0 break-words font-semibold" dir="auto">{option.label}</span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(10rem,13rem)] xl:grid-cols-1">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              {t("2. Answer")}
              <input
                aria-describedby={describedBy}
                autoComplete="off"
                className="h-14 w-full rounded-md border border-ink/50 bg-white px-4 text-xl font-semibold text-ink outline-none transition placeholder:text-ink/65 focus:border-teal focus:ring-2 focus:ring-mint disabled:bg-white/70 disabled:text-ink/65"
                disabled={disabled}
                inputMode="decimal"
                onChange={(event) => onAnswerChange(event.currentTarget.value)}
                placeholder="0"
                ref={answerInputRef}
                required
                spellCheck={false}
                value={answer}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              {t("Answer unit")}
              <select
                aria-describedby={describedBy}
                className="h-14 w-full rounded-md border border-ink/50 bg-white px-3 text-base font-semibold text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-mint disabled:bg-white/70 disabled:text-ink/65"
                disabled={disabled}
                onChange={(event) => onUnitChange(event.currentTarget.value as UnitType | "")}
                required
                value={selectedUnit}
              >
                <option value="">{t("Choose unit")}</option>
                {unitPreferenceOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <fieldset aria-describedby={describedBy} className="grid min-w-0 gap-2" disabled={disabled}>
          <legend className="text-sm font-semibold text-ink">
            {t("3. Interpretation ({requirement})", { requirement: t(requireInterpretation ? "required" : "optional") })}
          </legend>
          {!requireInterpretation ? (
            <label
              className={[
                "grid min-h-11 min-w-0 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2 rounded-md border px-3 py-3 text-sm leading-6 transition",
                interpretationOptionId === ""
                  ? "border-teal bg-mint/70 text-ink"
                  : "border-ink/15 bg-white text-ink/75 hover:border-teal"
              ].join(" ")}
            >
              <input
                checked={interpretationOptionId === ""}
                className="mt-1 h-4 w-4 accent-teal"
                name="interview-interpretation"
                onChange={() => onInterpretationChange("")}
                type="radio"
                value=""
              />
              <span className="font-semibold">{t("Skip interpretation")}</span>
            </label>
          ) : null}
          {spec.interpretationOptions.map((option) => (
            <label
              className={[
                "grid min-h-11 min-w-0 cursor-pointer grid-cols-[1.25rem_minmax(0,1fr)] items-start gap-2 rounded-md border px-3 py-3 text-sm leading-6 transition",
                interpretationOptionId === option.id
                  ? "border-teal bg-mint/70 text-ink"
                  : "border-ink/15 bg-white text-ink/75 hover:border-teal"
              ].join(" ")}
              key={option.id}
            >
              <input
                checked={interpretationOptionId === option.id}
                className="mt-1 h-4 w-4 accent-teal"
                name="interview-interpretation"
                onChange={() => onInterpretationChange(option.id)}
                type="radio"
                value={option.id}
              />
              <span className="min-w-0 break-words font-semibold" dir="auto">{option.label}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <button
        className="inline-flex h-14 w-full items-center justify-center rounded-md bg-ink px-5 text-base font-semibold text-white transition hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-ink/30 sm:w-44"
        disabled={submitDisabled}
        type="submit"
      >
        {t("Submit")}
      </button>
    </div>
  );
}

function ProgressCard({
  answeredCount,
  currentQuestionNumber,
  progressPercent,
  remainingCount,
  reviewing,
  totalQuestions
}: {
  answeredCount: number;
  currentQuestionNumber: number;
  progressPercent: number;
  remainingCount: number;
  reviewing: boolean;
  totalQuestions: number;
}) {
  const { formatNumber: formatLocaleNumber, formatPercent, t } = useI18n();

  return (
    <section className="border border-ink/15 border-t-2 border-t-teal bg-white p-4" data-testid="active-session-progress">
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm font-semibold text-ink/70">
          <span className="text-ink">
            {t(reviewing ? "Reviewing question {current} of {total}" : "Question {current} of {total}", {
              current: formatLocaleNumber(currentQuestionNumber), total: formatLocaleNumber(totalQuestions)
            })}
          </span>
          <span>{t("{percent} complete", { percent: formatPercent(progressPercent / 100) })}</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-paper" aria-hidden="true">
          <div className="h-full rounded-full bg-teal" style={{ width: `${progressPercent}%` }} />
        </div>
        <p className="text-xs font-semibold text-ink/65">
          {t("{answered} answered / {remaining} left", { answered: formatLocaleNumber(answeredCount), remaining: formatLocaleNumber(remainingCount) })}
        </p>
      </div>
    </section>
  );
}

function LocalSaveStatus({
  onRetry,
  status
}: {
  onRetry?: () => void;
  status: "idle" | "saving" | "saved" | "error";
}) {
  const { t } = useI18n();

  if (status === "idle") {
    return null;
  }

  const text = {
    error: "Could not save this session on this device.",
    saved: "Session saved on this device.",
    saving: "Saving on this device..."
  }[status];

  return (
    <div className="grid gap-3" data-testid="local-save-status">
      <LocalSaveNotice
        detail={t(text)}
        label={t(status === "saved" ? "Saved on this device" : "Save status")}
        tone={status === "saved" ? "success" : status === "error" ? "error" : "neutral"}
      />
      {onRetry === undefined ? null : (
        <button
          className="inline-flex min-h-11 w-fit items-center justify-center border border-ink/40 bg-white px-4 text-sm font-semibold text-ink transition hover:bg-mint"
          onClick={onRetry}
          type="button"
        >
          {t("Retry Save")}
        </button>
      )}
    </div>
  );
}

function TimerPanel({
  settings,
  timer,
  timerDescriptionOverride
}: {
  settings: DrillSession["settings"];
  timer: ReturnType<typeof createTimerSnapshot>;
  timerDescriptionOverride?: string;
}) {
  const { formatDuration, t } = useI18n();
  const accommodation = normalizeTimingAccommodation(settings.timingAccommodation);
  const timed = timer.remainingSeconds !== undefined;
  const timerPercent =
    timer.remainingSeconds !== undefined && timer.limitSeconds !== undefined
      ? Math.round((timer.remainingSeconds / timer.limitSeconds) * 100)
      : 100;

  return (
    <section
      className={[
        "grid gap-3 border border-t-2 p-4",
        timer.isExpired
          ? "border-coral/30 border-t-coral bg-coral/10"
          : "border-ink/15 border-t-teal bg-white"
      ].join(" ")}
      aria-label={t("Session timing")}
      data-testid="active-session-timer"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink/65">
            {t(timed ? "Time Left" : "Elapsed")}
          </p>
          <p
            aria-label={t(timed ? "Time remaining {time}" : "Elapsed time {time}", { time: timer.label })}
            aria-live="off"
            className="mt-1 text-2xl font-semibold text-ink"
            role="timer"
          >
            {timer.label}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <span className="rounded bg-paper px-2 py-1 text-xs font-semibold text-ink/70">
            {t(timerModeLabel(settings.timeMode))}
          </span>
          {timer.standardLimitSeconds === undefined ? null : (
            <span className="rounded bg-mint px-2 py-1 text-xs font-semibold text-teal">
              {t(timingAccommodationLabel(accommodation))}
            </span>
          )}
        </div>
      </div>
      <div className="grid gap-2">
        <div className="h-2 overflow-hidden rounded-full bg-paper" aria-hidden="true">
          <div
            className={[timer.isExpired ? "bg-coral" : "bg-teal", "h-full rounded-full"].join(" ")}
            style={{ width: `${timerPercent}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-ink/65">
          {t(timerDescriptionOverride ?? timerDescription(settings.timeMode, timer))}
        </p>
        {timer.standardLimitSeconds === undefined ? null : (
          <p className="text-xs font-semibold text-ink/65" data-testid="active-timing-accommodation">
            {timer.limitSeconds === undefined
              ? t("{accommodation}. No automatic timeout; the standard limit is {standard}.", {
                  accommodation: t(timingAccommodationLabel(accommodation)),
                  standard: formatDuration(timer.standardLimitSeconds)
                })
              : accommodation === "standard"
                ? t("{accommodation}. The active limit is {effective}.", {
                    accommodation: t(timingAccommodationLabel(accommodation)),
                    effective: formatDuration(timer.limitSeconds)
                  })
                : t("{accommodation}. Your limit is {effective}; the standard limit is {standard}.", {
                    accommodation: t(timingAccommodationLabel(accommodation)),
                    effective: formatDuration(timer.limitSeconds),
                    standard: formatDuration(timer.standardLimitSeconds)
                  })}
          </p>
        )}
      </div>
    </section>
  );
}

function timerModeLabel(mode: DrillSession["settings"]["timeMode"]): string {
  if (mode === "per_question") {
    return "Per-question timer";
  }

  if (mode === "session") {
    return "Session timer";
  }

  return "Untimed";
}

function timerDescription(mode: DrillSession["settings"]["timeMode"], timer: ReturnType<typeof createTimerSnapshot>): string {
  if (timer.limitSeconds === undefined) {
    return timer.standardLimitSeconds === undefined
      ? "No time limit; elapsed time is recorded for scoring context."
      : "No automatic timeout; elapsed time is recorded for scoring context.";
  }

  if (mode === "per_question") {
    return `${formatWholeSeconds(timer.limitSeconds)} limit for this question; resets for each question.`;
  }

  if (mode === "session") {
    return `${formatWholeSeconds(timer.limitSeconds)} limit for the full drill.`;
  }

  return "No time limit; elapsed time is recorded for scoring context.";
}

function formatWholeSeconds(seconds: number | undefined): string {
  return seconds === undefined ? "No" : `${seconds}s`;
}

function SessionHeader({
  eyebrow,
  lockedModeSummary,
  title,
  warnings
}: {
  eyebrow: string;
  lockedModeSummary: LockedModeSummaryItem[];
  title: string;
  warnings: string[];
}) {
  const { t } = useI18n();

  return (
    <header className="space-y-3">
      <p className="text-sm font-semibold uppercase tracking-wide text-teal">{eyebrow}</p>
      <h1 className="text-3xl font-semibold tracking-[-0.035em] text-ink sm:text-4xl">{title}</h1>
      {lockedModeSummary.length > 0 ? (
        <section
          className="grid min-w-0 gap-3 border-y border-teal/30 bg-mint/50 py-4"
          data-testid="active-session-lock-panel"
        >
          <div className="grid gap-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-teal">{t("Locked Benchmark Mode")}</p>
            <p className="text-sm leading-6 text-ink/70">
              {t("Settings are fixed for a comparable score. Hints stay off and feedback appears after the final question.")}
            </p>
          </div>
          <dl className="grid min-w-0 gap-2 sm:grid-cols-3">
            {lockedModeSummary.map((item) => (
              <div className="min-w-0 border-s-2 border-teal/30 bg-white px-3 py-2" key={item.label}>
                <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{item.label}</dt>
                <dd className="mt-1 break-words text-sm font-semibold text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {warnings.length > 0 ? (
        <div className="grid gap-2">
          {warnings.map((warning) => (
            <p className="rounded-md bg-saffron/20 px-3 py-2 text-sm leading-6 text-ink" key={warning}>
              {warning}
            </p>
          ))}
        </div>
      ) : null}
    </header>
  );
}

function FeedbackPanel({
  feedback,
  onRetrySimilar
}: {
  feedback: FeedbackState;
  onRetrySimilar?: () => void;
}) {
  const { t } = useI18n();
  const isCorrect = feedback.validation.isCorrect;
  const isRetry = feedback.recorded === false;
  const shouldShowTip =
    feedback.recorded &&
    (!isCorrect ||
      (feedback.response?.interviewMath !== undefined && feedback.response.interviewMath.score.total < 100));
  const strategyTip = shouldShowTip
    ? resolveStrategyTip({
        errorTypes: feedback.response?.errorTypes ?? feedback.validation.errorTypes,
        tags: feedback.question.tags
      })
    : undefined;

  return (
    <section
      aria-atomic="true"
      aria-live="polite"
      className={[
        "min-w-0 border border-s-2 p-4 sm:p-5",
        isCorrect ? "border-teal/30 bg-mint/70" : isRetry ? "border-saffron/40 bg-saffron/15" : "border-coral/30 bg-coral/10"
      ].join(" ")}
      data-testid="active-feedback-panel"
      role="status"
    >
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-semibold text-ink">{t(feedbackTitle(feedback))}</p>
          <span
            className={[
              "rounded px-2 py-1 text-xs font-semibold",
              isCorrect ? "bg-teal text-white" : isRetry ? "bg-saffron/50 text-ink" : "bg-coral text-white"
            ].join(" ")}
          >
            {t(feedbackStatusLabel(feedback))}
          </span>
        </div>
        <p className="text-sm leading-6 text-ink/75">{t(feedback.validation.feedbackMessage)}</p>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div className="rounded-md bg-white/80 px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Your answer")}</dt>
            <dd className="mt-1 font-semibold text-ink">
              {formatSubmittedAnswer(feedback.rawInput, feedback.selectedUnit)}
            </dd>
          </div>
          <div className="rounded-md bg-white/80 px-3 py-2">
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink/65">{t("Error type")}</dt>
            <dd className="mt-1 font-semibold text-ink">
              {t(formatErrorTypes(feedback.response?.errorTypes ?? feedback.validation.errorTypes))}
            </dd>
          </div>
        </dl>
        {feedback.response?.interviewMath !== undefined ? (
          <InterviewMathScoreBreakdown score={feedback.response.interviewMath.score} />
        ) : null}
        {isRetry ? (
          <p className="rounded-md bg-white/80 px-3 py-2 text-sm leading-6 text-ink">
            {t("Your first answer was not recorded. Adjust it and submit again.")}
          </p>
        ) : (
          <div className="rounded-md bg-white/80 px-3 py-2 text-sm text-ink">
            {t("Correct answer:")}{" "}
            <span className="font-semibold">
              {formatAnswerWithUnit(feedback.validation.correctValue, feedback.question.answer.unit)}
            </span>
          </div>
        )}
        {feedback.recorded ? (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2 [overflow-wrap:anywhere]">
            {feedback.question.explanation.steps.map((step) => (
              <p className="text-sm leading-6 text-ink/75" dir="auto" key={step}>
                {step}
              </p>
            ))}
          </div>
        ) : null}
        {feedback.recorded && feedback.question.explanation.shortcut !== undefined ? (
          <p className="min-w-0 rounded-md border border-saffron/30 bg-white/80 px-3 py-2 text-sm leading-6 text-ink [overflow-wrap:anywhere]">
            <span className="font-semibold">{t("Shortcut:")}</span>{" "}
            <bdi dir="auto">{feedback.question.explanation.shortcut}</bdi>
          </p>
        ) : null}
        {strategyTip !== undefined ? (
          <aside className="rounded-md border border-teal/20 bg-white/80 px-3 py-3 text-sm leading-6 text-ink">
            <p className="font-semibold text-teal">{t("Strategy tip:")} {t(strategyTip.title)}</p>
            <p className="mt-1 text-ink/75">{t(strategyTip.body)}</p>
          </aside>
        ) : null}
        {onRetrySimilar !== undefined ? (
          <button
            className="min-h-11 w-fit rounded-md border border-teal bg-white px-4 text-sm font-semibold text-teal transition hover:bg-mint"
            onClick={onRetrySimilar}
            type="button"
          >
            {t("Retry similar question")}
          </button>
        ) : null}
      </div>
    </section>
  );
}

function feedbackTitle(feedback: FeedbackState): string {
  if (feedback.recorded === false) {
    return "Try again";
  }

  if (feedback.validation.isCorrect) {
    return feedback.response?.interviewMath !== undefined && feedback.response.interviewMath.score.total < 100
      ? "Core answer correct"
      : "Correct";
  }

  return "Needs review";
}

function feedbackStatusLabel(feedback: FeedbackState): string {
  if (feedback.recorded === false) {
    return "Not recorded";
  }

  if (feedback.validation.isCorrect) {
    return feedback.response?.interviewMath === undefined
      ? "Recorded"
      : `${feedback.response.interviewMath.score.total}/100`;
  }

  return feedback.response?.interviewMath === undefined
    ? "Needs review"
    : `${feedback.response.interviewMath.score.total}/100`;
}

function ResponseBadge({ response }: { response: UserResponse }) {
  const { formatNumber: formatLocaleNumber, t } = useI18n();

  return (
    <span
      className={[
        "mt-2 inline-flex rounded px-2 py-1 text-xs font-semibold",
        response.isCorrect ? "bg-teal text-white" : "bg-coral text-white"
      ].join(" ")}
    >
      {response.interviewMath === undefined
        ? response.isCorrect
          ? t("Correct")
          : t("Needs review")
        : t("{score} pts", { score: formatLocaleNumber(response.interviewMath.score.total) })}
    </span>
  );
}

function createInterviewMathSubmission(
  equationOptionId: string,
  interpretationOptionId: string,
  settings: Pick<DrillSettings, "caseRequireEquationSetup" | "caseRequireInterpretation">
): InterviewMathSubmission {
  return {
    equationOptionId: equationOptionId || undefined,
    interpretationOptionId: interpretationOptionId || undefined,
    requireEquationSetup: settings.caseRequireEquationSetup,
    requireInterpretation: settings.caseRequireInterpretation
  };
}

function isInterviewMathQuestion(question: Question | undefined, explicitMode: boolean): boolean {
  return explicitMode || question?.metadata?.caseStyle !== undefined;
}

function insertAfterQuestion(questions: readonly Question[], questionId: string, retry: Question): Question[] {
  const index = questions.findIndex((question) => question.id === questionId);

  return index < 0
    ? [...questions, retry]
    : [...questions.slice(0, index + 1), retry, ...questions.slice(index + 1)];
}

function insertAfterId(ids: readonly string[], questionId: string, retryId: string): string[] {
  const index = ids.indexOf(questionId);

  return index < 0 ? [...ids, retryId] : [...ids.slice(0, index + 1), retryId, ...ids.slice(index + 1)];
}

function formatSubmittedAnswer(rawInput: string, unit: UnitType | undefined): string {
  const value = rawInput.trim() === "" ? "Skipped" : rawInput;

  return unit === undefined || unit === "none" ? value : `${value} (${formatUnit(unit)})`;
}

function QuestionExpectation({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-1">
      <dt className="font-semibold text-ink/75">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatExpectedUnit(unit: UnitType | undefined): string {
  const value = unit ?? "none";

  return expectedUnitLabels[value] ?? unitPreferenceOptions.find((option) => option.value === value)?.label ?? formatUnit(value);
}

function formatRoundingRule(rule: RoundingRule, unit: UnitType | undefined): string {
  return rule === "nearest_0_1" && (unit === "percentage" || unit === "percentage_points")
    ? "Nearest 0.1 percentage point"
    : roundingRuleLabels[rule];
}

function formatAnswerWithUnit(value: number, unit: UnitType | undefined): string {
  if (unit === undefined || unit === "none") {
    return formatNumber(value);
  }

  if (unit === "currency") return `$${formatNumber(value)}`;
  if (unit === "percentage") return `${formatNumber(value * 100)}%`;
  return `${formatNumber(value)} ${formatUnit(unit)}`;
}

function formatUnit(unit: UnitType): string {
  const labels: Partial<Record<UnitType, string>> = {
    b: "B",
    currency: "$",
    k: "K",
    m: "M",
    percentage: "%",
    percentage_points: "percentage points"
  };

  return labels[unit] ?? unit.replaceAll("_", " ");
}

function formatErrorTypes(errorTypes: readonly ErrorType[]): string {
  const visible = errorTypes.filter((errorType) => errorType !== "none");

  return visible.length === 0 ? "None" : visible.map((errorType) => errorTypeLabels[errorType]).join(", ");
}

const errorTypeLabels: Record<ErrorType, string> = {
  arithmetic_error: "Calculation error",
  formula_error: "Formula error",
  interpretation_error: "Interpretation error",
  magnitude_error: "Magnitude error",
  none: "None",
  percentage_point_error: "Percentage-point error",
  rounding_error: "Rounding error",
  setup_error: "Setup error",
  timeout: "Timeout",
  unit_error: "Unit error"
};

function elapsedSeconds(startedAt: number, endedAt: number): number {
  return Math.max(0, Math.round(((endedAt - startedAt) / 1000) * 10) / 10);
}

function currentTimestampMs(): number {
  return Date.now();
}

function parseSessionStartedAt(startedAt: string, fallback: number): number {
  const parsed = Date.parse(startedAt);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function timeoutSeconds(settings: DrillSession["settings"], elapsed: number): number {
  return getTimeLimitSeconds(settings) ?? elapsed;
}
