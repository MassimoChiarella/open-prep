import type { BenchmarkScoreBand } from "@/features/benchmarks/benchmarkTypes";
import type { BrainstormingPrompt } from "@/features/case-practice/brainstorming/brainstormingScoring";
import type { FitPracticePrompt } from "@/features/case-practice/fit/fitPractice";
import type { ConceptLesson } from "@/features/case-practice/lessons/conceptLessonScoring";
import type { FullCaseSimulationSpec } from "@/features/case-practice/simulation/fullCaseTypes";
import type { CaseQuestioningPrompt } from "@/features/case-practice/questioning/questioningScoring";
import type { CaseStructuringPrompt } from "@/features/case-practice/structuring/structuringScoring";
import type { SynthesisPrompt } from "@/features/case-practice/synthesis/synthesisScoring";
import type { ExhibitDataset } from "@/features/exhibits/exhibitTypes";
import type { MarketSizingTemplate } from "@/features/market-sizing/marketSizingTypes";
import type { PracticeRecord } from "@/features/case-practice/practiceTypes";
import type {
  AnswerSpec,
  Difficulty,
  DrillSession,
  DrillSettings,
  ErrorType,
  ExplanationSpec,
  Question,
  QuestionMetadata,
  QuestionTemplate,
  SessionScore,
  SkillCategory,
  SkillTag,
  UserResponse
} from "@/lib/domain";

export const appDatabaseName = "consulting_math_drill_tool";
export const appDatabaseVersion = 7;

export interface QuestionPackQuestionRecord {
  id: string;
  type: "numeric";
  category: SkillCategory;
  tags: SkillTag[];
  difficulty: Difficulty;
  prompt: string;
  answer: AnswerSpec;
  explanation: ExplanationSpec;
  expectedTimeSeconds?: number;
}

export interface FixedNumericQuestionPackRecord {
  id: string;
  format: "math-drill-question-pack";
  schemaVersion: 2;
  kind: "fixed_numeric";
  packVersion: string;
  title: string;
  description?: string;
  publisher?: string;
  license?: string;
  questions: QuestionPackQuestionRecord[];
  importedAt: string;
}

export interface GeneratedTemplateQuestionPackRecord {
  id: string;
  format: "math-drill-question-pack";
  schemaVersion: 2;
  kind: "generated_template";
  packVersion: string;
  title: string;
  description?: string;
  publisher?: string;
  license?: string;
  templates: QuestionTemplate[];
  importedAt: string;
}

export interface ExhibitQuestionPackRecord {
  id: string;
  format: "math-drill-question-pack";
  schemaVersion: 2;
  kind: "exhibit";
  packVersion: string;
  title: string;
  description?: string;
  publisher?: string;
  license?: string;
  datasets: ExhibitDataset[];
  importedAt: string;
}

export interface MarketSizingQuestionPackRecord {
  id: string;
  format: "math-drill-question-pack";
  schemaVersion: 2;
  kind: "market_sizing";
  packVersion: string;
  title: string;
  description?: string;
  publisher?: string;
  license?: string;
  templates: MarketSizingTemplate[];
  importedAt: string;
}

export interface QuestionPackBenchmarkRecord {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  totalSessionSeconds: number;
  scoreBands: BenchmarkScoreBand[];
  questions: QuestionPackQuestionRecord[];
}

export interface BenchmarkQuestionPackRecord {
  id: string;
  format: "math-drill-question-pack";
  schemaVersion: 2;
  kind: "benchmark";
  packVersion: string;
  title: string;
  description?: string;
  publisher?: string;
  license?: string;
  benchmarks: QuestionPackBenchmarkRecord[];
  importedAt: string;
}

export interface CasePracticeQuestionPackRecord {
  id: string;
  format: "math-drill-question-pack";
  schemaVersion: 2 | 3;
  kind: "case_practice";
  packVersion: string;
  title: string;
  description?: string;
  publisher?: string;
  license?: string;
  structuringPrompts?: CaseStructuringPrompt[];
  brainstormingPrompts?: BrainstormingPrompt[];
  synthesisPrompts?: SynthesisPrompt[];
  lessons?: ConceptLesson[];
  fitPrompts?: FitPracticePrompt[];
  questioningPrompts?: CaseQuestioningPrompt[];
  fullCases?: FullCaseSimulationSpec[];
  importedAt: string;
}

export type QuestionPackRecord =
  | FixedNumericQuestionPackRecord
  | GeneratedTemplateQuestionPackRecord
  | ExhibitQuestionPackRecord
  | MarketSizingQuestionPackRecord
  | BenchmarkQuestionPackRecord
  | CasePracticeQuestionPackRecord;

export interface StoredDrillSession extends DrillSession {
  draftKey?: string;
  questions?: Question[];
  updatedAt: string;
}

export interface StoredUserResponse extends UserResponse {
  id: string;
  sessionId: string;
  category?: SkillCategory;
  tags?: SkillTag[];
}

export interface BenchmarkResultRecord {
  id: string;
  benchmarkId: string;
  completedAt: string;
  difficulty: Difficulty;
  score: SessionScore;
  sessionId: string;
}

export interface UserSettingsRecord {
  id: "default";
  settings: DrillSettings;
  updatedAt: string;
}

export interface MarketSizingScoreDimensionRecord {
  awardedPoints: number;
  id: string;
  label: string;
  maxPoints: number;
  message: string;
}

export interface MarketSizingAttemptRecord {
  id: string;
  templateId: string;
  startedAt: string;
  completedAt?: string;
  calculatedValue?: number;
  errorTypes?: ErrorType[];
  finalAnswer?: string;
  inputValues?: Record<string, boolean | string | undefined>;
  interpretationId?: string;
  maxScore?: number;
  normalizedFinalAnswer?: number;
  note?: string;
  score?: number;
  scoreBreakdown?: MarketSizingScoreDimensionRecord[];
}

export interface ExhibitAttemptRecord {
  id: string;
  exhibitId: string;
  questionId?: string;
  startedAt: string;
  completedAt?: string;
  correctValue?: number;
  errorTypes?: ErrorType[];
  feedbackMessage?: string;
  isCorrect?: boolean;
  normalizedValue?: number;
  rawInput?: string;
  score?: number;
}

export type MistakeNotebookSourceType = "benchmark" | "drill" | "exhibit" | "market_sizing";
export type MistakeNotebookStatus = "resolved" | "unresolved";

export interface MistakeNotebookRecord {
  id: string;
  sourceQuestionId: string;
  sourceResponseId?: string;
  sourceSessionId?: string;
  sourceType: MistakeNotebookSourceType;
  prompt: string;
  answer: AnswerSpec;
  category: SkillCategory;
  tags: SkillTag[];
  difficulty: Difficulty;
  explanation: ExplanationSpec;
  metadata?: QuestionMetadata;
  rawInput: string;
  normalizedValue?: number;
  errorTypes: ErrorType[];
  missedAt: string;
  lastRetriedAt?: string;
  resolvedAt?: string;
  retryCount: number;
  status: MistakeNotebookStatus;
}

export interface RetryScheduleRecord {
  id: string;
  sourceId: string;
  sourceType: "mistake_notebook";
  dueAt: string;
  intervalDays: number;
  attemptCount: number;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
}

export interface AppDatabaseSchema {
  drill_sessions: StoredDrillSession;
  responses: StoredUserResponse;
  benchmark_results: BenchmarkResultRecord;
  user_settings: UserSettingsRecord;
  market_sizing_attempts: MarketSizingAttemptRecord;
  exhibit_attempts: ExhibitAttemptRecord;
  mistake_notebook: MistakeNotebookRecord;
  retry_schedules: RetryScheduleRecord;
  practice_records: PracticeRecord;
  question_packs: QuestionPackRecord;
}

export type AppStoreName = keyof AppDatabaseSchema & string;
export type AppStoreValue<TStore extends AppStoreName> = AppDatabaseSchema[TStore];
export type AppStoreKey<TStore extends AppStoreName> = AppStoreValue<TStore> extends {
  id: infer TKey extends IDBValidKey;
}
  ? TKey
  : IDBValidKey;

export interface AppStorage {
  get<TStore extends AppStoreName>(
    storeName: TStore,
    key: AppStoreKey<TStore>
  ): Promise<AppStoreValue<TStore> | undefined>;
  getAll<TStore extends AppStoreName>(storeName: TStore): Promise<AppStoreValue<TStore>[]>;
  put<TStore extends AppStoreName>(storeName: TStore, value: AppStoreValue<TStore>): Promise<void>;
  delete<TStore extends AppStoreName>(storeName: TStore, key: AppStoreKey<TStore>): Promise<void>;
  clear<TStore extends AppStoreName>(storeName: TStore): Promise<void>;
  clearAll(): Promise<void>;
  close(): void;
}

export const progressStoreNames = [
  "drill_sessions",
  "responses",
  "benchmark_results",
  "user_settings",
  "market_sizing_attempts",
  "exhibit_attempts",
  "mistake_notebook",
  "retry_schedules",
  "practice_records"
] as const satisfies readonly AppStoreName[];

export type ProgressStoreName = (typeof progressStoreNames)[number];

export const appStoreNames = [...progressStoreNames, "question_packs"] as const satisfies readonly AppStoreName[];
